import fs from "fs/promises";
import path from "path";
import { createModuleLogger } from "../../utils/logger";
import type { AIVisionProcessingOptions } from './processor';

const logger = createModuleLogger('image-optimization');

/**
 * Interface pour les images optimisées
 */
export interface ProcessedVisionImage {
  base64: string;
  optimizedSizeBytes: number;
  originalSizeBytes: number;
  compressionRatio: number;
  optimizations: string[];
}

/**
 * Gestionnaire d'optimisation d'images pour Vision LLM
 */
export class ImageOptimizer {
  
  /**
   * Traitement direct des images (mode fallback sans workers)
   */
  async processDirect(
    filePath: string, 
    options: AIVisionProcessingOptions
  ): Promise<{
    optimizedImages: ProcessedVisionImage[];
    optimizationMetrics: { originalSizeMB: number; optimizedSizeMB: number; compressionRatio: number };
  }> {
    
    const tempDir = await this.createTempDir();
    
    try {
      // Extraction des images du PDF (mode synchrone)
      const { extractImagesFromPDF } = await import("../file-processor");
      
      const rawImages = await extractImagesFromPDF(filePath, tempDir, {
        provider: options.provider,
        dpi: options.dpi || 300,
        extractImages: true,
      });
      
      if (rawImages.length === 0) {
        throw new Error("Aucune image extraite du PDF");
      }
      
      logger.debug({ imageCount: rawImages.length }, '🖼️ Images extraites (mode direct)');
      
      // Optimisation Sharp directe (sans worker)
      const optimizedImages = await this.optimizeDirectly(rawImages, options);
      
      // Calcul des métriques
      const totalOriginalSize = optimizedImages.reduce((sum, img) => sum + img.originalSizeBytes, 0);
      const totalOptimizedSize = optimizedImages.reduce((sum, img) => sum + img.optimizedSizeBytes, 0);
      const averageCompressionRatio = optimizedImages.reduce((sum, img) => sum + img.compressionRatio, 0) / optimizedImages.length;
      
      return {
        optimizedImages,
        optimizationMetrics: {
          originalSizeMB: totalOriginalSize / (1024 * 1024),
          optimizedSizeMB: totalOptimizedSize / (1024 * 1024),
          compressionRatio: averageCompressionRatio
        }
      };
      
    } finally {
      await this.cleanupTempDir(tempDir);
    }
  }

  /**
   * Optimisation Sharp directe (sans worker)
   */
  async optimizeDirectly(
    imagePaths: string[],
    options: AIVisionProcessingOptions
  ): Promise<ProcessedVisionImage[]> {
    
    const sharp = (await import("sharp")).default;
    const fs = await import("fs/promises");
    const { existsSync } = await import("fs");
    
    const results: ProcessedVisionImage[] = [];
    
    for (const imagePath of imagePaths) {
      if (!existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
      }

      const originalStats = await fs.stat(imagePath);
      const originalSizeBytes = originalStats.size;
      
      let pipeline = sharp(imagePath);
      const metadata = await pipeline.metadata();
      const optimizations: string[] = [];

      // Recadrage intelligent (optionnel)
      if (options.cropSize && options.cropSize > 0 && options.cropSize < 100) {
        const cropPercent = options.cropSize / 100;
        const cropWidth = Math.floor((metadata.width || 0) * cropPercent);
        const cropHeight = Math.floor((metadata.height || 0) * cropPercent);
        
        if (cropWidth > 100 && cropHeight > 100) {
          const left = Math.floor(((metadata.width || 0) - cropWidth) / 2);
          const top = Math.floor(((metadata.height || 0) - cropHeight) / 2);
          
          pipeline = pipeline.extract({ left, top, width: cropWidth, height: cropHeight });
          optimizations.push(`crop-${options.cropSize}%`);
        }
      }

      // Redimensionnement pour Vision LLM (selon le nombre max de pixels)
      const { maxPixels, maxDimension } = this.getMaxResolutionForProvider(options.provider);
      const currentPixels = (metadata.width || 0) * (metadata.height || 0);
      
      if (currentPixels > maxPixels || (metadata.width && metadata.width > maxDimension) || (metadata.height && metadata.height > maxDimension)) {
        // Calculer les nouvelles dimensions en gardant le ratio d'aspect
        const aspectRatio = (metadata.width || 1) / (metadata.height || 1);
        
        // Méthode 1: Limiter par pixels totaux (optimal pour tokens)
        let newWidth = Math.sqrt(maxPixels * aspectRatio);
        let newHeight = Math.sqrt(maxPixels / aspectRatio);
        
        // Méthode 2: Vérifier les limites de dimension max
        if (newWidth > maxDimension) {
          newWidth = maxDimension;
          newHeight = newWidth / aspectRatio;
        }
        if (newHeight > maxDimension) {
          newHeight = maxDimension;
          newWidth = newHeight * aspectRatio;
        }
        
        newWidth = Math.round(newWidth);
        newHeight = Math.round(newHeight);
        
        pipeline = pipeline.resize(newWidth, newHeight, {
          kernel: sharp.kernel.lanczos3,
          withoutEnlargement: true
        });
        optimizations.push(`resize-${newWidth}x${newHeight}-pixels`);
      }

      // Amélioration contraste
      if (options.enhanceContrast !== false) {
        pipeline = pipeline
          .modulate({ brightness: 1.05, saturation: 1.1 })
          .sharpen({ sigma: 0.8, m1: 1.0, m2: 2.0, x1: 2, y2: 10, y3: 20 });
        optimizations.push('contrast-enhanced');
      }

      // Compression JPEG haute qualité
      const targetQuality = options.targetQuality || 95;
      pipeline = pipeline.jpeg({
        quality: targetQuality,
        progressive: true,
        mozjpeg: true
      });
      optimizations.push(`jpeg-q${targetQuality}`);

      const optimizedBuffer = await pipeline.toBuffer();
      const base64 = optimizedBuffer.toString('base64');
      
      results.push({
        base64,
        optimizedSizeBytes: optimizedBuffer.length,
        originalSizeBytes,
        compressionRatio: optimizedBuffer.length / originalSizeBytes,
        optimizations
      });
    }
    
    logger.debug({ imageCount: results.length }, '✅ Images optimisées (mode direct)');
    return results;
  }

  private async createTempDir(): Promise<string> {
    const tempDir = path.join(
      process.env.EK_TMPDIR || '/tmp',
      `ai-vision-${Date.now()}`
    );
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  private async cleanupTempDir(tempDir: string): Promise<void> {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn({ error, tempDir }, '⚠️ Erreur nettoyage répertoire temporaire');
    }
  }

  /**
   * Détermine les limites de résolution selon le provider
   */
  private getMaxResolutionForProvider(provider: string): { maxPixels: number, maxDimension: number } {
    if (provider.toLowerCase().includes('pixtral')) {
      return { 
        maxPixels: 1024 * 1024, // 1,048,576 pixels max
        maxDimension: 1024      // 1024px max par dimension
      };
    } else if (provider.toLowerCase().includes('mistral')) {
      return { 
        maxPixels: 1540 * 1540, // 2,371,600 pixels max  
        maxDimension: 1540      // 1540px max par dimension
      };
    }
    
    // Par défaut, utiliser 2048 pour les autres modèles
    return { 
      maxPixels: 2048 * 2048, // 4,194,304 pixels max
      maxDimension: 2048      // 2048px max par dimension
    };
  }
}