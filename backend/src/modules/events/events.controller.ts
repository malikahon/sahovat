import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import type { TrackEventDto } from '../../types/api.js';
import * as eventsService from './events.service.js';

// ============================================================
// POST /api/events — Track a single event
// ============================================================

export async function trackEvent(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id ?? null;
  const dto = req.body as TrackEventDto;

  const event = await eventsService.trackEvent(userId, dto);

  res.status(201).json({
    success: true,
    data: { event_id: event.id },
  });
}

// ============================================================
// POST /api/events/batch — Track multiple events
// ============================================================

export async function trackEventsBatch(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id ?? null;
  const { events } = req.body as { events: TrackEventDto[] };

  await eventsService.trackEventsBatch(userId, events);

  res.status(201).json({
    success: true,
    message: `${events.length} events tracked`,
  });
}
