import { z } from 'zod';
import path from "path";
import { createModuleLogger } from "../../utils/logger";
import type { VisionExtractionOptions, PdfProcessorConfig } from '../types';
import { ImageOptimizer } from './image-optimization';
import type { ProcessedVisionImage } from './image-optimization';
import { WorkerManager } from './worker-manager';
import { SchemaSelector } from './schema-selector';
import { AIGenerator } from './ai-generator';

const logger = createModuleLogger('vision-processor');

/**
 * Options pour le processeur AI Vision avec Zod + AI SDK
 */
export interface AIVisionProcessingOptions extends VisionExtractionOptions {
  query?: string;
  tablesOnly?: boolean;
  documentType?: 'invoice' | 'receipt' | 'basic' | 'custom';
  customSchema?: z.ZodSchema;
  maxRetries?: number;
  /** Configuration personnalisée des providers */
  pdfProcessor?: PdfProcessorConfig;
}

/**
 * Résultat du traitement AI Vision avec types Zod
 */
export interface AIVisionResult<T = any> {
  data: T;
  metadata: {
    pageCount: number;
    processingTime: number;
    provider: string;
    model: string;
    schemaUsed: string;
    optimizationMetrics: {
      originalSizeMB: number;
      optimizedSizeMB: number;
      compressionRatio: number;
    };
  };
  validation: {
    success: boolean;
    errors?: z.ZodError;
  };
}

/**
 * Processeur AI Vision principal - orchestrate les différents composants
 */
export class AIVisionProcessor {
  private workerManager: WorkerManager;
  private imageOptimizer: ImageOptimizer;
  private schemaSelector: SchemaSelector;
  private aiGenerator: AIGenerator;
  
  constructor() {
    this.workerManager = new WorkerManager();
    this.imageOptimizer = new ImageOptimizer();
    this.schemaSelector = new SchemaSelector();
    this.aiGenerator = new AIGenerator();
  }

  /**
   * Traite un PDF avec AI Vision + validation Zod automatique
   */
  async process<T = any>(
    filePath: string,
    options: AIVisionProcessingOptions
  ): Promise<AIVisionResult<T>> {
    
    const startTime = Date.now();
    const provider = options.provider || 'scaleway';
    
    logger.info({ file: path.basename(filePath), provider, model: options.model }, '🤖 AI Vision démarrage');
    
    try {
      // 1. Extraction et optimisation des images
      const { optimizedImages, optimizationMetrics, pageCount } = await this.processImages(filePath, options);
      
      // 2. Sélection du schéma Zod
      const { schema, schemaName } = this.schemaSelector.selectSchema(options);
      
      // 3. Génération avec AI SDK + validation Zod automatique
      const result = await this.aiGenerator.generate(optimizedImages, schema, options);
      
      const processingTime = Date.now() - startTime;
      
      logger.info({ processingTime, schemaName }, '✅ AI Vision terminé');
      
      return {
        data: result.object as T,
        metadata: {
          pageCount,
          processingTime,
          provider,
          model: result.modelUsed,
          schemaUsed: schemaName,
          optimizationMetrics
        },
        validation: {
          success: true,
        }
      };
      
    } catch (error: any) {
      logger.error({ 
        error: error.message || error.toString(), 
        stack: error.stack,
        name: error.name,
        cause: error.cause 
      }, '❌ Erreur AI Vision');
      
      if (error instanceof z.ZodError) {
        return {
          data: null as T,
          metadata: {
            pageCount: 0,
            processingTime: Date.now() - startTime,
            provider,
            model: 'unknown',
            schemaUsed: 'unknown',
            optimizationMetrics: { originalSizeMB: 0, optimizedSizeMB: 0, compressionRatio: 1 }
          },
          validation: {
            success: false,
            errors: error
          }
        };
      }
      
      throw new Error(`AI Vision processing failed: ${error.message}`);
    }
  }

  /**
   * Traitement complet des images (extraction + optimisation)
   */
  private async processImages(
    filePath: string, 
    options: AIVisionProcessingOptions
  ): Promise<{
    optimizedImages: ProcessedVisionImage[];
    optimizationMetrics: { originalSizeMB: number; optimizedSizeMB: number; compressionRatio: number };
    pageCount: number;
  }> {
    
    if (this.workerManager.isEnabled()) {
      logger.debug('🏭 Mode Workers activé');
      
      // Extraction PDF → Images (Worker PDF)
      const extractResult = await this.workerManager.extractImages(filePath, options);
      
      // Optimisation Sharp pour Vision LLM (Worker Vision)
      const optimizationResult = await this.workerManager.optimizeImages(extractResult.imagePaths, options);
      
      return {
        optimizedImages: optimizationResult.images!,
        optimizationMetrics: {
          originalSizeMB: (optimizationResult.totalOriginalSize || 0) / (1024 * 1024),
          optimizedSizeMB: (optimizationResult.totalOptimizedSize || 0) / (1024 * 1024),
          compressionRatio: optimizationResult.averageCompressionRatio || 1
        },
        pageCount: extractResult.pageCount
      };
    } else {
      logger.debug('⚡ Mode Direct activé');
      const directResult = await this.imageOptimizer.processDirect(filePath, options);
      
      return {
        optimizedImages: directResult.optimizedImages,
        optimizationMetrics: directResult.optimizationMetrics,
        pageCount: directResult.optimizedImages.length
      };
    }
  }
}

/**
 * Instance singleton du processeur AI Vision
 */
export const aiVisionProcessor = new AIVisionProcessor();