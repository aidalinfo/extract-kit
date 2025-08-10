import { z } from 'zod';
import { aiVisionProcessor, type AIVisionProcessingOptions, type AIVisionResult } from './processor';
import { ComprehensiveInvoiceSchema, TablesOnlySchema, type ComprehensiveInvoice, type TablesOnly } from '../schemas';

// Re-export des types et interfaces
export type { AIVisionProcessingOptions, AIVisionResult } from './processor';
export type { ProcessedVisionImage } from './image-optimization';

// Re-export de l'instance principale
export { aiVisionProcessor };

// === FONCTIONS UTILITAIRES EXPORT ===

/**
 * Fonction rapide pour extraction avec types Zod
 */
export async function extractWithAI<T extends z.ZodSchema>(
  filePath: string,
  schema: T,
  options: Partial<AIVisionProcessingOptions> = {}
): Promise<z.infer<T>> {
  
  const result = await aiVisionProcessor.process(filePath, {
    provider: options.provider || 'scaleway',
    model: options.model,
    customSchema: schema,
    enhanceContrast: options.enhanceContrast !== false,
    targetQuality: options.targetQuality || 95,
    ...options
  });
  
  if (!result.validation.success) {
    throw new Error(`Validation failed: ${result.validation.errors?.message}`);
  }
  
  return result.data;
}

/**
 * Extraction de facture avec schéma complet et types TypeScript
 */
export async function extractInvoice(
  filePath: string,
  options: Partial<AIVisionProcessingOptions> = {}
): Promise<ComprehensiveInvoice> {
  return extractWithAI(filePath, ComprehensiveInvoiceSchema, {
    documentType: 'invoice',
    ...options
  });
}

/**
 * Extraction de tableaux uniquement
 */
export async function extractTables(
  filePath: string,
  options: Partial<AIVisionProcessingOptions> = {}
): Promise<TablesOnly> {
  return extractWithAI(filePath, TablesOnlySchema, {
    tablesOnly: true,
    ...options
  });
}