import { Router } from 'express';
import { optionalAuth } from '../../middleware/auth.js';
import * as feedController from './feed.controller.js';

export const feedRouter = Router();

// GET /api/feed — Personalized campaign feed (auth optional)
feedRouter.get(
  '/',
  optionalAuth,
  feedController.getFeed,
);
