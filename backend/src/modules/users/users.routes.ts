import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { uploadKycDocument } from '../../middleware/upload.js';
import { updateProfileSchema } from './users.validation.js';
import * as usersController from './users.controller.js';

export const usersRouter = Router();

// GET /api/users/profile — Get current user's profile
usersRouter.get(
  '/profile',
  requireAuth,
  usersController.getProfile,
);

// PUT /api/users/profile — Update current user's profile
usersRouter.put(
  '/profile',
  requireAuth,
  validate(updateProfileSchema),
  usersController.updateProfile,
);

// GET /api/users/oneid/initiate — Start OneID verification
usersRouter.get(
  '/oneid/initiate',
  requireAuth,
  usersController.initiateOneIdVerification,
);

// GET /api/users/oneid/callback — OneID redirect callback (no auth)
usersRouter.get(
  '/oneid/callback',
  usersController.handleOneIdCallback,
);

// POST /api/users/verification/document — Upload KYC document
usersRouter.post(
  '/verification/document',
  requireAuth,
  uploadKycDocument,
  usersController.uploadVerificationDocument,
);

// GET /api/users/verification/documents — List user's verification documents
usersRouter.get(
  '/verification/documents',
  requireAuth,
  usersController.getVerificationDocuments,
);
