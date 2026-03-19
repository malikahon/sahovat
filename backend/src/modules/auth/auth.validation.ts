import { z } from 'zod';
import { CampaignCategory } from '../../types/entities.js';

// ============================================================
// REQUEST OTP
// ============================================================

export const requestOtpSchema = {
  body: z.object({
    phone_number: z
      .string()
      .regex(/^\+998\d{9}$/, 'Phone number must be in +998XXXXXXXXX format'),
  }),
};

// ============================================================
// VERIFY OTP
// ============================================================

export const verifyOtpSchema = {
  body: z.object({
    phone_number: z
      .string()
      .regex(/^\+998\d{9}$/, 'Phone number must be in +998XXXXXXXXX format'),
    otp: z
      .string()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain only digits'),
  }),
};

// ============================================================
// REGISTER (complete profile — authenticated endpoint)
// ============================================================

const campaignCategoryValues = Object.values(CampaignCategory) as [string, ...string[]];

export const registerSchema = {
  body: z.object({
    display_name: z
      .string()
      .min(2, 'Display name must be at least 2 characters')
      .max(100, 'Display name must be at most 100 characters')
      .trim(),
    date_of_birth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
      .refine((val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) return false;
        // Verify the parsed date matches the input (catches invalid days like Feb 30)
        const [y, m, d] = val.split('-').map(Number) as [number, number, number];
        if (date.getUTCFullYear() !== y || date.getUTCMonth() + 1 !== m || date.getUTCDate() !== d) return false;
        const currentYear = new Date().getFullYear();
        return y >= 1900 && y <= currentYear;
      }, 'Date of birth must be a valid calendar date between 1900 and the current year')
      .optional(),
    gender: z
      .enum(['male', 'female'])
      .optional(),
    preferred_categories: z
      .array(z.enum(campaignCategoryValues))
      .max(7, 'Cannot select more than 7 categories')
      .optional(),
    language_preference: z
      .enum(['uz', 'ru', 'en'])
      .optional(),
  }),
};

// ============================================================
// ADMIN LOGIN
// ============================================================

export const adminLoginSchema = {
  body: z.object({
    phone_number: z
      .string()
      .regex(/^\+998\d{9}$/, 'Phone number must be in +998XXXXXXXXX format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
  }),
};

// ============================================================
// ADMIN VERIFY PASSWORD (after OTP login)
// ============================================================

export const adminVerifyPasswordSchema = {
  body: z.object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
  }),
};

// ============================================================
// SET PASSWORD (for campaign creators)
// ============================================================

export const setPasswordSchema = {
  body: z.object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
  }),
};

// ============================================================
// REFRESH TOKEN
// ============================================================

export const refreshTokenSchema = {
  body: z.object({
    refresh_token: z
      .string()
      .min(1, 'Refresh token is required'),
  }),
};
