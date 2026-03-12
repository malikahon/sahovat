import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import * as feedService from './feed.service.js';

// ============================================================
// GET /api/feed — Personalized campaign feed
// ============================================================

export async function getFeed(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id ?? null;

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const result = await feedService.getPersonalizedFeed(userId, { page, limit });

  res.status(200).json({
    success: true,
    data: result.campaigns,
    pagination: result.pagination,
  });
}
