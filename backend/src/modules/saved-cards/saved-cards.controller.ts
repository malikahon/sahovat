import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import * as savedCardsService from './saved-cards.service.js';

// ============================================================
// POST /api/saved-cards — Initiate card add
// ============================================================

export async function addCard(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { card_number, card_expire } = req.body as { card_number: string; card_expire: string };

  const result = await savedCardsService.initiateCardAdd(
    authReq.user.id,
    card_number,
    card_expire,
  );

  res.status(201).json({
    success: true,
    data: result,
  });
}

// ============================================================
// POST /api/saved-cards/verify — Verify card OTP
// ============================================================

export async function verifyCard(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { card_id, code } = req.body as { card_id: string; code: string };

  const card = await savedCardsService.verifyCard(authReq.user.id, card_id, code);

  res.status(200).json({
    success: true,
    data: card,
  });
}

// ============================================================
// GET /api/saved-cards — List user's saved cards
// ============================================================

export async function listCards(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  const cards = await savedCardsService.listUserCards(authReq.user.id);

  res.status(200).json({
    success: true,
    data: cards,
  });
}

// ============================================================
// DELETE /api/saved-cards/:id — Remove a saved card
// ============================================================

export async function removeCard(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  await savedCardsService.removeCard(authReq.user.id, req.params.id as string);

  res.status(200).json({
    success: true,
    message: 'Card removed',
  });
}

// ============================================================
// PUT /api/saved-cards/:id/default — Set card as default
// ============================================================

export async function setDefault(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  await savedCardsService.setDefaultCard(authReq.user.id, req.params.id as string);

  res.status(200).json({
    success: true,
    message: 'Default card updated',
  });
}
