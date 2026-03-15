import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter, otpLimiter } from '../../middleware/rateLimiter.js';
import { env } from '../../config/env.js';
import { redis } from '../../config/redis.js';
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

// GET /api/auth/test-otp/:phone — Retrieve stored OTP (TEST ENVIRONMENT ONLY)
// Used by E2E tests to retrieve the OTP without real SMS delivery.
if (env.NODE_ENV === 'test') {
  authRouter.get('/test-otp/:phone', async (req, res, next) => {
    try {
      const phone = decodeURIComponent(req.params['phone'] ?? '');
      const otp = await redis.get(`otp:${phone}`);
      if (!otp) {
        res.status(404).json({ success: false, error: 'No OTP found for this phone' });
        return;
      }
      res.json({ success: true, otp });
    } catch (err) {
      next(err);
    }
  });
}
