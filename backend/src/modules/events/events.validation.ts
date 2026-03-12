import { z } from 'zod';
import { EventType } from '../../types/entities.js';

// ============================================================
// TRACK EVENT
// ============================================================

export const trackEventSchema = {
  body: z.object({
    event_type: z.nativeEnum(EventType, { message: 'Invalid event type' }),
    campaign_id: z.string().uuid('Invalid campaign ID').optional(),
    session_id: z.string().min(1, 'Session ID is required').max(100, 'Session ID too long'),
    metadata: z.record(z.unknown()).optional(),
  }),
};

// ============================================================
// BATCH TRACK EVENTS
// ============================================================

export const batchTrackEventsSchema = {
  body: z.object({
    events: z.array(
      z.object({
        event_type: z.nativeEnum(EventType, { message: 'Invalid event type' }),
        campaign_id: z.string().uuid('Invalid campaign ID').optional(),
        session_id: z.string().min(1).max(100),
        metadata: z.record(z.unknown()).optional(),
      }),
    ).min(1, 'At least one event required').max(50, 'Maximum 50 events per batch'),
  }),
};
