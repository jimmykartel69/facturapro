import { z } from 'zod';

// Validation on the server: the browser cannot be trusted for totals or item values.
const billingItemSchema = z.object({
  designation: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).nullable().optional(),
  quantity: z.coerce.number().finite().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(50).optional(),
  unitPrice: z.coerce.number().finite().min(0).max(1_000_000_000),
  tvaRate: z.coerce.number().finite().min(0).max(100).optional(),
});

const itemsSchema = z.array(billingItemSchema).min(1).max(150);

export function parseBillingItems(value: unknown) {
  const parsed = itemsSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false as const, error: 'Lignes du devis invalides : désignation, quantité, prix ou TVA incorrect.' };
  }
  return { ok: true as const, items: parsed.data };
}
