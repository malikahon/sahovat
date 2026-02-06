/**
 * Authentication routes
 * POST /api/auth/request-otp      - Request OTP for phone number
 * POST /api/auth/verify-otp       - Verify OTP and get tokens
 * POST /api/auth/refresh          - Refresh access token
 * POST /api/auth/logout           - Logout and invalidate tokens
 * POST /api/auth/verify-user-mock - Submit user verification request
 * GET  /api/auth/verify-status    - Check verification status
 */

import { Router } from 'express';
import { 
  requestOTP, 
  verifyOTPHandler, 
  refreshToken, 
  logout,
  submitVerification,
  getVerificationStatus,
} from '../controllers/auth';
import { requireAuth } from '../middlewares/auth';
import { uploadVerificationDocument } from '../middlewares/upload';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for OTP requests: max 5 requests per 15 minutes per IP
const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: 'Too many OTP requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for OTP verification: max 10 attempts per 15 minutes per IP
const verifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: 'Too many verification attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request OTP
router.post('/request-otp', otpRateLimiter, requestOTP);

// Verify OTP
router.post('/verify-otp', verifyRateLimiter, verifyOTPHandler);

// Refresh token
router.post('/refresh', refreshToken);

// Logout (requires authentication)
router.post('/logout', requireAuth, logout);

// Submit verification request (requires authentication)
router.post(
  '/verify-user-mock',
  requireAuth,
  uploadVerificationDocument.single('document'),
  submitVerification,
);

// Get verification status (requires authentication)
router.get('/verify-status', requireAuth, getVerificationStatus);

export default router;
