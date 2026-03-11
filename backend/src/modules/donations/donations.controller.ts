import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import type { InitiateDonationDto, DonationListQuery } from '../../types/api.js';
import { PaymentProvider } from '../../types/entities.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { query as dbQuery } from '../../config/database.js';
import { paymentService } from '../../services/payment.service.js';
import * as donationsService from './donations.service.js';
import * as ledgerService from './ledger.service.js';

// ============================================================
// 5.1 — OTP
// ============================================================

/**
 * POST /api/donations/request-otp
 */
export async function requestOtp(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const phone = authReq.user.phone_number;
  const { campaign_id, amount } = req.body as { campaign_id: string; amount: number };

  await donationsService.requestDonationOtp(authReq.user.id, phone, campaign_id, amount);

  res.status(200).json({
    success: true,
    message: 'OTP sent successfully',
  });
}

/**
 * POST /api/donations/verify-otp
 */
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { otp } = req.body as { donation_id: string; otp: string };

  const verified = await donationsService.verifyDonationOtp(
    authReq.user.id,
    authReq.user.phone_number,
    otp,
  );

  if (!verified) {
    res.status(400).json({
      success: false,
      error: 'INVALID_OTP',
      message: 'Invalid OTP code',
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
  });
}

// ============================================================
// 5.2 — INITIATE & CONFIRM
// ============================================================

/**
 * POST /api/donations/initiate
 */
export async function initiate(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const data = req.body as InitiateDonationDto;

  const result = await donationsService.initiateDonation(authReq.user.id, data);

  res.status(201).json({
    success: true,
    data: {
      donation: result.donation,
      checkout_url: result.checkout_url,
    },
  });
}

/**
 * POST /api/donations/webhook/payme
 */
export async function confirmWebhook(req: Request, res: Response): Promise<void> {
  const result = paymentService.verifyWebhook(
    PaymentProvider.PAYME,
    req.headers as Record<string, string>,
    req.body,
  );

  if (!result.valid) {
    res.status(400).json({
      success: false,
      error: 'INVALID_WEBHOOK',
    });
    return;
  }

  await donationsService.confirmDonation(
    result.donation_id!,
    result.transaction_id!,
    result.status!,
    result.amount!,
  );

  res.status(200).json({
    success: true,
    message: 'Webhook processed',
  });
}

// ============================================================
// 5.3 — READ
// ============================================================

/**
 * GET /api/donations/:id
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  const donation = await donationsService.getDonationById(req.params.id as string, authReq.user?.id);

  res.status(200).json({
    success: true,
    data: donation,
  });
}

/**
 * GET /api/donations/campaign/:campaignId
 */
export async function listByCampaign(req: Request, res: Response): Promise<void> {
  const filters = req.query as unknown as DonationListQuery;

  const result = await donationsService.listDonationsByCampaign(
    req.params.campaignId as string,
    filters,
  );

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
}

/**
 * GET /api/donations/my
 */
export async function listMyDonations(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const filters = req.query as unknown as DonationListQuery;

  const result = await donationsService.listMyDonations(authReq.user.id, filters);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
}

// ============================================================
// 5.4 — RECEIPT
// ============================================================

/**
 * GET /api/donations/:id/receipt
 */
export async function downloadReceipt(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  const result = await donationsService.getReceipt(req.params.id as string, authReq.user.id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
  res.send(result.buffer);
}

// ============================================================
// 5.5 — LEDGER
// ============================================================

/**
 * GET /api/donations/ledger/:campaignId
 * Only the campaign creator or an admin can view the ledger.
 */
export async function getCampaignBalance(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const campaignId = req.params.campaignId as string;

  // Verify the user is the campaign creator or an admin
  if (!authReq.user.is_admin) {
    const campaignResult = await dbQuery(
      'SELECT creator_id FROM campaigns WHERE id = $1',
      [campaignId],
    );

    if (campaignResult.rows.length === 0) {
      throw new NotFoundError('Campaign not found');
    }

    const campaign = campaignResult.rows[0] as { creator_id: string };
    if (campaign.creator_id !== authReq.user.id) {
      throw new ForbiddenError('You can only view the ledger for your own campaigns');
    }
  }

  const balance = await ledgerService.getCampaignBalance(campaignId);

  res.status(200).json({
    success: true,
    data: balance,
  });
}

/**
 * GET /api/donations/ledger
 */
export async function getTotalLedger(_req: Request, res: Response): Promise<void> {
  const [escrow, revenue] = await Promise.all([
    ledgerService.getTotalEscrow(),
    ledgerService.getPlatformRevenue(),
  ]);

  res.status(200).json({
    success: true,
    data: { escrow, revenue },
  });
}
