/**
 * PDF Vision Library - Interface publique pour utilisation directe
 */

import { z } from 'zod';
import { 
  aiVisionProcessor, 
  extractWithAI, 
  extractInvoice, 
  extractTables 
} from "../core/vision";
import { 
  ComprehensiveInvoiceSchema, 
  TablesOnlySchema, 
  BasicReceiptSchema,
  type ComprehensiveInvoice,
  type TablesOnly,
  type BasicReceipt
} from "../core/schemas";
import type { VisionExtractionOptions, PdfProcessorConfig, ProviderConfig } from "../core/types";
import { DEFAULT_MODELS } from "../core/types";

/**
 * Options d'extraction pour l'API publique
 */
export interface ExtractOptions extends Omit<VisionExtractionOptions, 'provider'> {
  /** Provider d'IA à utiliser */
  provider?: 'scaleway' | 'ollama' | 'mistral';
  /** Modèle spécifique (optionnel) */
  model?: string;
  /** Schema JSON personnalisé ou type de document */
  query?: string;
  /** Taille de recadrage en pourcentage (10-90) */
  cropSize?: number;
  /** Extraction focalisée sur les tableaux uniquement */
  tablesOnly?: boolean;
  /** Type de document pour utiliser un schéma prédéfini */
  documentType?: 'invoice' | 'receipt' | 'basic' | 'custom';
  /** Amélioration du contraste (défaut: true) */
  enhanceContrast?: boolean;
  /** Qualité de compression JPEG (70-100, défaut: 95) */
  targetQuality?: number;
  /** DPI pour la conversion PDF vers images (défaut: 300) */
  dpi?: number;
  /** Nombre de tentatives en cas d'échec (défaut: 2) */
  maxRetries?: number;
  /** Schéma Zod personnalisé pour validation stricte */
  customSchema?: z.ZodSchema;
  /** Configuration personnalisée des providers */
  pdfProcessor?: PdfProcessorConfig;
}

/**
 * Résultat d'extraction avec métadonnées
 */
export interface ExtractResult<T = any> {
  /** Données extraites et validées */
  data: T;
  /** Métadonnées du traitement */
  metadata: {
    /** Nombre de pages traitées */
    pageCount: number;
    /** Temps de traitement total en ms */
    processingTime: number;
    /** Provider utilisé */
    provider: string;
    /** Modèle utilisé */
    model: string;
    /** Nom du schéma utilisé */
    schemaUsed: string;
    /** Métriques d'optimisation des images */
    optimizationMetrics: {
      originalSizeMB: number;
      optimizedSizeMB: number;
      compressionRatio: number;
    };
  };
  /** Résultat de la validation */
  validation: {
    success: boolean;
    errors?: z.ZodError;
  };
}

/**
 * Extrait des données d'un PDF avec schéma personnalisé
 */
export async function extractPdf<T extends z.ZodSchema>(
  filePath: string,
  schema: T,
  options: ExtractOptions = {}
): Promise<z.infer<T>> {
  return await extractWithAI(filePath, schema, {
    provider: options.provider || 'scaleway',
    model: options.model,
    cropSize: options.cropSize,
    tablesOnly: options.tablesOnly,
    documentType: options.documentType,
    enhanceContrast: options.enhanceContrast,
    targetQuality: options.targetQuality,
    dpi: options.dpi || 300,
    maxRetries: options.maxRetries,
    customSchema: options.customSchema,
    query: options.query,
    pdfProcessor: options.pdfProcessor,
    ...options
  });
}

/**
 * Extrait des données d'un PDF avec résultat détaillé
 */
export async function extractPdfWithMetadata<T extends z.ZodSchema>(
  filePath: string,
  schema: T,
  options: ExtractOptions = {}
): Promise<ExtractResult<z.infer<T>>> {
  return await aiVisionProcessor.process<z.infer<T>>(filePath, {
    provider: options.provider || 'scaleway',
    model: options.model,
    cropSize: options.cropSize,
    tablesOnly: options.tablesOnly,
    documentType: options.documentType,
    enhanceContrast: options.enhanceContrast,
    targetQuality: options.targetQuality,
    dpi: options.dpi || 300,
    maxRetries: options.maxRetries,
    customSchema: schema,
    query: options.query,
    pdfProcessor: options.pdfProcessor,
    ...options
  });
}

/**
 * Extrait une facture avec le schéma complet
 */
export async function extractInvoicePdf(
  filePath: string,
  options: ExtractOptions = {}
): Promise<ComprehensiveInvoice> {
  return await extractInvoice(filePath, {
    provider: options.provider || 'scaleway',
    model: options.model,
    cropSize: options.cropSize,
    enhanceContrast: options.enhanceContrast,
    targetQuality: options.targetQuality,
    dpi: options.dpi || 300,
    pdfProcessor: options.pdfProcessor,
    ...options
  });
}

/**
 * Extrait les tableaux d'un PDF
 */
export async function extractTablesPdf(
  filePath: string,
  options: ExtractOptions = {}
): Promise<TablesOnly> {
  return await extractTables(filePath, {
    provider: options.provider || 'scaleway',
    model: options.model,
    enhanceContrast: options.enhanceContrast,
    targetQuality: options.targetQuality,
    dpi: options.dpi || 300,
    pdfProcessor: options.pdfProcessor,
    ...options
  });
}

/**
 * Extrait un reçu avec le schéma simplifié
 */
export async function extractReceiptPdf(
  filePath: string,
  options: ExtractOptions = {}
): Promise<BasicReceipt> {
  return await extractPdf(filePath, BasicReceiptSchema, {
    documentType: 'receipt',
    pdfProcessor: options.pdfProcessor,
    ...options
  });
}

/**
 * Schémas Zod prédéfinis pour validation
 */
export const schemas = {
  invoice: ComprehensiveInvoiceSchema,
  tables: TablesOnlySchema,
  receipt: BasicReceiptSchema
};

/**
 * Types TypeScript pour les données extraites
 */
export type {
  ComprehensiveInvoice,
  TablesOnly,
  BasicReceipt,
  VisionExtractionOptions,
  PdfProcessorConfig,
  ProviderConfig
};

/**
 * Configuration des providers disponibles
 */
export const providers = {
  scaleway: {
    name: 'Scaleway AI',
    models: ['mistral-small-3.1-24b-instruct-2503'],
    defaultModel: DEFAULT_MODELS.scaleway
  },
  ollama: {
    name: 'Ollama Local',
    models: ['llava:latest', 'llava:13b', 'llava:34b'],
    defaultModel: DEFAULT_MODELS.ollama
  },
  //https://docs.mistral.ai/capabilities/vision/
  mistral: {
    name: 'Mistral AI',
    models: ['pixtral-12b-latest', 'pixtral-large-latest','mistral-medium-latest','mistral-small-latest'],
    defaultModel: DEFAULT_MODELS.mistral
  },
  custom: {
    name: 'Custom OpenAI-Compatible API',
    models: [],
    defaultModel: DEFAULT_MODELS.custom
  }
} as const;

// Export par défaut pour usage simple
export default {
  extractPdf,
  extractPdfWithMetadata,
  extractInvoicePdf,
  extractTablesPdf,
  extractReceiptPdf,
  schemas,
  providers
};