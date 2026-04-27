import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import type { UpdateProfileDto } from '../../types/api.js';
import { env } from '../../config/env.js';
import { ValidationError } from '../../lib/errors.js';
import * as usersService from './users.service.js';

/**
 * GET /api/users/profile
 * Returns the authenticated user's full profile.
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  const user = await usersService.getProfile(authReq.user.id);

  res.status(200).json({
    success: true,
    data: { user },
  });
}

/**
 * PUT /api/users/profile
 * Updates the authenticated user's profile.
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const data = req.body as UpdateProfileDto;

  const user = await usersService.updateProfile(authReq.user.id, data);

  res.status(200).json({
    success: true,
    data: { user },
  });
}

/**
 * GET /api/users/oneid/initiate
 * Initiates OneID verification and returns the redirect URL.
 */
export async function initiateOneIdVerification(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  const result = await usersService.initiateOneIdVerification(authReq.user.id);

  res.status(200).json({
    success: true,
    data: { redirect_url: result.redirect_url },
  });
}

/**
 * GET /api/users/oneid/callback
 * Handles the OneID OAuth callback redirect.
 * No auth required — this is a redirect back from OneID.
 */
export async function handleOneIdCallback(req: Request, res: Response): Promise<void> {
  const code = req.query['code'] as string | undefined;
  const state = req.query['state'] as string | undefined;

  if (!code || !state) {
    throw new ValidationError('Missing code or state parameter');
  }

  await usersService.handleOneIdCallback(code, state);

  // Redirect to frontend profile page after verification
  res.redirect(`${env.FRONTEND_URL}/profile?verified=true`);
}

/**
 * POST /api/users/verification/document
 * Uploads a KYC verification document.
 * Expects multipart/form-data with fields:
 *   - document       (file, required)
 *   - document_type  (string: passport | national_id | drivers_license, required)
 *   - legal_first_name (string, required)
 *   - legal_last_name  (string, required)
 */
export async function uploadVerificationDocument(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  if (!req.file) {
    throw new ValidationError('No document file provided');
  }

  const { document_type, legal_first_name, legal_last_name } = req.body as {
    document_type?: string;
    legal_first_name?: string;
    legal_last_name?: string;
  };

  const validDocTypes = ['passport', 'national_id', 'drivers_license'];
  if (!document_type || !validDocTypes.includes(document_type)) {
    throw new ValidationError(
      `document_type must be one of: ${validDocTypes.join(', ')}`,
      'INVALID_DOCUMENT_TYPE',
    );
  }

  if (!legal_first_name?.trim()) {
    throw new ValidationError('legal_first_name is required', 'MISSING_LEGAL_NAME');
  }
  if (!legal_last_name?.trim()) {
    throw new ValidationError('legal_last_name is required', 'MISSING_LEGAL_NAME');
  }

  const result = await usersService.uploadVerificationDocument(
    authReq.user.id,
    req.file,
    document_type,
    legal_first_name.trim(),
    legal_last_name.trim(),
  );

  res.status(200).json({
    success: true,
    data: {
      file_url: result.file_url,
      document_id: result.document_id,
      ai_status: result.ai_status,
    },
  });
}

/**
 * GET /api/users/verification/documents
 * Lists the authenticated user's verification documents.
 */
export async function getVerificationDocuments(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  const documents = await usersService.getMyVerificationDocuments(authReq.user.id);

  res.status(200).json({
    success: true,
    data: { documents },
  });
}

/**
 * PATCH /api/users/me/email
 * Sets or replaces the current user's email. Resets verification.
 */
export async function updateEmail(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { email } = req.body as { email: string };

  const user = await usersService.updateEmail(authReq.user.id, email);

  res.status(200).json({
    success: true,
    data: { user },
  });
}

/**
 * POST /api/users/me/email/verify-request
 * Sends a 6-digit code to the user's email (10-minute TTL).
 */
export async function requestEmailVerification(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  await usersService.requestEmailVerification(authReq.user.id);

  res.status(200).json({
    success: true,
    message: 'Verification code sent. Check your inbox.',
  });
}

/**
 * POST /api/users/me/email/verify-confirm
 * Validates the 6-digit code and marks email_verified_at.
 */
export async function confirmEmailVerification(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { code } = req.body as { code: string };

  const user = await usersService.confirmEmailVerification(authReq.user.id, code);

  res.status(200).json({
    success: true,
    data: { user },
  });
}

/**
 * GET /api/users/me/notification-preferences
 * Returns the full preference grid (event × channel) for the user.
 */
export async function getNotificationPreferences(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const preferences = await usersService.getNotificationPreferences(authReq.user.id);
  res.status(200).json({
    success: true,
    data: { preferences },
  });
}

/**
 * PUT /api/users/me/notification-preferences
 * Bulk-updates preferences. Body: { updates: { event_type, channel, enabled }[] }
 */
export async function updateNotificationPreferences(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { updates } = req.body as {
    updates: {
      event_type: import('../../types/entities.js').NotificationEventType;
      channel: import('../../types/entities.js').NotificationChannel;
      enabled: boolean;
    }[];
  };
  const preferences = await usersService.updateNotificationPreferences(
    authReq.user.id,
    updates,
  );
  res.status(200).json({
    success: true,
    data: { preferences },
  });
}
