import fs from "fs/promises";
import path from "path";
import { createModuleLogger } from "../utils/logger";

const logger = createModuleLogger('api-utils');

/**
 * Crée un fichier temporaire pour l'upload
 */
export async function createTempFile(
  content: Buffer | ArrayBuffer,
  extension = "pdf"
): Promise<{ filePath: string; cleanup: () => Promise<void> }> {
  const tempFileName = path.join("/tmp", `vision_${Date.now()}.${extension}`);
  
  await Bun.write(tempFileName, content);
  logger.debug({ filePath: tempFileName }, '📁 Fichier temporaire créé');
  
  return {
    filePath: tempFileName,
    cleanup: async () => {
      try {
        await fs.unlink(tempFileName);
        logger.debug({ filePath: tempFileName }, '🧹 Nettoyage fichier temporaire');
      } catch (error) {
        logger.warn({ error, filePath: tempFileName }, '⚠️ Erreur nettoyage fichier temporaire');
      }
    },
  };
}

/**
 * Crée les headers CORS standard
 */
export function createCorsHeaders(origins: string[] = ["*"]): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origins.join(", "),
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}