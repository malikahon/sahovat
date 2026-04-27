import { z } from 'zod';
import { CampaignCategory } from '../../types/entities.js';

// ============================================================
// EMAIL HELPER (used by register + email update flows)
// ============================================================
//
// Pre-process: trim + lowercase so the DB always sees a normalized
// value. We then run zod's email check.
const emailField = z
  .string()
  .trim()
  .transform((v) => v.toLowerCase())
  .pipe(z.string().email('Invalid email address'));

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
    registration_token: z
      .string()
      .optional(),
    email: emailField.optional(),
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

// ============================================================
// TELEGRAM LOGIN / LINK
// ============================================================

/**
 * Telegram Login Widget callback payload.
 * Fields are validated minimally — the cryptographic check is the
 * source of truth.
 */
export const telegramAuthSchema = {
  body: z.object({
    id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    first_name: z.string().min(1),
    last_name: z.string().optional(),
    username: z.string().optional(),
    photo_url: z.string().optional(),
    auth_date: z.union([z.string(), z.number()]).transform((v) => String(v)),
    hash: z.string().min(1),
  }).passthrough(),
};
