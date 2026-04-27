import { Router } from 'express';
import { handlePrepare, handleComplete } from './click.controller.js';

export const clickRouter = Router();

// POST /api/click/prepare — Click calls this before redirecting user to payment
clickRouter.post('/prepare', handlePrepare);

// POST /api/click/complete — Click calls this after successful payment
clickRouter.post('/complete', handleComplete);