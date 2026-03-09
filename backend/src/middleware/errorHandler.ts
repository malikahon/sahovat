import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log all errors
  if (err instanceof AppError) {
    console.error(`[Sahovat] AppError [${err.code}]: ${err.message}`);
  } else {
    console.error('[Sahovat] Unhandled error:', err);
  }

  // Known operational error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
    });
    return;
  }

  // Unknown / programming error
  const message =
    env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message,
  });
}
