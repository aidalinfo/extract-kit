import { z } from 'zod';
import { ComprehensiveInvoiceSchema, BasicReceiptSchema } from './invoice';
import { TablesOnlySchema } from './tables';

/**
 * Factory pour création et sélection de schémas
 */
export class SchemaFactory {
  /**
   * Crée un schéma Zod à partir d'un JSON Schema utilisateur
   * Pour compatibilité avec les requêtes JSON existantes
   */
  static createFromJSON(jsonSchema: string): z.ZodSchema {
    try {
      const parsed = JSON.parse(jsonSchema);
      return this.convertJSONSchemaToZod(parsed);
    } catch (error: any) {
      throw new Error(`Invalid JSON schema: ${error.message}`);
    }
  }

  /**
   * Convertit un JSON Schema en schéma Zod (conversion basique)
   */
  private static convertJSONSchemaToZod(jsonSchema: any): z.ZodSchema {
    if (jsonSchema.type === 'object' && jsonSchema.properties) {
      const shape: Record<string, z.ZodSchema> = {};
      
      for (const [key, prop] of Object.entries(jsonSchema.properties as Record<string, any>)) {
        shape[key] = this.convertPropertyToZod(prop);
      }
      
      return z.object(shape);
    }
    
    return z.any(); // Fallback
  }

  /**
   * Convertit une propriété JSON Schema en Zod
   */
  private static convertPropertyToZod(prop: any): z.ZodSchema {
    if (Array.isArray(prop.type)) {
      // Type union comme ['string', 'null']
      if (prop.type.includes('null')) {
        const nonNullType = prop.type.find((t: any) => t !== 'null');
        return this.getZodTypeForString(nonNullType).nullable();
      }
    }
    
    if (prop.type === 'array' && prop.items) {
      const itemSchema = this.convertPropertyToZod(prop.items);
      return z.array(itemSchema);
    }
    
    if (prop.type === 'object' && prop.properties) {
      return this.convertJSONSchemaToZod(prop);
    }
    
    return this.getZodTypeForString(prop.type);
  }

  /**
   * Obtient le type Zod pour un type string
   */
  private static getZodTypeForString(type: string): z.ZodSchema {
    switch (type) {
      case 'string': return z.string();
      case 'number': return z.number();
      case 'integer': return z.number().int();
      case 'boolean': return z.boolean();
      case 'array': return z.array(z.any());
      case 'object': return z.object({});
      default: return z.any();
    }
  }

  /**
   * Obtient le schéma préconfiguré selon le type de document
   */
  static getSchemaForDocumentType(documentType: string): z.ZodSchema {
    switch (documentType.toLowerCase()) {
      case 'invoice':
        return ComprehensiveInvoiceSchema;
      
      case 'receipt':
        return BasicReceiptSchema;
      
      case 'tables':
        return TablesOnlySchema;
        
      case 'basic':
        return ComprehensiveInvoiceSchema;

      case 'simple':
        return ComprehensiveInvoiceSchema;
      
      default:
        return ComprehensiveInvoiceSchema;
    }
  }
}