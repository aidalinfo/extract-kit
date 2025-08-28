import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import os from "os";
import { existsSync } from "fs";
import * as gs from "ghostscript-node";
import type { InternalProcessingOptions } from "./types";
import { createModuleLogger } from "../utils/logger";

const logger = createModuleLogger('file-processor');

// Maximum batch size for processing large documents (pages)
const MAX_BATCH_SIZE = 20;

// Cache for temporary directories
const tempDirs = new Set<string>();

// Register cleanup handler
process.on("beforeExit", async () => {
  await cleanupAllTempDirs();
});

/**
 * Extract images from PDF for Vision LLM processing
 * 
 * @param filePath - Path to the PDF file
 * @param outputDir - Directory where to save extracted images
 * @param options - Processing options
 * @returns Array of image file paths
 */
export async function extractImagesFromPDF(
  pdfPath: string,
  outputDir: string,
  options: InternalProcessingOptions
): Promise<string[]> {
  try {
    // Check if the PDF exists
    if (!existsSync(pdfPath)) {
      throw new Error(`PDF file does not exist: ${pdfPath}`);
    }

    // Read the PDF into a buffer
    const pdfBuffer = await fs.readFile(pdfPath);

    // Verify if the PDF is valid
    const isValid = await gs.isValidPDF(pdfBuffer);
    if (!isValid) {
      throw new Error("The PDF file is not valid");
    }

    // Convert PDF pages to images with specified DPI
    const imageBuffers = await gs.renderPDFPagesToPNG(
      pdfBuffer,
      undefined, // firstPage - undefined = toutes les pages
      undefined, // lastPage - undefined = toutes les pages
      options.dpi || 300
    );

    // Save image buffers to disk
    logger.info({ pageCount: imageBuffers.length }, '📄 PDF contient pages');
    const saveStart = Date.now();
    logger.debug({ imageCount: imageBuffers.length }, '💾 Sauvegarde des images sur disque...');
    
    const imagePaths: string[] = new Array(imageBuffers.length);
    
    await Promise.all(
      imageBuffers.map(async (buffer, i) => {
        const imagePath = path.join(outputDir, `page-${i + 1}.png`);
        await fs.writeFile(imagePath, buffer);
        imagePaths[i] = imagePath; // Assign in the correct order
      })
    );
    const saveTime = Date.now() - saveStart;
    logger.debug({ saveTime }, 'Sauvegarde terminée');

    // Vision LLM - retourne les images raw (optimisation Sharp faite plus tard)
    logger.info({ imageCount: imagePaths.length }, '🖼️ Images extraites pour Vision LLM');
    return imagePaths;
  } catch (error: any) {
    logger.error({ error }, "❌ Erreur lors de l'extraction des images");
    throw new Error(`❌ Échec de l'extraction d'images: ${error.message}`);
  }
}

/**
 * Create a temporary directory for processing
 */
export async function createTempDir(): Promise<string> {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "pdf-processor-")
  );
  tempDirs.add(tempDir);
  return tempDir;
}

/**
 * Clean up a specific temporary directory
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    if (existsSync(tempDir)) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDirs.delete(tempDir);
    }
  } catch (error) {
    logger.warn({ error, tempDir }, '⚠️ Could not clean up temp directory');
  }
}

/**
 * Clean up all temporary directories
 */
export async function cleanupAllTempDirs(): Promise<void> {
  const cleanupPromises = Array.from(tempDirs).map(cleanupTempDir);
  await Promise.allSettled(cleanupPromises);
}

/**
 * Optimize image for OCR processing (legacy - utilisé par l'ancienne API)
 */
async function optimizeImageForOCR(imagePath: string): Promise<string> {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    let pipeline = image;

    // Convert to grayscale for better OCR performance
    pipeline = pipeline.grayscale();

    // Resize if the image is too large (for OCR performance)
    if (metadata.width && metadata.width > 2000) {
      const scaleFactor = 2000 / metadata.width;
      const newHeight = Math.round((metadata.height || 0) * scaleFactor);
      pipeline = pipeline.resize(2000, newHeight);
      logger.debug({
        originalWidth: metadata.width,
        originalHeight: metadata.height,
        newWidth: 2000,
        newHeight
      }, '🔍 Redimensionnement pour OCR');
    }

    // Enhance contrast and sharpness for OCR
    pipeline = pipeline
      .normalize()
      .sharpen({ sigma: 1, m1: 1, m2: 2, x1: 2, y2: 10, y3: 20 })
      .png({ compressionLevel: 6 });

    // Generate optimized filename
    const parsedPath = path.parse(imagePath);
    const optimizedPath = path.join(
      parsedPath.dir,
      `${parsedPath.name}_ocr_optimized${parsedPath.ext}`
    );

    // Save the optimized image
    await pipeline.toFile(optimizedPath);
    return optimizedPath;
  } catch (error: any) {
    logger.warn({ error, imagePath }, "⚠️ Impossible d'optimiser l'image");
    return imagePath; // Return original path if optimization fails
  }
}

/**
 * Split an array into chunks of specified size
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}