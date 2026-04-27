import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, optionalAuth, requireAdmin } from '../../middleware/auth.js';
import {
  donationParamsSchema,
  campaignParamsSchema,
  initiateDonationSchema,
  donationListQuerySchema,
  donationOtpRequestSchema,
  donationOtpVerifySchema,
  webhookPaymeSchema,
  webhookClickSchema,
} from './donations.validation.js';
import * as donationsController from './donations.controller.js';

export const donationsRouter = Router();

// ============================================================
// Combined schema for campaign donations listing (params + query)
// ============================================================

const campaignDonationsSchema = {
  params: campaignParamsSchema.params,
  query: donationListQuerySchema.query,
};

// ============================================================
// PUBLIC: Platform fee percentage
// ============================================================

// GET /api/donations/fee-info — public endpoint returning current platform fee %
donationsRouter.get('/fee-info', donationsController.getFeeInfo);

// ============================================================
// 5.1 — OTP
// ============================================================

// POST /api/donations/request-otp — request OTP for high-value donation
donationsRouter.post(
  '/request-otp',
  requireAuth,
  validate(donationOtpRequestSchema),
  donationsController.requestOtp,
);

// POST /api/donations/verify-otp — verify OTP code
donationsRouter.post(
  '/verify-otp',
  requireAuth,
  validate(donationOtpVerifySchema),
  donationsController.verifyOtp,
);

// ============================================================
// 5.2 — INITIATE & WEBHOOK
// ============================================================

// POST /api/donations/initiate — initiate a new donation
donationsRouter.post(
  '/initiate',
  requireAuth,
  validate(initiateDonationSchema),
  donationsController.initiate,
);

// POST /api/donations/webhook/payme — PayMe webhook callback (no auth)
donationsRouter.post(
  '/webhook/payme',
  validate(webhookPaymeSchema),
  donationsController.confirmWebhook,
);

// POST /api/donations/webhook/click — Click webhook callback (no auth)
donationsRouter.post(
  '/webhook/click',
  validate(webhookClickSchema),
  donationsController.confirmWebhookClick,
);

// ============================================================
// 5.3 — MY DONATIONS (must be before /:id)
// ============================================================

// GET /api/donations/my — list authenticated user's donations
donationsRouter.get(
  '/my',
  requireAuth,
  validate(donationListQuerySchema),
  donationsController.listMyDonations,
);

// ============================================================
// 5.5 — LEDGER (must be before /:id)
// ============================================================

// GET /api/donations/ledger — admin total ledger overview
donationsRouter.get(
  '/ledger',
  requireAuth,
  requireAdmin,
  donationsController.getTotalLedger,
);

// GET /api/donations/ledger/:campaignId — campaign balance breakdown
donationsRouter.get(
  '/ledger/:campaignId',
  requireAuth,
  validate(campaignParamsSchema),
  donationsController.getCampaignBalance,
);

// ============================================================
// 5.3 — CAMPAIGN DONATIONS (must be before /:id)
// ============================================================

// GET /api/donations/campaign/:campaignId — list donations for a campaign
donationsRouter.get(
  '/campaign/:campaignId',
  optionalAuth,
  validate(campaignDonationsSchema),
  donationsController.listByCampaign,
);

// ============================================================
// 5.4 — RECEIPT (must be before /:id)
// ============================================================

// GET /api/donations/:id/receipt — download donation receipt PDF
donationsRouter.get(
  '/:id/receipt',
  requireAuth,
  validate(donationParamsSchema),
  donationsController.downloadReceipt,
);

// ============================================================
// 5.3 — SINGLE DONATION
// ============================================================

// GET /api/donations/:id — get donation details
donationsRouter.get(
  '/:id',
  optionalAuth,
  validate(donationParamsSchema),
  donationsController.getById,
);
