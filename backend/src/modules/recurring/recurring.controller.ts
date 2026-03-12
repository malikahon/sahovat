import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import type { CreateRecurringDonationDto, UpdateRecurringDonationDto } from '../../types/api.js';
import type { RecurringStatus } from '../../types/entities.js';
import * as recurringService from './recurring.service.js';

// ============================================================
// CREATE
// ============================================================

/**
 * POST /api/recurring-donations
 */
export async function create(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const data = req.body as CreateRecurringDonationDto;

  const recurring = await recurringService.createRecurringDonation(
    authReq.user.id,
    data,
  );

  res.status(201).json({
    success: true,
    data: recurring,
    message: 'Recurring donation created successfully',
  });
}

// ============================================================
// LIST MY
// ============================================================

/**
 * GET /api/recurring-donations
 */
export async function listMy(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { page, limit, status } = req.query as unknown as {
    page: number;
    limit: number;
    status?: RecurringStatus;
  };

  const result = await recurringService.listMyRecurring(authReq.user.id, {
    page,
    limit,
    status,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
}

// ============================================================
// GET BY ID
// ============================================================

/**
 * GET /api/recurring-donations/:id
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  const recurring = await recurringService.getRecurringById(
    req.params.id as string,
    authReq.user.id,
  );

  res.status(200).json({
    success: true,
    data: recurring,
  });
}

// ============================================================
// UPDATE
// ============================================================

/**
 * PUT /api/recurring-donations/:id
 */
export async function update(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const data = req.body as UpdateRecurringDonationDto;

  const recurring = await recurringService.updateRecurring(
    req.params.id as string,
    authReq.user.id,
    data,
  );

  res.status(200).json({
    success: true,
    data: recurring,
    message: 'Recurring donation updated successfully',
  });
}

// ============================================================
// DELETE
// ============================================================

/**
 * DELETE /api/recurring-donations/:id
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  await recurringService.deleteRecurring(
    req.params.id as string,
    authReq.user.id,
  );

  res.status(200).json({
    success: true,
    message: 'Recurring donation deleted',
  });
}

// ============================================================
// IMPACT STATS
// ============================================================

/**
 * GET /api/recurring-donations/impact
 */
export async function getImpact(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  const stats = await recurringService.getImpactStats(authReq.user.id);

  res.status(200).json({
    success: true,
    data: stats,
  });
}
