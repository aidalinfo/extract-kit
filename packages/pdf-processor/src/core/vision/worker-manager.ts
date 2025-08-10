import path from "path";
import { createModuleLogger } from "../../utils/logger";
import { workerPoolManager } from "../workers/worker-pool-manager";
import { AIVisionProcessingOptions } from './processor';
import type { 
  PdfExtractionTask, 
  PdfExtractionResult 
} from "../workers/pdf-extraction-worker";
import type { 
  VisionOptimizationTask, 
  VisionOptimizationResult 
} from "../workers/vision-optimization-worker";

const logger = createModuleLogger('worker-manager');

/**
 * Gestionnaire des workers pour traitement parallèle
 */
export class WorkerManager {
  private useWorkers: boolean;
  
  constructor() {
    this.useWorkers = process.env.EK_ENABLE_WORKERS === 'true' || process.env.EK_ENABLE_WORKERS === '1';
    
    if (this.useWorkers) {
      this.initializeWorkerPools();
    } else {
      logger.info('⚡ Mode direct activé (workers désactivés) - Set EK_ENABLE_WORKERS=true pour activer les workers');
    }
  }

  /**
   * Vérifie si les workers sont activés
   */
  isEnabled(): boolean {
    return this.useWorkers;
  }

  /**
   * Initialise les pools de workers pour PDF et Vision
   */
  private initializeWorkerPools() {
    // Pool pour extraction PDF
    workerPoolManager.getPool('pdf-extraction', {
      maxWorkers: parseInt(process.env.EK_PDF_WORKERS || '2'),
      workerScript: path.join(__dirname, '../workers/pdf-extraction-worker.ts'),
      taskTimeout: parseInt(process.env.EK_PDF_WORKER_TIMEOUT || '60000')
    });

    // Pool pour optimisation Vision
    workerPoolManager.getPool('vision-optimization', {
      maxWorkers: parseInt(process.env.EK_VISION_WORKERS || '3'),
      workerScript: path.join(__dirname, '../workers/vision-optimization-worker.ts'),
      taskTimeout: parseInt(process.env.EK_VISION_WORKER_TIMEOUT || '30000')
    });

    const totalWorkers = parseInt(process.env.EK_PDF_WORKERS || '2') + parseInt(process.env.EK_VISION_WORKERS || '3');
    logger.info({ pdfWorkers: process.env.EK_PDF_WORKERS || '2', visionWorkers: process.env.EK_VISION_WORKERS || '3', totalWorkers }, '🏭 Workers activés');
  }

  /**
   * Extrait les images du PDF via worker dédié
   */
  async extractImages(
    filePath: string, 
    options: AIVisionProcessingOptions
  ): Promise<{ imagePaths: string[]; pageCount: number }> {
    
    const tempDir = await this.createTempDir();
    const pdfPool = workerPoolManager.getPool('pdf-extraction');
    
    logger.debug({ file: path.basename(filePath) }, '📄 Worker PDF: Extraction');
    
    const task: PdfExtractionTask = {
      taskId: '',
      pdfPath: filePath,
      outputDir: tempDir,
      dpi: options.dpi || 300
    };
    
    const result = await pdfPool.executeTask<PdfExtractionResult>(task) as PdfExtractionResult;
    
    if (!result.success || !result.imagePaths) {
      throw new Error(`PDF extraction failed: ${result.error}`);
    }
    
    logger.info({ pageCount: result.pageCount, processingTime: result.processingTime }, '✅ Worker PDF: Pages extraites');
    
    return {
      imagePaths: result.imagePaths,
      pageCount: result.pageCount || result.imagePaths.length
    };
  }

  /**
   * Optimise les images via worker Sharp dédié
   */
  async optimizeImages(
    imagePaths: string[],
    options: AIVisionProcessingOptions
  ): Promise<VisionOptimizationResult> {
    
    const visionPool = workerPoolManager.getPool('vision-optimization');
    
    logger.debug({ imageCount: imagePaths.length }, '🎨 Worker Vision: Optimisation images');
    
    const task: VisionOptimizationTask = {
      taskId: '',
      imagePaths,
      options: {
        provider: options.provider,
        cropSize: options.cropSize,
        enhanceContrast: options.enhanceContrast !== false,
        preserveColor: true,
        targetQuality: options.targetQuality || 95
      }
    };
    
    const result = await visionPool.executeTask<VisionOptimizationResult>(task) as VisionOptimizationResult;
    
    if (!result.success || !result.images) {
      throw new Error(`Vision optimization failed: ${result.error}`);
    }
    
    logger.info({ 
      imageCount: result.images.length, 
      processingTime: result.processingTime,
      originalSizeMB: (result.totalOriginalSize! / 1024 / 1024).toFixed(1),
      optimizedSizeMB: (result.totalOptimizedSize! / 1024 / 1024).toFixed(1)
    }, '✅ Worker Vision: Images optimisées');
    
    return result;
  }

  private async createTempDir(): Promise<string> {
    const fs = await import("fs/promises");
    const tempDir = path.join(
      process.env.EK_TMPDIR || '/tmp',
      `ai-vision-${Date.now()}`
    );
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }
}