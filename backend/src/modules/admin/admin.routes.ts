import { Router } from 'express';
import * as adminController from './admin.controller.js';
import * as withdrawalsController from '../withdrawals/withdrawals.controller.js';

export const adminRouter = Router();

// NOTE: requireAuth + requireAdmin are applied in app.ts before this router,
// so all routes here are already protected.

// ============================================================
// 8.3 — DASHBOARD STATS
// ============================================================

// GET /api/admin/stats
adminRouter.get('/stats', adminController.getDashboardStats);

// GET /api/admin/stats/donations-over-time?days=30
adminRouter.get('/stats/donations-over-time', adminController.getDonationsOverTime);

// GET /api/admin/stats/donations-by-category
adminRouter.get('/stats/donations-by-category', adminController.getDonationsByCategory);

// GET /api/admin/stats/money-flow
adminRouter.get('/stats/money-flow', adminController.getMoneyFlow);

// ============================================================
// 9.6 — ESCROW SUMMARY
// ============================================================

// GET /api/admin/escrow
adminRouter.get('/escrow', adminController.getEscrowSummary);

// ============================================================
// 8.1 — USER MANAGEMENT
// ============================================================

// GET /api/admin/users
adminRouter.get('/users', adminController.listUsers);

// GET /api/admin/users/:id
adminRouter.get('/users/:id', adminController.getUserDetails);

// PATCH /api/admin/users/:id — full user edit (any field)
adminRouter.patch('/users/:id', adminController.updateUser);

// PATCH /api/admin/users/:id/admin — grant or revoke admin
adminRouter.patch('/users/:id/admin', adminController.toggleAdmin);

// PATCH /api/admin/users/:id/ban — ban or unban
adminRouter.patch('/users/:id/ban', adminController.toggleBan);

// ============================================================
// 8.2 — CAMPAIGN MANAGEMENT
// ============================================================

// GET /api/admin/campaigns
adminRouter.get('/campaigns', adminController.listCampaigns);

// GET /api/admin/campaigns/:id
adminRouter.get('/campaigns/:id', adminController.getCampaign);

// PATCH /api/admin/campaigns/:id/verify — approve or reject verification
adminRouter.patch('/campaigns/:id/verify', adminController.verifyCampaign);

// PATCH /api/admin/campaigns/:id/status — pause / resume / freeze / cancel
adminRouter.patch('/campaigns/:id/status', adminController.updateCampaignStatus);

// ============================================================
// 8.4 — AUDIT LOG
// ============================================================

// GET /api/admin/audit-log
adminRouter.get('/audit-log', adminController.getAuditLog);

// ============================================================
// 8.5 — SETTINGS
// ============================================================

// GET /api/admin/settings
adminRouter.get('/settings', adminController.getSettings);

// PATCH /api/admin/settings
adminRouter.patch('/settings', adminController.updateSettings);

// ============================================================
// 10.3 — WITHDRAWAL QUEUE
// ============================================================

// GET /api/admin/withdrawals — list all withdrawal requests (with filters)
adminRouter.get('/withdrawals', withdrawalsController.listWithdrawalsAdmin);

// GET /api/admin/withdrawals/:id — single withdrawal detail (with name comparison)
adminRouter.get('/withdrawals/:id', withdrawalsController.getWithdrawalAdmin);

// PATCH /api/admin/withdrawals/:id/review — approve or reject
adminRouter.patch('/withdrawals/:id/review', withdrawalsController.reviewWithdrawal);

// PATCH /api/admin/withdrawals/:id/complete — mark as completed with tx ref
adminRouter.patch('/withdrawals/:id/complete', withdrawalsController.completeWithdrawal);

// ============================================================
// VERIFICATION DOCUMENT REVIEW
// ============================================================

// GET /api/admin/verification-documents — list all docs (filter by ?status=pending)
adminRouter.get('/verification-documents', adminController.listVerificationDocuments);

// GET /api/admin/verification-documents/:id/file — stream the private document for admin preview
adminRouter.get('/verification-documents/:id/file', adminController.getVerificationDocumentFile);

// PATCH /api/admin/verification-documents/:id/review — approve or reject
adminRouter.patch('/verification-documents/:id/review', adminController.reviewVerificationDocument);
