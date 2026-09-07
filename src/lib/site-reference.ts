import { z } from 'zod';

export const siteReferenceSchema = z.string()
  .trim()
  .max(120)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value))
  .transform((value) => value || null)
  .nullish();
