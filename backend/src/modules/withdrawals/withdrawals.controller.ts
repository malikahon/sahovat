import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import * as withdrawalsService from './withdrawals.service.js';

// ============================================================
// ORGANIZER — AVAILABLE BALANCE (10.1)
// ============================================================

/**
 * GET /api/withdrawals/campaigns/:id/balance
 * Returns the available withdrawal balance for a campaign (organizer only).
 */
export async function getCampaignBalance(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const campaignId = req.params.id as string;

  const balance = await withdrawalsService.getCampaignAvailableBalance(
    campaignId,
    authReq.user.id,
  );

  res.status(200).json({ success: true, data: balance });
}

// ============================================================
// ORGANIZER — REQUEST WITHDRAWAL (10.2 + 10.5)
// ============================================================

/**
 * POST /api/withdrawals
 * Creates a withdrawal request for a campaign the organizer owns.
 */
export async function requestWithdrawal(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { campaign_id, withdrawal_account_id, amount } = req.body as {
    campaign_id: string;
    withdrawal_account_id: string;
    amount: number;
  };

  const withdrawal = await withdrawalsService.requestWithdrawal(authReq.user.id, {
    campaign_id,
    withdrawal_account_id,
    amount: Number(amount),
  });

  res.status(201).json({
    success: true,
    data: { withdrawal },
    message: 'Withdrawal request submitted successfully',
  });
}

// ============================================================
// ORGANIZER — LIST MY WITHDRAWALS
// ============================================================

/**
 * GET /api/withdrawals/my
 * Lists all withdrawal requests made by the organizer.
 */
export async function listMyWithdrawals(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const campaign_id = req.query.campaign_id as string | undefined;
  const status = req.query.status as string | undefined;

  const result = await withdrawalsService.listMyWithdrawals(authReq.user.id, {
    page,
    limit,
    campaign_id,
    status,
  });

  res.status(200).json({ success: true, ...result });
}

// ============================================================
// ORGANIZER — DASHBOARD (10.6)
// ============================================================

/**
 * GET /api/withdrawals/dashboard
 * Returns per-campaign stats, available balances, and withdrawal history for the organizer.
 */
export async function getOrganizerDashboard(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  const data = await withdrawalsService.getOrganizerDashboard(authReq.user.id);

  res.status(200).json({ success: true, data });
}

// ============================================================
// ADMIN — LIST WITHDRAWAL QUEUE (10.3)
// ============================================================

/**
 * GET /api/admin/withdrawals
 */
export async function listWithdrawalsAdmin(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const status = req.query.status as string | undefined;
  const campaign_id = req.query.campaign_id as string | undefined;

  const result = await withdrawalsService.listWithdrawalsAdmin({
    page,
    limit,
    status,
    campaign_id,
  });

  res.status(200).json({ success: true, ...result });
}

// ============================================================
// ADMIN — GET SINGLE WITHDRAWAL (10.3 + 10.4)
// ============================================================

/**
 * GET /api/admin/withdrawals/:id
 */
export async function getWithdrawalAdmin(req: Request, res: Response): Promise<void> {
  const withdrawalId = req.params.id as string;

  const withdrawal = await withdrawalsService.getWithdrawalAdmin(withdrawalId);

  res.status(200).json({ success: true, data: withdrawal });
}

// ============================================================
// ADMIN — APPROVE / REJECT (10.3)
// ============================================================

/**
 * PATCH /api/admin/withdrawals/:id/review
 */
export async function reviewWithdrawal(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const withdrawalId = req.params.id as string;
  const { action, admin_notes } = req.body as {
    action: 'approve' | 'reject';
    admin_notes?: string;
  };

  if (!['approve', 'reject'].includes(action)) {
    res.status(400).json({ success: false, error: 'action must be "approve" or "reject"' });
    return;
  }

  await withdrawalsService.reviewWithdrawal(authReq.user.id, withdrawalId, {
    action,
    admin_notes,
  });

  res.status(200).json({
    success: true,
    message: action === 'approve' ? 'Withdrawal approved' : 'Withdrawal rejected',
  });
}

// ============================================================
// ADMIN — MARK COMPLETED (10.3)
// ============================================================

/**
 * PATCH /api/admin/withdrawals/:id/complete
 */
export async function completeWithdrawal(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const withdrawalId = req.params.id as string;
  const { transaction_reference, admin_notes } = req.body as {
    transaction_reference: string;
    admin_notes?: string;
  };

  if (!transaction_reference) {
    res.status(400).json({ success: false, error: 'transaction_reference is required' });
    return;
  }

  await withdrawalsService.completeWithdrawal(authReq.user.id, withdrawalId, {
    transaction_reference,
    admin_notes,
  });

  res.status(200).json({
    success: true,
    message: 'Withdrawal marked as completed',
  });
}
