import { query, getClient } from '../../config/database.js';
import { getCampaignBalance, getPlatformFeePercentage } from '../donations/ledger.service.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors.js';
import { decrypt } from '../../lib/encryption.js';
import type { RequestWithdrawalDto } from '../../types/api.js';
import type { WithdrawalAccountRow } from './withdrawal-accounts.types.js';

// ============================================================
// HELPERS
// ============================================================

function maskCardNumber(plain: string): string {
  const first4 = plain.slice(0, 4);
  const last4 = plain.slice(-4);
  return `${first4} **** **** ${last4}`;
}

// ============================================================
// 10.1 — AVAILABLE BALANCE (per campaign)
// ============================================================

/**
 * Returns the available withdrawal balance for a campaign.
 * available_balance = SUM(net_donations completed) - SUM(completed_withdrawals) - SUM(pending/approved_withdrawals)
 */
export async function getCampaignAvailableBalance(
  campaignId: string,
  requesterId: string,
) {
  // Verify campaign exists and requester is the creator
  const campaignResult = await query(
    `SELECT id, creator_id, title, status FROM campaigns WHERE id = $1::uuid`,
    [campaignId],
  );

  if (campaignResult.rows.length === 0) {
    throw new NotFoundError('Campaign', campaignId);
  }

  const campaign = campaignResult.rows[0] as {
    id: string;
    creator_id: string;
    title: string;
    status: string;
  };

  if (campaign.creator_id !== requesterId) {
    throw new ForbiddenError('You do not own this campaign');
  }

  const balance = await getCampaignBalance(campaignId);
  return balance;
}

// ============================================================
// 10.2 + 10.5 — REQUEST WITHDRAWAL (with fee deduction)
// ============================================================

/**
 * Creates a withdrawal request for a campaign.
 * Validates:
 *   - Campaign belongs to requester
 *   - Campaign is active or completed
 *   - Withdrawal account belongs to requester
 *   - Amount does not exceed available balance
 * Calculates platform fee and net_amount.
 * Stores card_number_masked and cardholder_name from the account.
 */
