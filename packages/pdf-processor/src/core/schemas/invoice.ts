import { z } from 'zod';
import { ContactInfoSchema, DocumentInfoSchema, PaymentInfoSchema } from './base';

/**
 * Schémas spécifiques aux factures et reçus
 */

export const InvoiceLineItemSchema = z.object({
  item_number: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  discount: z.number().nullable().optional(),
  tax_rate: z.number().nullable().optional(),
  tax_amount: z.number().nullable().optional(),
  line_total: z.number().nullable().optional(),
  // Support structure française
  quantite: z.number().nullable().optional(),
  prix_unitaire: z.number().nullable().optional(),
  montant_ht: z.number().nullable().optional(),
  montant_ttc: z.number().nullable().optional(),
  taux_tva: z.number().nullable().optional(),
  montant_tva: z.number().nullable().optional(),
  // Devise pour ce ligne
  currency: z.string().nullable().optional(),
});

export const FinancialTotalsSchema = z.object({
  subtotal: z.number().nullable().optional(),
  discount_total: z.number().nullable().optional(),
  tax_total: z.number().nullable().optional(),
  shipping_cost: z.number().nullable().optional(),
  total_amount: z.number().nullable().optional(),
  amount_paid: z.number().nullable().optional(),
  balance_due: z.number().nullable().optional(),
  // Support structure française
  total_ht: z.number().nullable().optional(),
  total_tva: z.number().nullable().optional(),
  total_ttc: z.number().nullable().optional(),
  montant_ht: z.number().nullable().optional(),
  montant_tva: z.number().nullable().optional(),
  montant_ttc: z.number().nullable().optional(),
  // Devise
  currency: z.string().nullable().optional(),
});

export const InvoiceDetailsSchema = z.object({
  invoice_number: z.string().nullable().optional(),
  invoice_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  purchase_order: z.string().nullable().optional(),
  reference_number: z.string().nullable().optional(),
});

// === SCHÉMA FACTURE COMPLET ===
export const ComprehensiveInvoiceSchema = z.object({
  // Structure classique
  document_info: DocumentInfoSchema.optional(),
  invoice_details: InvoiceDetailsSchema.optional(),
  seller_info: ContactInfoSchema.optional(),
  buyer_info: ContactInfoSchema.optional(),
  line_items: z.array(InvoiceLineItemSchema).optional(),
  financial_totals: FinancialTotalsSchema.optional(),
  payment_info: PaymentInfoSchema.optional(),
  
  // Support structure multi-pages (comme votre exemple)
  pages: z.array(z.object({
    page: z.number(),
    page_tables: z.array(z.object({
      // Format simple (billed services)
      billed_services: z.array(InvoiceLineItemSchema).optional(),
      
      // Totaux rapides  
      totals: FinancialTotalsSchema.optional(),
      
      // Structure complexe imbriquée (sections détaillées)
      sections_detaillees: z.record(z.object({
        items: z.record(z.object({
          quantite: z.number().nullable().optional(),
          prix_unitaire: z.number().nullable().optional(),
          montant_ht: z.number().nullable().optional(),
          taux_tva: z.number().nullable().optional(),
          montant_tva: z.number().nullable().optional(),
          montant_ttc: z.number().nullable().optional()
        })),
        sous_total: FinancialTotalsSchema.optional()
      })).optional(),
      
      // Totaux finaux
      total: FinancialTotalsSchema.optional(),
      reference: z.string().nullable().optional(),
      exercice: z.string().nullable().optional(),
      montant_ttc: z.number().nullable().optional(),
      currency: z.string().nullable().optional(),
      
      // Structure libre pour cas complexes non prévus
      raw_data: z.record(z.any()).optional()
    }))
  })).optional(),
  
  extraction_metadata: z.object({
    confidence_score: z.number().min(0).max(1).nullable(),
    fields_found: z.number().int().nullable(),
    fields_empty: z.number().int().nullable(),
    processing_notes: z.array(z.string()).optional(),
  }).optional(),
});

// === SCHÉMA REÇU SIMPLE ===
export const BasicReceiptSchema = z.object({
  merchant_name: z.string().nullable().optional(),
  transaction_date: z.string().nullable().optional(),
  total_amount: z.number().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  items: z.array(z.object({
    name: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    quantity: z.number().nullable().optional(),
    total: z.number().nullable().optional(),
  })).optional(),
});

// Types TypeScript générés
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;
export type FinancialTotals = z.infer<typeof FinancialTotalsSchema>;
export type InvoiceDetails = z.infer<typeof InvoiceDetailsSchema>;
export type ComprehensiveInvoice = z.infer<typeof ComprehensiveInvoiceSchema>;
export type BasicReceipt = z.infer<typeof BasicReceiptSchema>;