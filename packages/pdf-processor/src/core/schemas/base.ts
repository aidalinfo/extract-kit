import { z } from 'zod';

/**
 * Schémas de base réutilisables
 */

export const AddressSchema = z.object({
  street: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

export const ContactInfoSchema = z.object({
  name: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  address: AddressSchema.nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().or(z.literal(null)).optional(),
  website: z.string().nullable().optional(),
  vat_number: z.string().nullable().optional(),
  tax_id: z.string().nullable().optional(),
});

export const DocumentInfoSchema = z.object({
  document_type: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  total_pages: z.number().int().nullable().optional(),
});

export const PaymentInfoSchema = z.object({
  payment_terms: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  payment_due_date: z.string().nullable().optional(),
  bank_details: z.string().nullable().optional(),
  iban: z.string().nullable().optional(),
  swift_code: z.string().nullable().optional(),
});

// Types TypeScript générés
export type Address = z.infer<typeof AddressSchema>;
export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type DocumentInfo = z.infer<typeof DocumentInfoSchema>;
export type PaymentInfo = z.infer<typeof PaymentInfoSchema>;