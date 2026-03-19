import { z } from 'zod';

// ============================================================
// ADD CARD (initiate)
// ============================================================

export const addCardSchema = {
  body: z.object({
    card_number: z
      .string()
      .regex(/^\d{16}$/, 'Card number must be 16 digits'),
    card_expire: z
      .string()
      .regex(/^\d{4}$/, 'Expiry must be 4 digits (MMYY)'),
  }),
};

// ============================================================
// VERIFY CARD (OTP)
// ============================================================

export const verifyCardSchema = {
  body: z.object({
    card_id: z.string().uuid('Invalid card ID'),
    code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  }),
};

// ============================================================
// PARAMS
// ============================================================

export const cardParamsSchema = {
  params: z.object({
    id: z.string().uuid('Invalid card ID'),
  }),
};
