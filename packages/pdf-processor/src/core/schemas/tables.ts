import { z } from 'zod';

/**
 * Schémas spécifiques à l'extraction de tableaux
 */

export const TableRowSchema = z.array(
  z.union([z.string(), z.number(), z.null()])
);

export const DetectedTableSchema = z.object({
  table_name: z.string().nullable(),
  table_type: z.string().nullable(),
  headers: z.array(z.string()),
  rows: z.array(TableRowSchema),
  summary: z.string().nullable(),
});

export const TablesOnlySchema = z.object({
  detected_tables: z.array(DetectedTableSchema),
  extraction_metadata: z.object({
    tables_found: z.number().int().nullable(),
    confidence_score: z.number().min(0).max(1).nullable(),
  }).optional(),
});

// Types TypeScript générés
export type TableRow = z.infer<typeof TableRowSchema>;
export type DetectedTable = z.infer<typeof DetectedTableSchema>;
export type TablesOnly = z.infer<typeof TablesOnlySchema>;