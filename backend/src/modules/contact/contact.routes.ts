import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { optionalAuth } from '../../middleware/auth.js';
import { submitContactSchema } from './contact.validation.js';
import * as contactController from './contact.controller.js';

export const contactRouter = Router();

/**
 * Per-IP rate limit for contact submissions. Tighter than the
 * generalLimiter — 5 submissions per 10 minutes is more than any
 * legitimate user needs and stops basic spam-script abuse.
 */
const contactSubmissionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many contact submissions. Please try again later.',
  },
});

contactRouter.post(
  '/',
  contactSubmissionLimiter,
  optionalAuth,
  validate(submitContactSchema),
  contactController.submitContactMessage,
);
