import { z } from 'zod';
import { CampaignCategory } from '../../types/entities.js';

const campaignCategoryValues = Object.values(CampaignCategory) as [string, ...string[]];

// Reusable email field — trimmed + lowercased + RFC-validated.
const emailField = z
  .string()
  .trim()
  .transform((v) => v.toLowerCase())
  .pipe(z.string().email('Invalid email address'));

// ============================================================
// UPDATE PROFILE
// ============================================================

export const updateProfileSchema = {
  body: z.object({
    display_name: z
      .string()
      .min(2, 'Display name must be at least 2 characters')
      .max(100, 'Display name must be at most 100 characters')
      .trim()
      .optional(),
    date_of_birth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
      .refine((val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) return false;
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
// UPLOAD VERIFICATION DOCUMENT
// ============================================================

export const uploadVerificationDocSchema = {
  // File comes from multer — no body validation needed
};

// ============================================================
// EMAIL — UPDATE / VERIFY
// ============================================================

/**
 * PATCH /api/users/me/email
 * Sets or replaces the user's email. Always clears email_verified_at.
 */
export const updateEmailSchema = {
  body: z.object({
    email: emailField,
  }),
};

/**
 * POST /api/users/me/email/verify-confirm
 * Submits the 6-digit code sent to the user's email.
 */
export const verifyEmailConfirmSchema = {
  body: z.object({
    code: z
      .string()
      .length(6, 'Code must be exactly 6 digits')
      .regex(/^\d{6}$/, 'Code must contain only digits'),
  }),
};

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================

const NOTIFICATION_EVENT_VALUES = [
  'donation_completed',
  'campaign_verified',
  'withdrawal_status_changed',
  'recurring_charge_succeeded',
  'recurring_charge_failed',
  'campaign_milestone_reached',
  'contact_message_received',
] as const;

const NOTIFICATION_CHANNEL_VALUES = ['sms', 'telegram', 'email'] as const;

/**
 * PUT /api/users/me/notification-preferences
 * Bulk update; body.updates is at most events*channels = 21 items.
 */
export const updateNotificationPreferencesSchema = {
  body: z.object({
    updates: z
      .array(
        z.object({
          event_type: z.enum(NOTIFICATION_EVENT_VALUES),
          channel: z.enum(NOTIFICATION_CHANNEL_VALUES),
          enabled: z.boolean(),
        }),
      )
      .min(1, 'updates must contain at least one entry')
      .max(50, 'too many updates in one request'),
  }),
};
