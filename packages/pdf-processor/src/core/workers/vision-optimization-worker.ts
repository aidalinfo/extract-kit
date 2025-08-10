/**
 * Worker Bun pour optimisation Sharp Vision LLM
 * Traitement parallèle des optimisations d'images pour Vision LLM
 */

import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { createModuleLogger } from "../../utils/logger";

const logger = createModuleLogger('vision-optimization-worker');

export interface VisionOptimizationTask {
  taskId: string;
  imagePaths: string[];
  options: {
    provider: 'scaleway' | 'ollama';
    cropSize?: number;
    enhanceContrast?: boolean;
    preserveColor?: boolean;
    targetQuality?: number;
  };
}

export interface OptimizedImageResult {
  originalPath: string;
  base64: string;
  optimizedSizeBytes: number;
  originalSizeBytes: number;
  compressionRatio: number;
  optimizations: string[];
}

export interface VisionOptimizationResult {
  taskId: string;
  success: boolean;
  images?: OptimizedImageResult[];
  totalOriginalSize?: number;
  totalOptimizedSize?: number;
  averageCompressionRatio?: number;
  error?: string;
  processingTime: number;
}

/**
 * Optimise une image individuelle pour Vision LLM avec Sharp
 */
async function optimizeImageForVisionLLM(
  imagePath: string, 
  options: VisionOptimizationTask['options']
): Promise<OptimizedImageResult> {
  
  if (!existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  const originalStats = await fs.stat(imagePath);
  const originalSizeBytes = originalStats.size;
  
  let pipeline = sharp(imagePath);
  const metadata = await pipeline.metadata();
  const optimizations: string[] = [];

  // 1. RECADRAGE INTELLIGENT SPARROW (optionnel)
  if (options.cropSize && options.cropSize > 0 && options.cropSize < 100) {
    const cropPercent = options.cropSize / 100;
    const cropWidth = Math.floor((metadata.width || 0) * cropPercent);
    const cropHeight = Math.floor((metadata.height || 0) * cropPercent);
    
    if (cropWidth > 100 && cropHeight > 100) {
      const left = Math.floor(((metadata.width || 0) - cropWidth) / 2);
      const top = Math.floor(((metadata.height || 0) - cropHeight) / 2);
      
      pipeline = pipeline.extract({
        left,
        top, 
        width: cropWidth,
        height: cropHeight
      });
      optimizations.push(`crop-${options.cropSize}%`);
    }
  }

  // 2. REDIMENSIONNEMENT POUR VISION LLM (max 2048px pour performance)
  if (metadata.width && metadata.width > 2048) {
    const scaleFactor = 2048 / metadata.width;
    const newHeight = Math.round((metadata.height || 0) * scaleFactor);
    
    pipeline = pipeline.resize(2048, newHeight, {
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: true
    });
    optimizations.push(`resize-2048x${newHeight}`);
  }

  // 3. PRÉSERVATION COULEUR POUR VISION LLM (pas de grayscale!)
  if (options.preserveColor !== false) {
    // Vision LLM bénéficient des couleurs - pas de conversion grayscale
    optimizations.push('color-preserved');
  }

  // 4. AMÉLIORATION CONTRASTE (subtile pour Vision LLM)
  if (options.enhanceContrast !== false) {
    pipeline = pipeline
      .modulate({
        brightness: 1.05,  // Léger boost luminosité
        saturation: 1.1,   // Léger boost saturation
      })
      .sharpen({ sigma: 0.8, m1: 1.0, m2: 2.0, x1: 2, y2: 10, y3: 20 });
    optimizations.push('contrast-enhanced');
  }

  // 5. COMPRESSION JPEG HAUTE QUALITÉ pour Vision LLM
  const targetQuality = options.targetQuality || 95;
  pipeline = pipeline.jpeg({
    quality: targetQuality,
    progressive: true,
    mozjpeg: true  // Bun supporte mozjpeg pour meilleure compression
  });
  optimizations.push(`jpeg-q${targetQuality}`);

  // Génération de l'image optimisée
  const optimizedBuffer = await pipeline.toBuffer();
  const base64 = optimizedBuffer.toString('base64');
  
  const compressionRatio = optimizedBuffer.length / originalSizeBytes;
  
  return {
    originalPath: imagePath,
    base64,
    optimizedSizeBytes: optimizedBuffer.length,
    originalSizeBytes,
    compressionRatio,
    optimizations
  };
}

/**
 * Traite une tâche d'optimisation Vision LLM dans le worker
 */
async function processVisionOptimizationTask(task: VisionOptimizationTask): Promise<VisionOptimizationResult> {
  const startTime = Date.now();
  
  try {
    logger.info({ imageCount: task.imagePaths.length, provider: task.options.provider }, '🔧 Worker Vision: Optimisation démarrée');
    
    // Traitement parallèle des images (batching pour éviter surcharge mémoire)
    const batchSize = Math.min(4, task.imagePaths.length); // Max 4 images en parallèle
    const results: OptimizedImageResult[] = [];
    
    for (let i = 0; i < task.imagePaths.length; i += batchSize) {
      const batch = task.imagePaths.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(imagePath => optimizeImageForVisionLLM(imagePath, task.options))
      );
      results.push(...batchResults);
    }

    // Calcul des métriques globales
    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSizeBytes, 0);
    const totalOptimizedSize = results.reduce((sum, r) => sum + r.optimizedSizeBytes, 0);
    const averageCompressionRatio = results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length;

    const processingTime = Date.now() - startTime;
    logger.info({
      imageCount: results.length,
      processingTime,
      originalSizeMB: (totalOriginalSize / 1024 / 1024).toFixed(1),
      optimizedSizeMB: (totalOptimizedSize / 1024 / 1024).toFixed(1)
    }, '✅ Worker Vision: Images optimisées');

    return {
      taskId: task.taskId,
      success: true,
      images: results,
      totalOriginalSize,
      totalOptimizedSize,
      averageCompressionRatio,
      processingTime
    };

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    logger.error({ error }, '❌ Worker Vision Error');
    
    return {
      taskId: task.taskId,
      success: false,
      error: error.message,
      processingTime
    };
  }
}

/**
 * Gestionnaire des messages du worker Vision
 */
declare const self: Worker;

self.onmessage = async (event: MessageEvent<VisionOptimizationTask>) => {
  const result = await processVisionOptimizationTask(event.data);
  self.postMessage(result);
};

// Type pour les exports (pour TypeScript)
export type VisionOptimizationWorker = Worker;