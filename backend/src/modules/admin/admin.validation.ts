import { z } from 'zod';

// ============================================================
// QUERY SCHEMAS
// ============================================================

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  is_admin: z.enum(['true', 'false']).optional(),
  is_banned: z.enum(['true', 'false']).optional(),
  verification_status: z.enum(['none', 'pending', 'approved', 'rejected']).optional(),
});

export const campaignListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'pending_review', 'active', 'paused', 'completed', 'cancelled', 'frozen']).optional(),
  category: z.enum(['medical', 'education', 'emergency', 'community', 'creative', 'business', 'other']).optional(),
  search: z.string().optional(),
  is_verified: z.enum(['true', 'false']).optional(),
});

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action_type: z.string().optional(),
  target_type: z.enum(['campaign', 'user', 'withdrawal', 'settings']).optional(),
  admin_id: z.string().uuid().optional(),
  from_date: z.string().datetime({ offset: true }).optional(),
  to_date: z.string().datetime({ offset: true }).optional(),
});

// ============================================================
// BODY SCHEMAS
// ============================================================

export const toggleAdminSchema = z.object({
  is_admin: z.boolean(),
});

export const toggleBanSchema = z.object({
  is_banned: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const verifyCampaignSchema = z.object({
  verified: z.boolean(),
  admin_notes: z.string().max(1000).optional(),
});

export const campaignStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'frozen', 'cancelled']),
  admin_notes: z.string().max(1000).optional(),
});

export const updateSettingsSchema = z.object({
  master_card_number: z.string().regex(/^\d{16}$/, 'Card number must be 16 digits').optional(),
  master_card_holder_name: z.string().min(2).max(100).optional(),
  platform_fee_percentage: z.number().min(0).max(10).optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: 'At least one field must be provided' },
);

// ============================================================
// INFERRED TYPES
// ============================================================

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
export type ToggleAdminDto = z.infer<typeof toggleAdminSchema>;
export type ToggleBanDto = z.infer<typeof toggleBanSchema>;
export type VerifyCampaignDto = z.infer<typeof verifyCampaignSchema>;
export type CampaignStatusDto = z.infer<typeof campaignStatusSchema>;
export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