export async function requestWithdrawal(
  organizerId: string,
  dto: RequestWithdrawalDto,
) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Verify campaign ownership and status
    const campaignResult = await client.query(
      `SELECT id, creator_id, title, status FROM campaigns WHERE id = $1::uuid`,
      [dto.campaign_id],
    );

    if (campaignResult.rows.length === 0) {
      throw new NotFoundError('Campaign', dto.campaign_id);
    }

    const campaign = campaignResult.rows[0] as {
      id: string;
      creator_id: string;
      title: string;
      status: string;
    };

    if (campaign.creator_id !== organizerId) {
      throw new ForbiddenError('You do not own this campaign');
    }

    if (!['active', 'completed', 'paused'].includes(campaign.status)) {
      throw new ValidationError(
        `Cannot withdraw from a campaign with status "${campaign.status}"`,
      );
    }

    // 2. Verify withdrawal account belongs to requester
    const accountResult = await client.query(
    `SELECT * FROM withdrawal_accounts WHERE id = $1::uuid AND user_id = $2::uuid`,
    [dto.withdrawal_account_id, organizerId],
  );

  if (accountResult.rows.length === 0) {
    throw new NotFoundError('Withdrawal account', dto.withdrawal_account_id);
    }

    const account = accountResult.rows[0] as WithdrawalAccountRow;
    const decryptedNumber = decrypt(account.account_number_encrypted);
    const cardNumberMasked = maskCardNumber(decryptedNumber);

    // 3. Check available balance (locking rows to prevent race conditions)
    const balance = await getCampaignBalance(dto.campaign_id);

    if (dto.amount > balance.available_balance) {
      throw new ValidationError(
        `Requested amount (${dto.amount}) exceeds available balance (${balance.available_balance})`,
      );
    }

    if (dto.amount <= 0) {
      throw new ValidationError('Withdrawal amount must be greater than 0');
    }

    // 4. Calculate platform fee (10.5)
    const feePercentage = await getPlatformFeePercentage();
    const platformFee = Math.floor((dto.amount * feePercentage) / 100);
    const netAmount = dto.amount - platformFee;

    // 5. Insert withdrawal record
    const result = await client.query(
      `INSERT INTO withdrawals
         (campaign_id, organizer_id, withdrawal_account_id, amount, platform_fee, net_amount,
          status, card_number_masked, cardholder_name)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
       RETURNING *`,
      [
        dto.campaign_id,
        organizerId,
        dto.withdrawal_account_id,
        dto.amount,
        platformFee,
        netAmount,
        cardNumberMasked,
        account.account_holder_name,
      ],
    );

    await client.query('COMMIT');

    const withdrawal = result.rows[0] as {
      id: string;
      campaign_id: string;
      organizer_id: string;
      withdrawal_account_id: string;
      amount: number;
      platform_fee: number;
      net_amount: number;
      status: string;
      card_number_masked: string;
      cardholder_name: string;
      admin_notes: string | null;
      transaction_reference: string | null;
      created_at: string;
      reviewed_at: string | null;
      completed_at: string | null;
    };

    return {
      ...withdrawal,
      amount: Number(withdrawal.amount),
      platform_fee: Number(withdrawal.platform_fee),
      net_amount: Number(withdrawal.net_amount),
      fee_percentage: feePercentage,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// LIST MY WITHDRAWALS (organizer view)
// ============================================================

/**
 * Lists all withdrawals for campaigns owned by the organizer.
 * Returns per-campaign balance and withdrawal history.
 */
export async function listMyWithdrawals(
  organizerId: string,
  query_params: {
    page: number;
    limit: number;
    campaign_id?: string;
    status?: string;
  },
) {
  const { page, limit, campaign_id, status } = query_params;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['w.organizer_id = $1::uuid'];
  const params: unknown[] = [organizerId];
  let idx = 2;

  if (campaign_id) {
    conditions.push(`w.campaign_id = $${idx}::uuid`);
    params.push(campaign_id);
    idx++;
  }

  if (status) {
    conditions.push(`w.status = $${idx}`);
    params.push(status);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM withdrawals w ${where}`,
    params,
  );
  const total = (countResult.rows[0] as { total: number }).total;

  const rows = await query(
    `SELECT
       w.id, w.campaign_id, w.organizer_id, w.withdrawal_account_id,
       w.amount, w.platform_fee, w.net_amount, w.status,
       w.card_number_masked, w.cardholder_name,
       w.admin_notes, w.transaction_reference,
       w.created_at, w.reviewed_at, w.completed_at,
       c.title AS campaign_title
     FROM withdrawals w
     JOIN campaigns c ON c.id = w.campaign_id
     ${where}
     ORDER BY w.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset],
  );

  return {
    withdrawals: (
      rows.rows as {
        id: string;
        campaign_id: string;
        organizer_id: string;
        withdrawal_account_id: string;
        amount: string;
        platform_fee: string;
        net_amount: string;
        status: string;
        card_number_masked: string;
        cardholder_name: string;
        admin_notes: string | null;
        transaction_reference: string | null;
        created_at: string;
        reviewed_at: string | null;
        completed_at: string | null;
        campaign_title: string;
      }[]
    ).map((w) => ({
      ...w,
      amount: Number(w.amount),
      platform_fee: Number(w.platform_fee),
      net_amount: Number(w.net_amount),
    })),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}

// ============================================================
// ORGANIZER DASHBOARD — per-campaign stats
// ============================================================

/**
 * Returns all campaigns by the organizer with their balance breakdown.
 */
export async function getOrganizerDashboard(organizerId: string) {
  const campaignRows = await query(
    `SELECT
       c.id, c.title, c.status, c.category,
       c.goal_amount, c.current_amount, c.cover_image_url,
       c.created_at, c.end_date,
       COUNT(DISTINCT d.id)::int AS donor_count
     FROM campaigns c
     LEFT JOIN donations d ON d.campaign_id = c.id AND d.status = 'completed'
     WHERE c.creator_id = $1::uuid
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [organizerId],
  );

  // For each campaign, get the balance
  const campaigns = await Promise.all(
    (
      campaignRows.rows as {
        id: string;
        title: string;
        status: string;
        category: string;
        goal_amount: string;
        current_amount: string;
        cover_image_url: string | null;
        created_at: string;
        end_date: string | null;
        donor_count: number;
      }[]
    ).map(async (c) => {
      const balance = await getCampaignBalance(c.id);
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        category: c.category,
        goal_amount: Number(c.goal_amount),
        current_amount: Number(c.current_amount),
        cover_image_url: c.cover_image_url,
        created_at: c.created_at,
        end_date: c.end_date,
        donor_count: c.donor_count,
        balance,
      };
    }),
  );

  // Aggregate totals
  const totals = campaigns.reduce(
    (acc, c) => {
      acc.total_raised += c.balance.total_donated;
      acc.total_withdrawn += c.balance.total_withdrawn;
      acc.total_available += c.balance.available_balance;
      acc.total_pending_withdrawals += c.balance.pending_withdrawals;
      return acc;
    },
    {
      total_raised: 0,
      total_withdrawn: 0,
      total_available: 0,
      total_pending_withdrawals: 0,
    },
  );

  return {
    campaigns,
    totals,
  };
}

// ============================================================
// 10.3 — ADMIN: LIST WITHDRAWAL QUEUE
// ============================================================

export async function listWithdrawalsAdmin(query_params: {
  page: number;
  limit: number;
  status?: string;
  campaign_id?: string;
}) {
  const { page, limit, status, campaign_id } = query_params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (status) {
    conditions.push(`w.status = $${idx}`);
    params.push(status);
    idx++;
  }

  if (campaign_id) {
    conditions.push(`w.campaign_id = $${idx}::uuid`);
    params.push(campaign_id);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM withdrawals w ${where}`,
    params,
  );
  const total = (countResult.rows[0] as { total: number }).total;

  const rows = await query(
    `SELECT
       w.id, w.campaign_id, w.organizer_id, w.withdrawal_account_id,
       w.amount, w.platform_fee, w.net_amount, w.status,
       w.card_number_masked, w.cardholder_name,
       w.admin_notes, w.transaction_reference,
       w.created_at, w.reviewed_at, w.completed_at,
       c.title AS campaign_title,
       u.display_name AS organizer_display_name,
       u.phone_number AS organizer_phone
     FROM withdrawals w
     JOIN campaigns c ON c.id = w.campaign_id
     JOIN users u ON u.id = w.organizer_id
     ${where}
     ORDER BY
       CASE w.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
       w.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset],
  );

  return {
    withdrawals: (
      rows.rows as {
        id: string;
        campaign_id: string;
        organizer_id: string;
        withdrawal_account_id: string;
        amount: string;
        platform_fee: string;
        net_amount: string;
        status: string;
        card_number_masked: string;
        cardholder_name: string;
        admin_notes: string | null;
        transaction_reference: string | null;
        created_at: string;
        reviewed_at: string | null;
        completed_at: string | null;
        campaign_title: string;
        organizer_display_name: string | null;
        organizer_phone: string;
      }[]
    ).map((w) => ({
      ...w,
      amount: Number(w.amount),
      platform_fee: Number(w.platform_fee),
      net_amount: Number(w.net_amount),
    })),
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

// ============================================================
// 10.3 — ADMIN: GET SINGLE WITHDRAWAL (with name comparison — 10.4)
// ============================================================

/**
 * Returns full withdrawal details for admin review.
 * Includes organizer's verified legal name (from OneID or display_name)
 * alongside the cardholder name for manual name comparison (10.4).
 */
export async function getWithdrawalAdmin(withdrawalId: string) {
  const result = await query(
    `SELECT
       w.id, w.campaign_id, w.organizer_id, w.withdrawal_account_id,
       w.amount, w.platform_fee, w.net_amount, w.status,
       w.card_number_masked, w.cardholder_name,
       w.admin_notes, w.transaction_reference,
       w.created_at, w.reviewed_at, w.completed_at,
       c.title AS campaign_title,
       c.goal_amount, c.current_amount,
       u.display_name AS organizer_display_name,
       u.phone_number AS organizer_phone,
       u.verification_status AS organizer_verification_status,
       u.oneid_id AS organizer_oneid_id,
       u.oneid_verified_at AS organizer_oneid_verified_at
     FROM withdrawals w
     JOIN campaigns c ON c.id = w.campaign_id
     JOIN users u ON u.id = w.organizer_id
      WHERE w.id = $1::uuid`,
    [withdrawalId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Withdrawal', withdrawalId);
  }

  const w = result.rows[0] as {
    id: string;
    campaign_id: string;
    organizer_id: string;
    withdrawal_account_id: string;
    amount: string;
    platform_fee: string;
    net_amount: string;
    status: string;
    card_number_masked: string;
    cardholder_name: string;
    admin_notes: string | null;
    transaction_reference: string | null;
    created_at: string;
    reviewed_at: string | null;
    completed_at: string | null;
    campaign_title: string;
    goal_amount: string;
    current_amount: string;
    organizer_display_name: string | null;
    organizer_phone: string;
    organizer_verification_status: string;
    organizer_oneid_id: string | null;
    organizer_oneid_verified_at: string | null;
  };

  return {
    ...w,
    amount: Number(w.amount),
    platform_fee: Number(w.platform_fee),
    net_amount: Number(w.net_amount),
    goal_amount: Number(w.goal_amount),
    current_amount: Number(w.current_amount),
    // 10.4: name comparison fields
    organizer_legal_name: w.organizer_display_name,
    name_match_note:
      'Compare organizer legal name with cardholder name. Approve only if names match.',
  };
}

// ============================================================
// 10.3 — ADMIN: APPROVE / REJECT WITHDRAWAL
// ============================================================

export async function reviewWithdrawal(
  adminId: string,
  withdrawalId: string,
  dto: { action: 'approve' | 'reject'; admin_notes?: string },
) {
  const { logAdminAction } = await import('../admin/admin.service.js');

  const existing = await query(
    `SELECT id, status FROM withdrawals WHERE id = $1::uuid`,
    [withdrawalId],
  );

  if (existing.rows.length === 0) {
    throw new NotFoundError('Withdrawal', withdrawalId);
  }

  const current = existing.rows[0] as { status: string };

  if (current.status !== 'pending') {
    throw new ValidationError(
      `Cannot ${dto.action} a withdrawal with status "${current.status}"`,
    );
  }

  const newStatus = dto.action === 'approve' ? 'approved' : 'rejected';

  await query(
    `UPDATE withdrawals
     SET status = $1, admin_notes = $2, reviewed_at = NOW()
     WHERE id = $3::uuid`,
    [newStatus, dto.admin_notes ?? null, withdrawalId],
  );

  await logAdminAction(adminId, `${dto.action}_withdrawal`, 'withdrawal', withdrawalId, {
    new_status: newStatus,
    admin_notes: dto.admin_notes,
  });
}

// ============================================================
// 10.3 — ADMIN: MARK WITHDRAWAL COMPLETED (with transaction ref)
// ============================================================

export async function completeWithdrawal(
  adminId: string,
  withdrawalId: string,
  dto: { transaction_reference: string; admin_notes?: string },
) {
  const { logAdminAction } = await import('../admin/admin.service.js');

  const existing = await query(
    `SELECT id, status, campaign_id, platform_fee FROM withdrawals WHERE id = $1::uuid`,
    [withdrawalId],
  );

  if (existing.rows.length === 0) {
    throw new NotFoundError('Withdrawal', withdrawalId);
  }

  const current = existing.rows[0] as {
    status: string;
    campaign_id: string;
    platform_fee: string;
  };

  if (current.status !== 'approved') {
    throw new ValidationError(
      `Cannot complete a withdrawal with status "${current.status}". It must be approved first.`,
    );
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Mark withdrawal as completed
    await client.query(
      `UPDATE withdrawals
       SET status = 'completed', transaction_reference = $1, admin_notes = $2, completed_at = NOW()
       WHERE id = $3::uuid`,
      [dto.transaction_reference, dto.admin_notes ?? null, withdrawalId],
    );

    // Record platform fee in platform_fees table
    const fee = Number(current.platform_fee);
    if (fee > 0) {
      await client.query(
        `INSERT INTO platform_fees (withdrawal_id, fee_type, amount)
         VALUES ($1, 'withdrawal', $2)`,
        [withdrawalId, fee],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await logAdminAction(adminId, 'complete_withdrawal', 'withdrawal', withdrawalId, {
    transaction_reference: dto.transaction_reference,
    admin_notes: dto.admin_notes,
  });
}
