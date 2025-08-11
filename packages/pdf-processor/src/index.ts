/**
 * PDF Vision Processor - Point d'entrée principal
 * 
 * Cette bibliothèque propose deux modes d'utilisation :
 * 1. API Server : Créer un serveur REST pour traiter les PDFs via HTTP
 * 2. Library : Utiliser directement les fonctions d'extraction dans votre code
 */

// === EXPORTS API SERVER ===
export { 
  createVisionAPI,
  type APIServerConfig
} from './api/server';

// === EXPORTS LIBRARY ===
export { 
  extractPdf,
  extractPdfWithMetadata,
  extractInvoicePdf,
  extractTablesPdf,
  extractReceiptPdf,
  schemas,
  providers,
  type ExtractOptions,
  type ExtractResult,
  type ComprehensiveInvoice,
  type TablesOnly,
  type BasicReceipt,
  type VisionExtractionOptions,
  type PdfProcessorConfig
} from './lib';

// === EXPORTS CORE (pour usage avancé) ===
export {
  aiVisionProcessor,
  extractWithAI,
  extractInvoice,
  extractTables
} from './core/vision';

export {
  ComprehensiveInvoiceSchema,
  TablesOnlySchema,
  BasicReceiptSchema,
  SchemaFactory
} from './core/schemas';

// === EXPORT DEFAULT COMBINÉ ===
import * as API from './api/server';
import * as Library from './lib';

/**
 * Export par défaut combinant API et Library
 */
export default {
  // API Server
  createServer: API.createVisionAPI,
  
  // Library Functions
  extractPdf: Library.extractPdf,
  extractPdfWithMetadata: Library.extractPdfWithMetadata,
  extractInvoice: Library.extractInvoicePdf,
  extractTables: Library.extractTablesPdf,
  extractReceipt: Library.extractReceiptPdf,
  
  // Schemas & Types
  schemas: Library.schemas,
  providers: Library.providers
};