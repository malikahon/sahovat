import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireVerified, optionalAuth } from '../../middleware/auth.js';
import { uploadCampaignImage, uploadCampaignDocument } from '../../middleware/upload.js';
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignListQuerySchema,
  campaignParamsSchema,
  uploadDocumentSchema,
  documentParamsSchema,
  submitCampaignSchema,
} from './campaigns.validation.js';
import * as campaignsController from './campaigns.controller.js';

export const campaignsRouter = Router();

// ============================================================
// 4.5 — LIST CAMPAIGNS (public, optionally authed for personalized results)
// ============================================================

// GET /api/campaigns — public listing with optional auth for creator_id filter
campaignsRouter.get(
  '/',
  optionalAuth,
  validate(campaignListQuerySchema),
  campaignsController.listCampaigns,
);

// ============================================================
// 4.1 — CREATE CAMPAIGN
// ============================================================

// POST /api/campaigns — create new campaign (requires auth + verified)
campaignsRouter.post(
  '/',
  requireAuth,
  requireVerified,
  validate(createCampaignSchema),
  campaignsController.createCampaign,
);

// ============================================================
// 4.1 — GET SINGLE CAMPAIGN (public, optionally authed)
// ============================================================

// GET /api/campaigns/:id — get campaign details
campaignsRouter.get(
  '/:id',
  optionalAuth,
  validate(campaignParamsSchema),
  campaignsController.getCampaign,
);

// ============================================================
// 4.4 — CAMPAIGN STATISTICS
// ============================================================

// GET /api/campaigns/:id/stats — campaign statistics (with optional auth for draft visibility)
campaignsRouter.get(
  '/:id/stats',
  optionalAuth,
  validate(campaignParamsSchema),
  campaignsController.getCampaignStats,
);

// ============================================================
// 4.1 — UPDATE CAMPAIGN
// ============================================================

// PUT /api/campaigns/:id — update campaign (creator only, draft/pending)
campaignsRouter.put(
  '/:id',
  requireAuth,
  validate(updateCampaignSchema),
  campaignsController.updateCampaign,
);

// ============================================================
// 4.1 — DELETE CAMPAIGN
// ============================================================

// DELETE /api/campaigns/:id — delete draft campaign (creator only)
campaignsRouter.delete(
  '/:id',
  requireAuth,
  validate(campaignParamsSchema),
  campaignsController.deleteCampaign,
);

// ============================================================
// 4.6 — SUBMIT CAMPAIGN
// ============================================================

// PUT /api/campaigns/:id/submit — submit draft for review
campaignsRouter.put(
  '/:id/submit',
  requireAuth,
  validate(submitCampaignSchema),
  campaignsController.submitCampaign,
);

// ============================================================
// 4.6 — COVER IMAGE
// ============================================================

// POST /api/campaigns/:id/cover-image — upload/replace cover image
campaignsRouter.post(
  '/:id/cover-image',
  requireAuth,
  validate(campaignParamsSchema),
  uploadCampaignImage,
  campaignsController.uploadCoverImage,
);

// ============================================================
// 4.3 — DOCUMENTS
// ============================================================

// GET /api/campaigns/:id/documents — list documents
campaignsRouter.get(
  '/:id/documents',
  optionalAuth,
  validate(campaignParamsSchema),
  campaignsController.listDocuments,
);

// POST /api/campaigns/:id/documents — upload document
campaignsRouter.post(
  '/:id/documents',
  requireAuth,
  uploadCampaignDocument,
  validate(uploadDocumentSchema),
  campaignsController.uploadDocument,
);

// DELETE /api/campaigns/:id/documents/:docId — delete document
campaignsRouter.delete(
  '/:id/documents/:docId',
  requireAuth,
  validate(documentParamsSchema),
  campaignsController.deleteDocument,
);
