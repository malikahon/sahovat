import { query } from '../../config/database.js';
import { encrypt, decrypt } from '../../lib/encryption.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors.js';
import { getTotalEscrow, getPlatformRevenue } from '../donations/ledger.service.js';
import type { AdminDashboardStats } from '../../types/api.js';
import type {
  AdminUserRow,
  AdminCampaignRow,
  AdminActionRow,
  AdminSettingsRow,
} from './admin.types.js';
import type {
  UserListQuery,
  CampaignListQuery,
  AuditLogQuery,
  ToggleAdminDto,
  ToggleBanDto,
  VerifyCampaignDto,
  CampaignStatusDto,
  UpdateSettingsDto,
} from './admin.validation.js';

// ============================================================
// HELPERS
// ============================================================

/** Mask a 16-digit card number: "8600 **** **** 1234" */
function maskCardNumber(plain: string): string {
  if (plain.length < 8) return '****';
  const first4 = plain.slice(0, 4);
  const last4 = plain.slice(-4);
  return `${first4} **** **** ${last4}`;
}

// ============================================================
// AUDIT LOG HELPER
// ============================================================

/**
 * Insert a row into admin_actions. Called at the end of every
 * admin mutation so the audit trail is always complete.
 */
export async function logAdminAction(
  adminId: string,
  actionType: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  await query(
    `INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [adminId, actionType, targetType, targetId, JSON.stringify(details)],
  );
}

// ============================================================
// 8.3 — DASHBOARD STATS
// ============================================================

export async function getDashboardStats(): Promise<AdminDashboardStats> {
  const [statsResult, escrow, fees] = await Promise.all([
    query(`
      SELECT
        (SELECT COUNT(*)::int FROM users)                                        AS total_users,
        (SELECT COUNT(*)::int FROM campaigns)                                    AS total_campaigns,
        (SELECT COUNT(*)::int FROM campaigns WHERE status = 'active')            AS active_campaigns,
        (SELECT COALESCE(SUM(amount), 0) FROM donations WHERE status = 'completed') AS total_donations_amount,
        (SELECT COUNT(*)::int FROM donations WHERE status = 'completed')         AS total_donations_count,
        (SELECT COALESCE(SUM(net_amount), 0) FROM withdrawals WHERE status IN ('approved','completed')) AS total_withdrawals_amount,
        (SELECT COUNT(*)::int FROM withdrawals WHERE status = 'pending')         AS pending_withdrawals_count,
        (SELECT COUNT(*)::int FROM campaigns WHERE status = 'pending_review')    AS pending_campaigns_count
    `),
    getTotalEscrow(),
    getPlatformRevenue(),
  ]);

  const row = statsResult.rows[0] as {
    total_users: number;
    total_campaigns: number;
    active_campaigns: number;
    total_donations_amount: string;
    total_donations_count: number;
    total_withdrawals_amount: string;
    pending_withdrawals_count: number;
    pending_campaigns_count: number;
  };

  return {
    total_users: row.total_users,
    total_campaigns: row.total_campaigns,
    active_campaigns: row.active_campaigns,
    total_donations_amount: Number(row.total_donations_amount),
    total_donations_count: row.total_donations_count,
    total_withdrawals_amount: Number(row.total_withdrawals_amount),
    pending_withdrawals_count: row.pending_withdrawals_count,
    pending_campaigns_count: row.pending_campaigns_count,
    total_platform_fees: fees.total,
    total_escrow_balance: escrow.total_escrow,
  };
}

// ============================================================
// 8.1 — USER MANAGEMENT
// ============================================================

export async function listUsers(query_params: UserListQuery) {
  const { page, limit, search, is_admin, is_banned, verification_status } = query_params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (search) {
    conditions.push(`(u.phone_number ILIKE $${idx} OR u.display_name ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (is_admin !== undefined) {
    conditions.push(`u.is_admin = $${idx}`);
    params.push(is_admin === 'true');
    idx++;
  }
  if (is_banned !== undefined) {
    conditions.push(`u.is_banned = $${idx}`);
    params.push(is_banned === 'true');
    idx++;
  }
  if (verification_status) {
    conditions.push(`u.verification_status = $${idx}`);
    params.push(verification_status);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM users u ${where}`,
    params,
  );
  const total = (countResult.rows[0] as { total: number }).total;

  const rows = await query(
    `SELECT
       u.id, u.phone_number, u.display_name,
       u.is_verified, u.is_admin, u.is_banned,
       u.verification_status, u.preferred_categories,
       u.language_preference, u.created_at, u.updated_at,
       COUNT(DISTINCT c.id)::text             AS campaign_count,
       COALESCE(SUM(CASE WHEN d.status = 'completed' THEN d.amount ELSE 0 END), 0)::text AS total_donated
     FROM users u
     LEFT JOIN campaigns c ON c.creator_id = u.id
     LEFT JOIN donations d ON d.donor_id = u.id
     ${where}
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset],
  );

  const users = (rows.rows as AdminUserRow[]).map((u) => ({
    id: u.id,
    phone_number: u.phone_number,
    display_name: u.display_name,
    is_verified: u.is_verified,
    is_admin: u.is_admin,
    is_banned: u.is_banned,
    verification_status: u.verification_status,
    preferred_categories: u.preferred_categories,
    language_preference: u.language_preference,
    created_at: u.created_at,
    updated_at: u.updated_at,
    campaign_count: Number(u.campaign_count),
    total_donated: Number(u.total_donated),
  }));

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

export async function getUserDetails(userId: string) {
  const result = await query(
    `SELECT
       u.id, u.phone_number, u.display_name,
       u.is_verified, u.is_admin, u.is_banned,
       u.verification_status, u.preferred_categories,
       u.language_preference, u.date_of_birth, u.gender,
       u.oneid_id, u.oneid_verified_at,
       u.created_at, u.updated_at,
       COUNT(DISTINCT c.id)::text                                              AS campaign_count,
       COALESCE(SUM(CASE WHEN d.status = 'completed' THEN d.amount ELSE 0 END), 0)::text AS total_donated,
       COUNT(DISTINCT CASE WHEN d.status = 'completed' THEN d.id END)::text   AS donation_count
     FROM users u
     LEFT JOIN campaigns c ON c.creator_id = u.id
     LEFT JOIN donations d ON d.donor_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User', userId);
  }

  const u = result.rows[0] as AdminUserRow & {
    date_of_birth: string | null;
    gender: string | null;
    oneid_id: string | null;
    oneid_verified_at: string | null;
    donation_count: string;
  };

  return {
    id: u.id,
    phone_number: u.phone_number,
    display_name: u.display_name,
    date_of_birth: u.date_of_birth,
    gender: u.gender,
    is_verified: u.is_verified,
    is_admin: u.is_admin,
    is_banned: u.is_banned,
    verification_status: u.verification_status,
    preferred_categories: u.preferred_categories,
    language_preference: u.language_preference,
    oneid_id: u.oneid_id,
    oneid_verified_at: u.oneid_verified_at,
    created_at: u.created_at,
    updated_at: u.updated_at,
    campaign_count: Number(u.campaign_count),
    total_donated: Number(u.total_donated),
    donation_count: Number(u.donation_count),
  };
}

export async function toggleAdmin(
  adminId: string,
  targetUserId: string,
  dto: ToggleAdminDto,
): Promise<void> {
  if (adminId === targetUserId) {
    throw new ForbiddenError('Admins cannot modify their own admin status', 'CANNOT_MODIFY_SELF');
  }

  const result = await query(
    `UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id`,
    [dto.is_admin, targetUserId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User', targetUserId);
  }

  await logAdminAction(
    adminId,
    dto.is_admin ? 'make_admin' : 'revoke_admin',
    'user',
    targetUserId,
    { is_admin: dto.is_admin },
  );
}

export async function toggleBan(
  adminId: string,
  targetUserId: string,
  dto: ToggleBanDto,
): Promise<void> {
  if (adminId === targetUserId) {
    throw new ForbiddenError('Admins cannot ban themselves', 'CANNOT_MODIFY_SELF');
  }

  const result = await query(
    `UPDATE users SET is_banned = $1 WHERE id = $2 RETURNING id, is_admin`,
    [dto.is_banned, targetUserId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User', targetUserId);
  }

  const target = result.rows[0] as { is_admin: boolean };
  if (target.is_admin && dto.is_banned) {
    throw new ForbiddenError('Cannot ban an admin user. Revoke admin status first.', 'CANNOT_BAN_ADMIN');
  }

  await logAdminAction(
    adminId,
    dto.is_banned ? 'ban_user' : 'unban_user',
    'user',
    targetUserId,
    { is_banned: dto.is_banned, reason: dto.reason },
  );
}

// ============================================================
// 8.2 — CAMPAIGN MANAGEMENT
// ============================================================

export async function listCampaignsAdmin(query_params: CampaignListQuery) {
  const { page, limit, status, category, search, is_verified } = query_params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (status) {
    conditions.push(`c.status = $${idx}`);
    params.push(status);
    idx++;
  }
  if (category) {
    conditions.push(`c.category = $${idx}`);
    params.push(category);
    idx++;
  }
  if (search) {
    conditions.push(`c.title ILIKE $${idx}`);
    params.push(`%${search}%`);
    idx++;
  }
  if (is_verified !== undefined) {
    conditions.push(`c.is_verified = $${idx}`);
    params.push(is_verified === 'true');
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM campaigns c ${where}`,
    params,
  );
  const total = (countResult.rows[0] as { total: number }).total;

  const rows = await query(
    `SELECT
       c.id, c.creator_id, c.title, c.description, c.category,
       c.goal_amount, c.current_amount, c.status, c.region,
       c.is_verified, c.end_date, c.cover_image_url,
       c.created_at, c.updated_at,
       u.display_name AS creator_display_name,
       u.phone_number AS creator_phone,
       COUNT(DISTINCT d.id)::text  AS donor_count,
       COUNT(DISTINCT cd.id)::text AS document_count
     FROM campaigns c
     JOIN users u ON u.id = c.creator_id
     LEFT JOIN donations d ON d.campaign_id = c.id AND d.status = 'completed'
     LEFT JOIN campaign_documents cd ON cd.campaign_id = c.id
     ${where}
     GROUP BY c.id, u.display_name, u.phone_number
     ORDER BY c.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset],
  );

  const campaigns = (rows.rows as AdminCampaignRow[]).map((c) => ({
    id: c.id,
    creator_id: c.creator_id,
    title: c.title,
    description: c.description,
    category: c.category,
    goal_amount: Number(c.goal_amount),
    current_amount: Number(c.current_amount),
    status: c.status,
    region: c.region,
    is_verified: c.is_verified,
    end_date: c.end_date,
    cover_image_url: c.cover_image_url,
    created_at: c.created_at,
    updated_at: c.updated_at,
    creator_display_name: c.creator_display_name,
    creator_phone: c.creator_phone,
    donor_count: Number(c.donor_count),
    document_count: Number(c.document_count),
  }));

  return {
    campaigns,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

export async function getCampaignAdmin(campaignId: string) {
  const [campaignResult, docsResult] = await Promise.all([
    query(
      `SELECT
         c.id, c.creator_id, c.title, c.description, c.category,
         c.goal_amount, c.current_amount, c.status, c.region,
         c.is_verified, c.end_date, c.cover_image_url,
         c.created_at, c.updated_at,
         u.display_name AS creator_display_name,
         u.phone_number AS creator_phone,
         u.verification_status AS creator_verification_status,
         COUNT(DISTINCT d.id)::text  AS donor_count,
         COUNT(DISTINCT cd.id)::text AS document_count
       FROM campaigns c
       JOIN users u ON u.id = c.creator_id
       LEFT JOIN donations d ON d.campaign_id = c.id AND d.status = 'completed'
       LEFT JOIN campaign_documents cd ON cd.campaign_id = c.id
       WHERE c.id = $1
       GROUP BY c.id, u.display_name, u.phone_number, u.verification_status`,
      [campaignId],
    ),
    query(
      `SELECT id, document_type, file_url, file_name, file_size, mime_type, is_private, notes, uploaded_at
       FROM campaign_documents
       WHERE campaign_id = $1
       ORDER BY uploaded_at`,
      [campaignId],
    ),
  ]);

  if (campaignResult.rows.length === 0) {
    throw new NotFoundError('Campaign', campaignId);
  }

  const c = campaignResult.rows[0] as AdminCampaignRow & {
    creator_verification_status: string;
  };

  return {
    id: c.id,
    creator_id: c.creator_id,
    title: c.title,
    description: c.description,
    category: c.category,
    goal_amount: Number(c.goal_amount),
    current_amount: Number(c.current_amount),
    status: c.status,
    region: c.region,
    is_verified: c.is_verified,
    end_date: c.end_date,
    cover_image_url: c.cover_image_url,
    created_at: c.created_at,
    updated_at: c.updated_at,
    creator_display_name: c.creator_display_name,
    creator_phone: c.creator_phone,
    creator_verification_status: c.creator_verification_status,
    donor_count: Number(c.donor_count),
    document_count: Number(c.document_count),
    documents: docsResult.rows,
  };
}

export async function verifyCampaign(
  adminId: string,
  campaignId: string,
  dto: VerifyCampaignDto,
): Promise<void> {
  // When verifying, campaign goes active + is_verified=true.
  // When rejecting, campaign goes back to draft + is_verified=false.
  const newStatus = dto.verified ? 'active' : 'draft';

  const result = await query(
    `UPDATE campaigns
     SET is_verified = $1, status = $2
     WHERE id = $3
     RETURNING id, status`,
    [dto.verified, newStatus, campaignId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Campaign', campaignId);
  }

  await logAdminAction(
    adminId,
    dto.verified ? 'verify_campaign' : 'reject_campaign',
    'campaign',
    campaignId,
    { verified: dto.verified, admin_notes: dto.admin_notes, new_status: newStatus },
  );
}

export async function updateCampaignStatus(
  adminId: string,
  campaignId: string,
  dto: CampaignStatusDto,
): Promise<void> {
  const result = await query(
    `UPDATE campaigns SET status = $1 WHERE id = $2 RETURNING id`,
    [dto.status, campaignId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Campaign', campaignId);
  }

  const actionType = dto.status === 'frozen' ? 'freeze_campaign'
    : dto.status === 'active' ? 'unfreeze_campaign'
    : `set_campaign_${dto.status}`;

  await logAdminAction(adminId, actionType, 'campaign', campaignId, {
    status: dto.status,
    admin_notes: dto.admin_notes,
  });
}

// ============================================================
// 8.4 — AUDIT LOG
// ============================================================

export async function getAuditLog(query_params: AuditLogQuery) {
  const { page, limit, action_type, target_type, admin_id, from_date, to_date } = query_params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (action_type) {
    conditions.push(`aa.action_type = $${idx}`);
    params.push(action_type);
    idx++;
  }
  if (target_type) {
    conditions.push(`aa.target_type = $${idx}`);
    params.push(target_type);
    idx++;
  }
  if (admin_id) {
    conditions.push(`aa.admin_id = $${idx}`);
    params.push(admin_id);
    idx++;
  }
  if (from_date) {
    conditions.push(`aa.created_at >= $${idx}`);
    params.push(from_date);
    idx++;
  }
  if (to_date) {
    conditions.push(`aa.created_at <= $${idx}`);
    params.push(to_date);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM admin_actions aa ${where}`,
    params,
  );
  const total = (countResult.rows[0] as { total: number }).total;

  const rows = await query(
    `SELECT
       aa.id, aa.admin_id, u.display_name AS admin_display_name,
       aa.action_type, aa.target_type, aa.target_id,
       aa.details, aa.created_at
     FROM admin_actions aa
     JOIN users u ON u.id = aa.admin_id
     ${where}
     ORDER BY aa.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset],
  );

  return {
    actions: rows.rows as AdminActionRow[],
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

// ============================================================
// 8.5 — ADMIN SETTINGS
// ============================================================

export async function getSettings() {
  const result = await query(
    `SELECT
       s.id, s.master_card_number_encrypted, s.master_card_holder_name,
       s.platform_fee_percentage, s.updated_at, s.updated_by,
       u.display_name AS updater_display_name
     FROM admin_settings s
     LEFT JOIN users u ON u.id = s.updated_by
     ORDER BY s.updated_at DESC
     LIMIT 1`,
  );

  if (result.rows.length === 0) {
    // Return safe defaults if no settings row exists
    return {
      id: null,
      master_card_number_masked: null,
      master_card_holder_name: '',
      platform_fee_percentage: 1,
      updated_at: null,
      updated_by: null,
      updater_display_name: null,
    };
  }

  const s = result.rows[0] as AdminSettingsRow;
  let masked: string | null = null;

  if (s.master_card_number_encrypted) {
    try {
      const plain = decrypt(s.master_card_number_encrypted);
      masked = maskCardNumber(plain);
    } catch {
      masked = '****';
    }
  }

  return {
    id: s.id,
    master_card_number_masked: masked,
    master_card_holder_name: s.master_card_holder_name,
    platform_fee_percentage: Number(s.platform_fee_percentage),
    updated_at: s.updated_at,
    updated_by: s.updated_by,
    updater_display_name: s.updater_display_name,
  };
}

// ============================================================
// 9.2 / 9.6 — CHART DATA & ESCROW
// ============================================================

/**
 * GET /api/admin/stats/donations-over-time
 * Returns daily aggregated donations for the last N days.
 */
export async function getDonationsOverTime(days: number = 30) {
  const result = await query(
    `SELECT
       DATE(completed_at)::text AS date,
       COUNT(*)::int             AS count,
       COALESCE(SUM(amount), 0)::text  AS amount
     FROM donations
     WHERE status = 'completed'
       AND completed_at >= NOW() - ($1 || ' days')::interval
     GROUP BY DATE(completed_at)
     ORDER BY DATE(completed_at) ASC`,
    [days],
  );

  return (result.rows as { date: string; count: number; amount: string }[]).map((r) => ({
    date: r.date,
    count: r.count,
    amount: Number(r.amount),
  }));
}

/**
 * GET /api/admin/stats/donations-by-category
 * Returns donation totals grouped by campaign category.
 */
export async function getDonationsByCategory() {
  const result = await query(
    `SELECT
       c.category,
       COUNT(d.id)::int             AS count,
       COALESCE(SUM(d.amount), 0)::text AS amount
     FROM donations d
     JOIN campaigns c ON c.id = d.campaign_id
     WHERE d.status = 'completed'
     GROUP BY c.category
     ORDER BY SUM(d.amount) DESC`,
  );

  return (result.rows as { category: string; count: number; amount: string }[]).map((r) => ({
    category: r.category,
    count: r.count,
    amount: Number(r.amount),
  }));
}

/**
 * GET /api/admin/escrow
 * Returns per-campaign balance breakdown for the escrow dashboard.
 */
export async function getEscrowSummary() {
  const [escrow, fees, campaignRows] = await Promise.all([
    getTotalEscrow(),
    getPlatformRevenue(),
    query(
      `SELECT
         c.id             AS campaign_id,
         c.title          AS campaign_title,
         COALESCE(SUM(CASE WHEN d.status = 'completed' THEN d.net_amount ELSE 0 END), 0)::text AS total_donated,
         COALESCE(SUM(CASE WHEN d.status = 'completed' THEN d.platform_fee ELSE 0 END), 0)::text AS total_fees,
         COALESCE(SUM(CASE WHEN w.status = 'completed' THEN w.net_amount ELSE 0 END), 0)::text AS total_withdrawn
       FROM campaigns c
       LEFT JOIN donations d ON d.campaign_id = c.id
       LEFT JOIN withdrawals w ON w.campaign_id = c.id
       GROUP BY c.id, c.title
       HAVING COALESCE(SUM(CASE WHEN d.status = 'completed' THEN d.net_amount ELSE 0 END), 0) > 0
       ORDER BY COALESCE(SUM(CASE WHEN d.status = 'completed' THEN d.net_amount ELSE 0 END), 0) DESC`,
    ),
  ]);

  const campaign_balances = (
    campaignRows.rows as {
      campaign_id: string;
      campaign_title: string;
      total_donated: string;
      total_fees: string;
      total_withdrawn: string;
    }[]
  ).map((r) => {
    const totalDonated = Number(r.total_donated);
    const totalWithdrawn = Number(r.total_withdrawn);
    return {
      campaign_id: r.campaign_id,
      campaign_title: r.campaign_title,
      total_donated: totalDonated,
      total_fees: Number(r.total_fees),
      total_withdrawn: totalWithdrawn,
      available_balance: totalDonated - totalWithdrawn,
    };
  });

  return {
    total_escrow_balance: escrow.total_escrow,
    total_platform_revenue: fees.total,
    total_withdrawn: escrow.total_withdrawn,
    campaign_balances,
  };
}

export async function updateSettings(adminId: string, dto: UpdateSettingsDto): Promise<void> {
  const existing = await query('SELECT id FROM admin_settings ORDER BY updated_at DESC LIMIT 1');

  const setClauses: string[] = ['updated_by = $1', 'updated_at = NOW()'];
  const params: unknown[] = [adminId];
  let idx = 2;
  const changes: Record<string, unknown> = {};

  if (dto.master_card_number !== undefined) {
    setClauses.push(`master_card_number_encrypted = $${idx}`);
    params.push(encrypt(dto.master_card_number));
    changes.master_card_updated = true;
    idx++;
  }
  if (dto.master_card_holder_name !== undefined) {
    setClauses.push(`master_card_holder_name = $${idx}`);
    params.push(dto.master_card_holder_name);
    changes.master_card_holder_name = dto.master_card_holder_name;
    idx++;
  }
  if (dto.platform_fee_percentage !== undefined) {
    if (dto.platform_fee_percentage < 0 || dto.platform_fee_percentage > 10) {
      throw new ValidationError('Platform fee must be between 0 and 10 percent', 'INVALID_FEE_RANGE');
    }
    setClauses.push(`platform_fee_percentage = $${idx}`);
    params.push(dto.platform_fee_percentage);
    changes.platform_fee_percentage = dto.platform_fee_percentage;
    idx++;
  }

  if (existing.rows.length > 0) {
    const settingsId = (existing.rows[0] as { id: string }).id;
    params.push(settingsId);
    await query(
      `UPDATE admin_settings SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      params,
    );
  } else {
    // No existing row — create one
    await query(
      `INSERT INTO admin_settings
         (master_card_number_encrypted, master_card_holder_name, platform_fee_percentage, updated_by)
       VALUES ($2, $3, $4, $1)`,
      [
        adminId,
        dto.master_card_number ? encrypt(dto.master_card_number) : '',
        dto.master_card_holder_name ?? '',
        dto.platform_fee_percentage ?? 1,
      ],
    );
  }

  // Invalidate ledger service fee cache (it will re-read on next call)
  // The cache in ledger.service.ts will expire naturally on its 5-min TTL.

  const settingsIdResult = await query(
    'SELECT id FROM admin_settings ORDER BY updated_at DESC LIMIT 1',
  );
  const settingsId = settingsIdResult.rows.length > 0
    ? (settingsIdResult.rows[0] as { id: string }).id
    : 'unknown';

  await logAdminAction(adminId, 'update_settings', 'settings', settingsId, changes);
}
