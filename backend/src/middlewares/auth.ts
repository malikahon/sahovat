/**
 * Authentication middleware
 * Handles token verification, user authentication, and authorization checks
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, User } from '../types';
import { query } from '../config/database';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from './errorHandler';

/**
 * Middleware to require authentication
 * Extracts bearer token from Authorization header, verifies it,
 * fetches user from database, and attaches to request object
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authorization token provided', 401);
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    // Verify access token
    const payload = verifyAccessToken(token);

    // Fetch user from database
    const result = await query('SELECT * FROM users WHERE id = $1', [payload.userId]);

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    // Attach user to request
    req.user = result.rows[0] as User;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Authentication failed', 401));
    }
  }
}

/**
 * Middleware to require verified user status
 * Must be used after requireAuth middleware
 * Checks if user is verified (is_verified = true) and has approved verification status
 */
export function requireVerified(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new AppError('User not authenticated', 401));
    return;
  }

  if (!req.user.is_verified || req.user.verification_status !== 'approved') {
    next(new AppError('User verification required', 403));
    return;
  }

  next();
}

/**
 * Middleware to require admin privileges
 * Must be used after requireAuth middleware
 * Checks if user has admin status
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(new AppError('User not authenticated', 401));
    return;
  }

  if (!req.user.is_admin) {
    next(new AppError('Admin privileges required', 403));
    return;
  }

  next();
}
