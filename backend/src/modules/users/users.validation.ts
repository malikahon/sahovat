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
