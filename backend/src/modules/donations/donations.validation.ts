import { z } from 'zod';
import { PaymentProvider, DonationStatus } from '../../types/entities.js';

// ============================================================
// PARAMS
// ============================================================

export const donationParamsSchema = {
  params: z.object({
    id: z.string().uuid('Invalid donation ID'),
  }),
};

export const campaignParamsSchema = {
  params: z.object({
    campaignId: z.string().uuid('Invalid campaign ID'),
  }),
};

// ============================================================
// INITIATE DONATION
// ============================================================

export const initiateDonationSchema = {
  body: z.object({
    campaign_id: z.string().uuid('Invalid campaign ID'),
    amount: z.number().int('Amount must be a whole number').positive('Amount must be positive').min(1000, 'Minimum donation is 1000 UZS').max(10_000_000_000, 'Amount too large'),
    payment_provider: z.nativeEnum(PaymentProvider, { message: 'Invalid payment provider' }),
    is_anonymous: z.boolean().default(false).optional(),
    donor_display_name: z.string().max(100, 'Display name must be at most 100 characters').optional(),
    note: z.string().max(500, 'Note must be at most 500 characters').optional(),
  }),
};

// ============================================================
// DONATION LIST QUERY
// ============================================================

export const donationListQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    campaign_id: z.string().uuid().optional(),
    donor_id: z.string().uuid().optional(),
    status: z.nativeEnum(DonationStatus).optional(),
    sort_by: z.enum(['created_at', 'amount']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
  }),
};

// ============================================================
// DONATION OTP REQUEST
// ============================================================

export const donationOtpRequestSchema = {
  body: z.object({
    campaign_id: z.string().uuid('Invalid campaign ID'),
    amount: z.number().int('Amount must be a whole number').positive('Amount must be positive').min(100001, 'OTP is only required for donations over 100,000 UZS'),
  }),
};

// ============================================================
// DONATION OTP VERIFY
// ============================================================

export const donationOtpVerifySchema = {
  body: z.object({
    donation_id: z.string().uuid('Invalid donation ID'),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  }),
};

// ============================================================
// WEBHOOK — PAYME
// ============================================================

export const webhookPaymeSchema = {
  body: z.object({
    donation_id: z.string(),
    transaction_id: z.string(),
    amount: z.number(),
    status: z.enum(['completed', 'failed']),
  }),
};
