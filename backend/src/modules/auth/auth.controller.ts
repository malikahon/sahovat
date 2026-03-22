import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import type { RequestOtpDto, VerifyOtpDto, AdminLoginDto, RefreshTokenDto } from '../../types/api.js';
import * as authService from './auth.service.js';
import type { RegisterData } from './auth.service.js';
import { env } from '../../config/env.js';

/**
 * POST /api/auth/request-otp
 * Sends an OTP to the provided phone number.
 */
export async function requestOtp(req: Request, res: Response): Promise<void> {
  const { phone_number } = req.body as RequestOtpDto;

  const otp = await authService.requestOtp(phone_number);

  res.status(200).json({
    success: true,
    message: 'OTP sent successfully',
    ...(env.NODE_ENV !== 'production' && { dev_otp: otp }),
  });
}

/**
 * POST /api/auth/verify-otp
 * Verifies the OTP and returns auth tokens.
 * If the user is new (no display_name), is_new_user will be true.
 */
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { phone_number, otp } = req.body as VerifyOtpDto;

  const authResponse = await authService.verifyOtpAndLogin(phone_number, otp);

  res.status(200).json({
    success: true,
    data: authResponse,
  });
}

/**
 * POST /api/auth/register
 * Completes user registration (profile setup).
 * Accepts either an authenticated user OR a registration_token in the body.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const data = req.body as RegisterData;

  // userId may be null if not authenticated (new user with registration_token)
  const userId = authReq.user?.id ?? null;

  const result = await authService.register(userId, data);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      tokens: result.tokens,
    },
  });
}

/**
 * POST /api/auth/admin/login
 * Admin login with phone + password.
 */
export async function adminLogin(req: Request, res: Response): Promise<void> {
  const { phone_number, password } = req.body as AdminLoginDto;

  const authResponse = await authService.adminLogin(phone_number, password);

  res.status(200).json({
    success: true,
    data: authResponse,
  });
}

/**
 * POST /api/auth/admin/verify-password
 * Verifies admin password after OTP-based login. Requires authentication.
 */
export async function adminVerifyPassword(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { password } = req.body as { password: string };

  const user = await authService.verifyAdminPassword(authReq.user.id, password);

  res.status(200).json({
    success: true,
    data: { user },
  });
}

/**
 * POST /api/auth/refresh
 * Refreshes the access/refresh token pair.
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refresh_token } = req.body as RefreshTokenDto;

  const tokens = await authService.refreshTokens(refresh_token);

  res.status(200).json({
    success: true,
    data: { tokens },
  });
}

/**
 * POST /api/auth/logout
 * Revokes the user's refresh token. Requires authentication.
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  await authService.logout(authReq.user.id);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}

/**
 * POST /api/auth/set-password
 * Sets a password for the current user (required before creating campaigns).
 */
export async function setPassword(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;
  const { password } = req.body as { password: string };

  const user = await authService.setPassword(authReq.user.id, password);

  res.status(200).json({
    success: true,
    data: { user },
  });
}

/**
 * GET /api/auth/me
 * Returns the current authenticated user's data.
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  // Get full user data (not just the middleware subset)
  const user = await authService.getUserById(authReq.user.id);

  res.status(200).json({
    success: true,
    data: { user },
  });
}
