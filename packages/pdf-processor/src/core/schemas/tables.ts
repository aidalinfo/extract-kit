import { z } from 'zod';

/**
 * Schémas spécifiques à l'extraction de tableaux
 */

export const TableRowSchema = z.array(
  z.union([z.string(), z.number(), z.null()])
);

export const DetectedTableSchema = z.object({
  table_name: z.string().nullable().optional(),
  table_type: z.string().nullable().optional(),
  headers: z.array(z.string()).optional(),
  rows: z.array(TableRowSchema).optional(),
  summary: z.string().nullable().optional(),
});

export const TablesOnlySchema = z.object({
  detected_tables: z.array(DetectedTableSchema).optional(),
  extraction_metadata: z.object({
    tables_found: z.number().int().nullable().optional(),
    confidence_score: z.number().min(0).max(1).nullable().optional(),
  }).optional(),
});

// Types TypeScript générés
export type TableRow = z.infer<typeof TableRowSchema>;
export type DetectedTable = z.infer<typeof DetectedTableSchema>;
export type TablesOnly = z.infer<typeof TablesOnlySchema>;