import { z } from 'zod';
import { CampaignCategory, CampaignStatus, UzbekRegion, DocumentType } from '../../types/entities.js';

// ============================================================
// PARAMS
// ============================================================

export const campaignParamsSchema = {
  params: z.object({
    id: z.string().uuid('Invalid campaign ID'),
  }),
};

export const documentParamsSchema = {
  params: z.object({
    id: z.string().uuid('Invalid campaign ID'),
    docId: z.string().uuid('Invalid document ID'),
  }),
};

// ============================================================
// CREATE CAMPAIGN
// ============================================================

export const createCampaignSchema = {
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be at most 200 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters').max(10000, 'Description must be at most 10000 characters'),
    category: z.nativeEnum(CampaignCategory, { message: 'Invalid campaign category' }),
    goal_amount: z.number().int().positive('Goal amount must be positive').max(10_000_000_000, 'Goal amount too large'),
    region: z.nativeEnum(UzbekRegion, { message: 'Invalid region' }).optional(),
    end_date: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD format')
      .refine(
        (val) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return new Date(val) >= today;
        },
        'End date must be today or in the future',
      )
      .optional(),
  }),
};

// ============================================================
// UPDATE CAMPAIGN
// ============================================================

export const updateCampaignSchema = {
  params: z.object({
    id: z.string().uuid('Invalid campaign ID'),
  }),
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(10).max(10000).optional(),
    category: z.nativeEnum(CampaignCategory).optional(),
    goal_amount: z.number().int().positive().max(10_000_000_000).optional(),
    region: z.nativeEnum(UzbekRegion).nullable().optional(),
    end_date: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD format')
      .refine(
        (val) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return new Date(val) >= today;
        },
        'End date must be today or in the future',
      )
      .nullable()
      .optional(),
  }),
};

// ============================================================
// CAMPAIGN LIST QUERY
// ============================================================

export const campaignListQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    category: z.nativeEnum(CampaignCategory).optional(),
    status: z.nativeEnum(CampaignStatus).optional(),
    region: z.nativeEnum(UzbekRegion).optional(),
    search: z.string().max(200).optional(),
    sort_by: z.enum(['created_at', 'goal_amount', 'current_amount', 'end_date', 'urgency']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
    creator_id: z.string().uuid().optional(),
  }),
};

// ============================================================
// DOCUMENT UPLOAD
// ============================================================

export const uploadDocumentSchema = {
  params: z.object({
    id: z.string().uuid('Invalid campaign ID'),
  }),
  body: z.object({
    document_type: z.nativeEnum(DocumentType, { message: 'Invalid document type' }),
    notes: z.string().max(500).optional(),
    is_private: z.preprocess(
      (val) => val === 'true' || val === true,
      z.boolean().default(false),
    ),
  }),
};

// ============================================================
// SUBMIT CAMPAIGN
// ============================================================

export const submitCampaignSchema = {
  params: z.object({
    id: z.string().uuid('Invalid campaign ID'),
  }),
};
