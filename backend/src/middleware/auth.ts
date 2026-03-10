import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { getUserById } from '../modules/auth/auth.service.js';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types/middleware.js';

/**
 * Extracts the Bearer token from the Authorization header.
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Requires a valid access token. Fetches the user from the database
 * and attaches it to `req.user` as an AuthenticatedUser.
 *
 * Throws UnauthorizedError if:
 * - No Authorization header or invalid format
 * - Token is invalid or expired
 * - User not found in database
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);

  if (!token) {
    throw new UnauthorizedError('Authentication required');
  }

  // Verify JWT — throws UnauthorizedError if invalid
  const payload = verifyAccessToken(token);

  // Fetch full user from DB to ensure they still exist and get fresh data
  const user = await getUserById(payload.userId);

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Attach AuthenticatedUser to request
  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    phone_number: user.phone_number,
    display_name: user.display_name,
    is_verified: user.is_verified,
    is_admin: user.is_admin,
    verification_status: user.verification_status,
  };

  (req as AuthenticatedRequest).user = authenticatedUser;

  next();
}

/**
 * Requires the authenticated user to have verification_status = 'approved'.
 * Must be used AFTER requireAuth.
 *
 * Throws ForbiddenError if the user is not verified.
 */
export async function requireVerified(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (authReq.user.verification_status !== 'approved') {
    throw new ForbiddenError('Account verification required');
  }

  next();
}

/**
 * Requires the authenticated user to be an admin (is_admin = true).
 * Must be used AFTER requireAuth.
 *
 * Throws ForbiddenError if the user is not an admin.
 */
export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!authReq.user.is_admin) {
    throw new ForbiddenError('Admin access required');
  }

  next();
}
