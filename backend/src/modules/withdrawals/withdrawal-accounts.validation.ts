import { z } from 'zod';

// ============================================================
// CREATE WITHDRAWAL ACCOUNT
// ============================================================

export const createAccountSchema = {
  body: z.object({
    provider: z.enum(['payme', 'uzcard', 'humo']),
    account_number: z
      .string()
      .regex(/^\d{16}$/, 'Account number must be exactly 16 digits'),
    account_holder_name: z
      .string()
      .min(2, 'Account holder name must be at least 2 characters')
      .max(255, 'Account holder name must be at most 255 characters')
      .trim(),
  }),
};

// ============================================================
// UPDATE WITHDRAWAL ACCOUNT
// ============================================================

export const updateAccountSchema = {
  body: z.object({
    account_holder_name: z
      .string()
      .min(2, 'Account holder name must be at least 2 characters')
      .max(255, 'Account holder name must be at most 255 characters')
      .trim()
      .optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid account ID format'),
  }),
};

// ============================================================
// ACCOUNT PARAMS (for GET /:id, DELETE /:id, PUT /:id/primary)
// ============================================================

export const accountParamsSchema = {
  params: z.object({
    id: z.string().uuid('Invalid account ID format'),
  }),
};
