import { z } from 'zod';

/**
 * Schémas de base réutilisables
 */

export const AddressSchema = z.object({
  street: z.string().nullable(),
  city: z.string().nullable(),
  postal_code: z.string().nullable(),
  country: z.string().nullable(),
});

export const ContactInfoSchema = z.object({
  name: z.string().nullable(),
  company_name: z.string().nullable(),
  address: AddressSchema.nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable().or(z.literal(null)),
  website: z.string().nullable(),
  vat_number: z.string().nullable(),
  tax_id: z.string().nullable(),
});

export const DocumentInfoSchema = z.object({
  document_type: z.string().nullable(),
  language: z.string().nullable(),
  currency: z.string().nullable(),
  total_pages: z.number().int().nullable(),
});

export const PaymentInfoSchema = z.object({
  payment_terms: z.string().nullable(),
  payment_method: z.string().nullable(),
  payment_due_date: z.string().nullable(),
  bank_details: z.string().nullable(),
  iban: z.string().nullable(),
  swift_code: z.string().nullable(),
});

// Types TypeScript générés
export type Address = z.infer<typeof AddressSchema>;
export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type DocumentInfo = z.infer<typeof DocumentInfoSchema>;
export type PaymentInfo = z.infer<typeof PaymentInfoSchema>;