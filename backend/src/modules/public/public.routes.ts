import { Router } from 'express';
import * as publicController from './public.controller.js';

export const publicRouter = Router();

// GET /api/public/stats — public aggregate stats (no auth)
publicRouter.get('/stats', publicController.getPublicStats);
