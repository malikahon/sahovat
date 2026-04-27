import type { Request, Response } from 'express';
import * as publicService from './public.service.js';

// ============================================================
// GET /api/public/stats — sanitized public aggregate stats
// ============================================================

export async function getPublicStats(_req: Request, res: Response): Promise<void> {
  const stats = await publicService.getPublicStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
}
