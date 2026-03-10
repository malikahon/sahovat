import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter, otpLimiter } from '../../middleware/rateLimiter.js';
import {
  requestOtpSchema,
  verifyOtpSchema,
  registerSchema,
  adminLoginSchema,
  refreshTokenSchema,
} from './auth.validation.js';
import * as authController from './auth.controller.js';

export const authRouter = Router();

// POST /api/auth/request-otp — Send OTP to phone
authRouter.post(
  '/request-otp',
  otpLimiter,
  validate(requestOtpSchema),
  authController.requestOtp,
);

// POST /api/auth/verify-otp — Verify OTP, get tokens
authRouter.post(
  '/verify-otp',
  authLimiter,
  validate(verifyOtpSchema),
  authController.verifyOtp,
);

// POST /api/auth/register — Complete profile (authenticated)
authRouter.post(
  '/register',
  requireAuth,
  validate(registerSchema),
  authController.register,
);

// POST /api/auth/admin/login — Admin password login
authRouter.post(
  '/admin/login',
  authLimiter,
  validate(adminLoginSchema),
  authController.adminLogin,
);

// POST /api/auth/refresh — Refresh token pair
authRouter.post(
  '/refresh',
  authLimiter,
  validate(refreshTokenSchema),
  authController.refresh,
);

// POST /api/auth/logout — Revoke refresh token (authenticated)
authRouter.post(
  '/logout',
  requireAuth,
  authController.logout,
);

// GET /api/auth/me — Get current user (authenticated)
authRouter.get(
  '/me',
  requireAuth,
  authController.getMe,
);
