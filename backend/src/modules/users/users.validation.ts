import { z } from 'zod';
import { CampaignCategory } from '../../types/entities.js';

const campaignCategoryValues = Object.values(CampaignCategory) as [string, ...string[]];

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
