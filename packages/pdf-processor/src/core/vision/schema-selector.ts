import { z } from 'zod';
import { createModuleLogger } from "../../utils/logger";
import { 
  ComprehensiveInvoiceSchema, 
  TablesOnlySchema, 
  SchemaFactory 
} from "../schemas";
import type { AIVisionProcessingOptions } from './processor';

const logger = createModuleLogger('schema-selector');

/**
 * Sélecteur de schémas Zod pour l'extraction de données
 */
export class SchemaSelector {
  
  /**
   * Sélectionne le schéma Zod approprié selon les options
   */
  selectSchema(options: AIVisionProcessingOptions): { 
    schema: z.ZodSchema; 
    schemaName: string; 
  } {
    
    // 1. Schéma personnalisé fourni
    if (options.customSchema) {
      logger.debug('Utilisation schéma personnalisé');
      return { schema: options.customSchema, schemaName: 'custom' };
    }
    
    // 2. Mode tableaux uniquement
    if (options.tablesOnly) {
      logger.debug('Mode tableaux uniquement activé');
      return { schema: TablesOnlySchema, schemaName: 'tables-only' };
    }
    
    // 3. Type de document spécifique
    if (options.documentType) {
      logger.debug({ documentType: options.documentType }, 'Sélection par type de document');
      const schema = SchemaFactory.getSchemaForDocumentType(options.documentType);
      return { schema, schemaName: options.documentType };
    }
    
    // 4. Query JSON personnalisée (conversion vers Zod)
    if (options.query && options.query !== '*' && this.isValidJSON(options.query)) {
      try {
        logger.debug('Conversion JSON Schema → Zod');
        const schema = SchemaFactory.createFromJSON(options.query);
        return { schema, schemaName: 'custom-json' };
      } catch (error) {
        logger.warn('⚠️ Échec conversion JSON → Zod, utilisation schéma complet');
      }
    }
    
    // 5. Mode découverte par défaut (comme "*" de Sparrow)
    logger.debug('Utilisation schéma complet par défaut');
    return { schema: ComprehensiveInvoiceSchema, schemaName: 'comprehensive' };
  }

  private isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
}