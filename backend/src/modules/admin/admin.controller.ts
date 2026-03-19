import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import * as adminService from './admin.service.js';
import {
  userListQuerySchema,
  campaignListQuerySchema,
  auditLogQuerySchema,
  toggleAdminSchema,
  toggleBanSchema,
  verifyCampaignSchema,
  campaignStatusSchema,
  updateSettingsSchema,
} from './admin.validation.js';

// ============================================================
// 8.3 — DASHBOARD STATS
// ============================================================

/**
 * GET /api/admin/stats
 */
export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  const stats = await adminService.getDashboardStats();
  res.status(200).json({ success: true, data: stats });
}

// ============================================================
// 8.1 — USER MANAGEMENT
// ============================================================

/**
 * GET /api/admin/users
 */
export async function listUsers(req: Request, res: Response): Promise<void> {
  const params = userListQuerySchema.parse(req.query);
  const result = await adminService.listUsers(params);
  res.status(200).json({ success: true, ...result });
}

/**
 * GET /api/admin/users/:id
 */
export async function getUserDetails(req: Request, res: Response): Promise<void> {
  const userId = req.params.id as string;
  const user = await adminService.getUserDetails(userId);
  res.status(200).json({ success: true, data: user });
}

/**
 * PATCH /api/admin/users/:id/admin
 */
export async function toggleAdmin(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const targetUserId = req.params.id as string;
  const dto = toggleAdminSchema.parse(req.body);

  await adminService.toggleAdmin(authReq.user.id, targetUserId, dto);

  res.status(200).json({
    success: true,
    message: dto.is_admin ? 'Admin privileges granted' : 'Admin privileges revoked',
  });
}

/**
 * PATCH /api/admin/users/:id/ban
 */
export async function toggleBan(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const targetUserId = req.params.id as string;
  const dto = toggleBanSchema.parse(req.body);

  await adminService.toggleBan(authReq.user.id, targetUserId, dto);

  res.status(200).json({
    success: true,
    message: dto.is_banned ? 'User banned' : 'User unbanned',
  });
}

// ============================================================
// 8.2 — CAMPAIGN MANAGEMENT
// ============================================================

/**
 * GET /api/admin/campaigns
 */
export async function listCampaigns(req: Request, res: Response): Promise<void> {
  const params = campaignListQuerySchema.parse(req.query);
  const result = await adminService.listCampaignsAdmin(params);
  res.status(200).json({ success: true, ...result });
}

/**
 * GET /api/admin/campaigns/:id
 */
export async function getCampaign(req: Request, res: Response): Promise<void> {
  const campaignId = req.params.id as string;
  const campaign = await adminService.getCampaignAdmin(campaignId);
  res.status(200).json({ success: true, data: campaign });
}

/**
 * PATCH /api/admin/campaigns/:id/verify
 */
export async function verifyCampaign(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const campaignId = req.params.id as string;
  const dto = verifyCampaignSchema.parse(req.body);

  await adminService.verifyCampaign(authReq.user.id, campaignId, dto);

  res.status(200).json({
    success: true,
    message: dto.verified ? 'Campaign verified and activated' : 'Campaign verification rejected',
  });
}

/**
 * PATCH /api/admin/campaigns/:id/status
 */
export async function updateCampaignStatus(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const campaignId = req.params.id as string;
  const dto = campaignStatusSchema.parse(req.body);

  await adminService.updateCampaignStatus(authReq.user.id, campaignId, dto);

  res.status(200).json({
    success: true,
    message: `Campaign status updated to ${dto.status}`,
  });
}

// ============================================================
// 8.4 — AUDIT LOG
// ============================================================

/**
 * GET /api/admin/audit-log
 */
export async function getAuditLog(req: Request, res: Response): Promise<void> {
  const params = auditLogQuerySchema.parse(req.query);
  const result = await adminService.getAuditLog(params);
  res.status(200).json({ success: true, ...result });
}

// ============================================================
// 8.5 — SETTINGS
// ============================================================

/**
 * GET /api/admin/settings
 */
export async function getSettings(_req: Request, res: Response): Promise<void> {
  const settings = await adminService.getSettings();
  res.status(200).json({ success: true, data: settings });
}

// ============================================================
// 9.2 / 9.6 — CHART DATA & ESCROW
// ============================================================

/**
 * GET /api/admin/stats/donations-over-time
 */
export async function getDonationsOverTime(req: Request, res: Response): Promise<void> {
  const days = Math.min(Number(req.query.days) || 30, 365);
  const data = await adminService.getDonationsOverTime(days);
  res.status(200).json({ success: true, data });
}

/**
 * GET /api/admin/stats/donations-by-category
 */
export async function getDonationsByCategory(_req: Request, res: Response): Promise<void> {
  const data = await adminService.getDonationsByCategory();
  res.status(200).json({ success: true, data });
}

/**
 * GET /api/admin/escrow
 */
export async function getEscrowSummary(_req: Request, res: Response): Promise<void> {
  const data = await adminService.getEscrowSummary();
  res.status(200).json({ success: true, data });
}

/**
 * GET /api/admin/stats/money-flow
 */
export async function getMoneyFlow(_req: Request, res: Response): Promise<void> {
  const data = await adminService.getMoneyFlowStats();
  res.status(200).json({ success: true, data });
}

/**
 * PATCH /api/admin/settings
 */
export async function updateSettings(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const dto = updateSettingsSchema.parse(req.body);

  await adminService.updateSettings(authReq.user.id, dto);

  res.status(200).json({ success: true, message: 'Settings updated' });
}
