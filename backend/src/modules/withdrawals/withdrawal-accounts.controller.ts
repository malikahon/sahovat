import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import type { CreateWithdrawalAccountDto, UpdateWithdrawalAccountDto } from '../../types/api.js';
import * as accountService from './withdrawal-accounts.service.js';

/**
 * POST /api/withdrawal-accounts
 * Creates a new withdrawal account for the authenticated user.
 */
export async function createAccount(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const data = req.body as CreateWithdrawalAccountDto;

  const account = await accountService.createAccount(authReq.user.id, data);

  res.status(201).json({
    success: true,
    data: { account },
  });
}

/**
 * GET /api/withdrawal-accounts
 * Lists all withdrawal accounts for the authenticated user.
 */
export async function listAccounts(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  const accounts = await accountService.listAccounts(authReq.user.id);

  res.status(200).json({
    success: true,
    data: { accounts },
  });
}

/**
 * GET /api/withdrawal-accounts/:id
 * Gets a single withdrawal account by ID.
 */
export async function getAccount(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const id = req.params['id'] as string;

  const account = await accountService.getAccountById(authReq.user.id, id);

  res.status(200).json({
    success: true,
    data: { account },
  });
}

/**
 * PUT /api/withdrawal-accounts/:id
 * Updates a withdrawal account.
 */
export async function updateAccount(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const id = req.params['id'] as string;
  const data = req.body as UpdateWithdrawalAccountDto;

  const account = await accountService.updateAccount(authReq.user.id, id, data);

  res.status(200).json({
    success: true,
    data: { account },
  });
}

/**
 * DELETE /api/withdrawal-accounts/:id
 * Deletes a withdrawal account.
 */
export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const id = req.params['id'] as string;

  await accountService.deleteAccount(authReq.user.id, id);

  res.status(200).json({
    success: true,
    message: 'Account deleted',
  });
}

/**
 * PUT /api/withdrawal-accounts/:id/primary
 * Sets a withdrawal account as the primary account.
 */
export async function setPrimary(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const id = req.params['id'] as string;

  const account = await accountService.setPrimary(authReq.user.id, id);

  res.status(200).json({
    success: true,
    data: { account },
  });
}
