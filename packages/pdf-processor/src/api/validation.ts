import { z } from 'zod';

/**
 * Interface pour les requêtes API Vision
 */
export interface VisionExtractRequest {
  provider?: 'scaleway' | 'ollama' | 'mistral' | 'custom';
  model?: string;
  query?: string;
  cropSize?: number;
  tablesOnly?: boolean;
  documentType?: 'invoice' | 'receipt' | 'basic' | 'custom';
  enhanceContrast?: boolean;
  targetQuality?: number;
  debug?: boolean;
}

/**
 * Schéma de validation Zod pour les requêtes d'extraction
 */
const ExtractRequestSchema = z.object({
  provider: z.enum(['scaleway', 'ollama', 'mistral', 'custom']).optional().default('scaleway'),
  model: z.string().optional(),
  query: z.string().optional().default('*'),
  cropSize: z.number().min(10).max(100).optional(),
  tablesOnly: z.boolean().optional().default(false),
  documentType: z.enum(['invoice', 'receipt', 'basic', 'custom']).optional(),
  enhanceContrast: z.boolean().optional().default(true),
  targetQuality: z.number().min(70).max(100).optional().default(95),
  debug: z.boolean().optional().default(false),
});

/**
 * Valide les paramètres d'une requête d'extraction
 */
export function validateExtractRequest(body: any): { 
  valid: boolean; 
  error?: string; 
  data?: VisionExtractRequest 
} {
  try {
    const validated = ExtractRequestSchema.parse(body);
    return { valid: true, data: validated };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Valide qu'un fichier est bien un PDF
 */
export function validatePdfFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'Le fichier doit être un PDF' };
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB limit
    return { valid: false, error: 'Le fichier PDF ne doit pas dépasser 50MB' };
  }
  
  return { valid: true };
}