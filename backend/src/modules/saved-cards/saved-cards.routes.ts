import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { addCardSchema, verifyCardSchema, cardParamsSchema } from './saved-cards.validation.js';
import * as savedCardsController from './saved-cards.controller.js';

export const savedCardsRouter = Router();

// All routes require auth (applied at mount level in app.ts)

// POST /api/saved-cards — initiate card add (tokenize + request OTP)
savedCardsRouter.post(
  '/',
  validate(addCardSchema),
  savedCardsController.addCard,
);

// POST /api/saved-cards/verify — verify card OTP
savedCardsRouter.post(
  '/verify',
  validate(verifyCardSchema),
  savedCardsController.verifyCard,
);

// GET /api/saved-cards — list user's verified cards
savedCardsRouter.get(
  '/',
  savedCardsController.listCards,
);

// DELETE /api/saved-cards/:id — remove a saved card
savedCardsRouter.delete(
  '/:id',
  validate(cardParamsSchema),
  savedCardsController.removeCard,
);

// PUT /api/saved-cards/:id/default — set card as default
savedCardsRouter.put(
  '/:id/default',
  validate(cardParamsSchema),
  savedCardsController.setDefault,
);
