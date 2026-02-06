/**
 * Authentication controller
 * Handles OTP request, verification, token refresh, and logout
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { query } from '../config/database';
import { validateUzbekPhoneNumber } from '../utils/phone';
import { generateOTP, storeOTP, verifyOTP, isOTPLocked, incrementOTPAttempts, clearOTPAttempts } from '../utils/otp';
import { generateTokenPair, verifyRefreshToken, storeRefreshToken, removeRefreshToken, isRefreshTokenValid } from '../utils/jwt';
import { sendOTP } from '../utils/sms';
import { AppError } from '../middlewares/errorHandler';

/**
 * POST /api/auth/request-otp
 * Request an OTP for the given phone number
 * Creates user record if it doesn't exist
 */
export async function requestOTP(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      throw new AppError('Phone number is required', 400);
    }

    // Validate phone number
    const validation = validateUzbekPhoneNumber(phone_number);
    if (!validation.valid || !validation.formatted) {
      throw new AppError(validation.error || 'Invalid phone number', 400);
    }

    const formattedPhone = validation.formatted;

    // Check if phone is locked due to too many attempts
    const locked = await isOTPLocked(formattedPhone);
    if (locked) {
      throw new AppError('Too many OTP attempts. Please try again in 15 minutes.', 429);
    }

    // Generate and store OTP
    const otp = generateOTP();
    await storeOTP(formattedPhone, otp);

    // Send OTP via SMS (mock in development)
    const smsResult = await sendOTP(formattedPhone, otp);
    if (!smsResult.success) {
      throw new AppError('Failed to send OTP. Please try again.', 500);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone_number: formattedPhone,
        expires_in: 300, // 5 minutes
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/verify-otp
 * Verify OTP and return JWT tokens
 * Creates user if first-time login
 */
export async function verifyOTPHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      throw new AppError('Phone number and OTP are required', 400);
    }

    // Validate phone number
    const validation = validateUzbekPhoneNumber(phone_number);
    if (!validation.valid || !validation.formatted) {
      throw new AppError(validation.error || 'Invalid phone number', 400);
    }

    const formattedPhone = validation.formatted;

    // Check if locked
    const locked = await isOTPLocked(formattedPhone);
    if (locked) {
      throw new AppError('Too many OTP attempts. Please try again in 15 minutes.', 429);
    }

    // Verify OTP
    const isValid = await verifyOTP(formattedPhone, otp);
    if (!isValid) {
      await incrementOTPAttempts(formattedPhone);
      throw new AppError('Invalid or expired OTP', 401);
    }

    // Clear OTP attempts on success
    await clearOTPAttempts(formattedPhone);

    // Find or create user
    let userResult = await query(
      'SELECT * FROM users WHERE phone_number = $1',
      [formattedPhone],
    );

    let isNewUser = false;

    if (userResult.rows.length === 0) {
      // Create new user
      userResult = await query(
        `INSERT INTO users (phone_number, display_name, language_preference)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [formattedPhone, null, 'uz'],
      );
      isNewUser = true;
    }

    const user = userResult.rows[0];

    // Generate token pair
    const tokens = generateTokenPair({
      userId: user.id,
      isAdmin: user.is_admin,
    });

    // Store refresh token in Redis
    await storeRefreshToken(user.id, tokens.refreshToken);

    res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created and logged in' : 'Logged in successfully',
      data: {
        user: {
          id: user.id,
          phone_number: user.phone_number,
          display_name: user.display_name,
          is_verified: user.is_verified,
          is_admin: user.is_admin,
          verification_status: user.verification_status,
          language_preference: user.language_preference,
        },
        tokens: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        },
        is_new_user: isNewUser,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new AppError('Refresh token is required', 400);
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refresh_token);

    // Check if refresh token is still valid in Redis
    const isValid = await isRefreshTokenValid(payload.userId, refresh_token);
    if (!isValid) {
      throw new AppError('Refresh token has been revoked', 401);
    }

    // Fetch user to get current admin status
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [payload.userId],
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = userResult.rows[0];

    // Generate new token pair
    const tokens = generateTokenPair({
      userId: user.id,
      isAdmin: user.is_admin,
    });

    // Store new refresh token (replaces old one)
    await storeRefreshToken(user.id, tokens.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Logout user by invalidating refresh token
 */
export async function logout(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Remove refresh token from Redis
    await removeRefreshToken(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}
