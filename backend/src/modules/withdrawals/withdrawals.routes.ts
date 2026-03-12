import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as withdrawalsController from './withdrawals.controller.js';

export const withdrawalsRouter = Router();

// ============================================================
// ORGANIZER ROUTES (requireAuth applied per-route)
// ============================================================

// GET /api/withdrawals/dashboard — organizer dashboard with per-campaign stats
withdrawalsRouter.get(
  '/dashboard',
  requireAuth,
  withdrawalsController.getOrganizerDashboard,
);

// GET /api/withdrawals/my — list my withdrawal requests
withdrawalsRouter.get(
  '/my',
  requireAuth,
  withdrawalsController.listMyWithdrawals,
);

// POST /api/withdrawals — create a withdrawal request
withdrawalsRouter.post(
  '/',
  requireAuth,
  withdrawalsController.requestWithdrawal,
);

// GET /api/withdrawals/campaigns/:id/balance — available balance for a campaign
withdrawalsRouter.get(
  '/campaigns/:id/balance',
  requireAuth,
  withdrawalsController.getCampaignBalance,
);
