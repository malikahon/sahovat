import { z } from 'zod';
import { CampaignCategory, PaymentProvider, RecurringFrequency, RecurringStatus } from '../../types/entities.js';

// ============================================================
// CREATE
// ============================================================

export const createRecurringSchema = {
  body: z
    .object({
      campaign_id: z.string().uuid().optional(),
      category: z.nativeEnum(CampaignCategory).optional(),
      amount: z.number().int().min(1000, 'Minimum recurring amount is 1,000 UZS'),
      frequency: z.nativeEnum(RecurringFrequency),
      payment_provider: z.nativeEnum(PaymentProvider).default(PaymentProvider.PAYME),
    })
    .refine(
      (data) => data.campaign_id || data.category,
      { message: 'Either campaign_id or category must be provided' },
    ),
};

// ============================================================
// UPDATE
// ============================================================

export const updateRecurringSchema = {
  body: z.object({
    amount: z.number().int().min(1000, 'Minimum recurring amount is 1,000 UZS').optional(),
    frequency: z.nativeEnum(RecurringFrequency).optional(),
    status: z
      .enum([RecurringStatus.ACTIVE, RecurringStatus.PAUSED, RecurringStatus.CANCELLED])
      .optional(),
  }),
};

// ============================================================
// LIST
// ============================================================

export const listRecurringSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.nativeEnum(RecurringStatus).optional(),
  }),
};

// ============================================================
// PARAM — :id
// ============================================================

export const recurringIdParamSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};
