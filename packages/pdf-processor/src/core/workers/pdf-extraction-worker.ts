/**
 * Worker Bun pour extraction PDF → Images
 * Décharge le thread principal des opérations ghostscript coûteuses
 */

import * as gs from "ghostscript-node";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { createModuleLogger } from "../../utils/logger";

const logger = createModuleLogger('pdf-extraction-worker');

export interface PdfExtractionTask {
  taskId: string;
  pdfPath: string;
  outputDir: string;
  dpi: number;
}

export interface PdfExtractionResult {
  taskId: string;
  success: boolean;
  imagePaths?: string[];
  pageCount?: number;
  error?: string;
  processingTime: number;
}

/**
 * Traite une tâche d'extraction PDF dans le worker
 */
async function processPdfExtractionTask(task: PdfExtractionTask): Promise<PdfExtractionResult> {
  const startTime = Date.now();
  
  try {
    logger.info({ file: path.basename(task.pdfPath), dpi: task.dpi }, '🔧 Worker PDF: Extraction démarrée');
    
    // Vérification du fichier PDF
    if (!existsSync(task.pdfPath)) {
      throw new Error(`PDF file does not exist: ${task.pdfPath}`);
    }

    // Lecture du PDF en buffer
    const pdfBuffer = await fs.readFile(task.pdfPath);

    // Validation PDF
    const isValid = await gs.isValidPDF(pdfBuffer);
    if (!isValid) {
      throw new Error("The PDF file is not valid");
    }

    // Conversion PDF → Images avec Ghostscript
    const imageBuffers = await gs.renderPDFPagesToPNG(
      pdfBuffer,
      undefined, // toutes les pages
      undefined, 
      task.dpi
    );

    logger.debug({ pageCount: imageBuffers.length }, '📄 Worker PDF: Pages extraites');
    
    // Sauvegarde des images sur disque
    const imagePaths: string[] = new Array(imageBuffers.length);
    
    await Promise.all(
      imageBuffers.map(async (buffer, i) => {
        const imagePath = path.join(task.outputDir, `page-${i + 1}.png`);
        await fs.writeFile(imagePath, buffer);
        imagePaths[i] = imagePath;
      })
    );

    const processingTime = Date.now() - startTime;
    logger.info({ processingTime, pageCount: imagePaths.length }, '✅ Worker PDF: Terminé');

    return {
      taskId: task.taskId,
      success: true,
      imagePaths,
      pageCount: imagePaths.length,
      processingTime
    };

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    logger.error({ error }, '❌ Worker PDF Error');
    
    return {
      taskId: task.taskId,
      success: false,
      error: error.message,
      processingTime
    };
  }
}

/**
 * Gestionnaire des messages du worker PDF
 */
declare const self: Worker;

self.onmessage = async (event: MessageEvent<PdfExtractionTask>) => {
  const result = await processPdfExtractionTask(event.data);
  self.postMessage(result);
};

// Type pour les exports (pour TypeScript)
export type PdfExtractionWorker = Worker;