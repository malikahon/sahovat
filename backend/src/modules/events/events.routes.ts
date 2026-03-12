import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { optionalAuth } from '../../middleware/auth.js';
import { trackEventSchema, batchTrackEventsSchema } from './events.validation.js';
import * as eventsController from './events.controller.js';

export const eventsRouter = Router();

// POST /api/events — Track a single event (auth optional for guest tracking)
eventsRouter.post(
  '/',
  optionalAuth,
  validate(trackEventSchema),
  eventsController.trackEvent,
);

// POST /api/events/batch — Track multiple events in batch
eventsRouter.post(
  '/batch',
  optionalAuth,
  validate(batchTrackEventsSchema),
  eventsController.trackEventsBatch,
);
