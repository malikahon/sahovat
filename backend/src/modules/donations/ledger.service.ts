import pg from 'pg';
import { query } from '../../config/database.js';
import type { CampaignBalance } from '../../types/api.js';

/** A queryable interface that accepts both pool.query and client.query */
type Queryable = {
  query(text: string, params?: unknown[]): Promise<pg.QueryResult>;
};

// ============================================================
// PLATFORM FEE CACHE
// ============================================================

let cachedFeePercentage: number | null = null;
let feePercentageCachedAt = 0;
const FEE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Invalidate the cached fee percentage so the next read hits the DB. */
export function invalidateFeeCache(): void {
  cachedFeePercentage = null;
  feePercentageCachedAt = 0;
}

// ============================================================
// GET CAMPAIGN BALANCE
// ============================================================

/**
 * Calculate the full balance breakdown for a single campaign.
 *
 * Uses a single SQL query with subqueries against the `donations`
 * and `withdrawals` tables so every field is computed in one round-trip.
 */
export async function getCampaignBalance(
  campaignId: string,
  client?: Queryable,
): Promise<CampaignBalance> {
  const db = client ?? { query: (text: string, params?: unknown[]) => query(text, params) };
  const result = await db.query(
    `SELECT
       $1::text                                             AS campaign_id,
       COALESCE((
         SELECT SUM(net_amount)
         FROM donations
         WHERE campaign_id = $1::uuid AND status = 'completed'
       ), 0)                                                AS total_donated,
       COALESCE((
         SELECT SUM(net_amount)
         FROM withdrawals
         WHERE campaign_id = $1::uuid AND status = 'completed'
       ), 0)                                                AS total_withdrawn,
       COALESCE((
         SELECT SUM(platform_fee)
         FROM donations
         WHERE campaign_id = $1::uuid AND status = 'completed'
       ), 0)                                                AS total_fees,
       COALESCE((
         SELECT SUM(amount)
         FROM withdrawals
         WHERE campaign_id = $1::uuid AND status IN ('pending', 'approved')
       ), 0)                                                AS pending_withdrawals`,
    [campaignId],
  );

  const row = result.rows[0] as {
    campaign_id: string;
    total_donated: string;
    total_withdrawn: string;
    total_fees: string;
    pending_withdrawals: string;
  };

  const totalDonated = Number(row.total_donated);
  const totalWithdrawn = Number(row.total_withdrawn);
  const pendingWithdrawals = Number(row.pending_withdrawals);

  return {
    campaign_id: row.campaign_id,
    total_donated: totalDonated,
    total_withdrawn: totalWithdrawn,
    total_fees: Number(row.total_fees),
    available_balance: totalDonated - totalWithdrawn - pendingWithdrawals,
    pending_withdrawals: pendingWithdrawals,
  };
}

// ============================================================
// GET TOTAL ESCROW
// ============================================================

/**
 * Return the platform-wide escrow totals across all campaigns.
 *
 * `total_escrow` = total completed donations (net) minus total
 * completed withdrawals (net).
 */
export async function getTotalEscrow(): Promise<{
  total_escrow: number;
  total_donated: number;
  total_withdrawn: number;
}> {
  const result = await query(
    `SELECT
       COALESCE((SELECT SUM(net_amount) FROM donations  WHERE status = 'completed'), 0) AS total_donated,
       COALESCE((SELECT SUM(net_amount) FROM withdrawals WHERE status = 'completed'), 0) AS total_withdrawn`,
  );

  const row = result.rows[0] as {
    total_donated: string;
    total_withdrawn: string;
  };

  const totalDonated = Number(row.total_donated);
  const totalWithdrawn = Number(row.total_withdrawn);

  return {
    total_escrow: totalDonated - totalWithdrawn,
    total_donated: totalDonated,
    total_withdrawn: totalWithdrawn,
  };
}

// ============================================================
// GET PLATFORM REVENUE
// ============================================================

/**
 * Return the total platform revenue broken down by fee source.
 *
 * Reads from the `platform_fees` table and uses conditional aggregation
 * to split the total by `fee_type`.
 */
export async function getPlatformRevenue(): Promise<{
  total: number;
  from_donations: number;
  from_withdrawals: number;
}> {
  const result = await query(
    `SELECT
       COALESCE(SUM(amount), 0)                                          AS total,
       COALESCE(SUM(CASE WHEN fee_type = 'donation'   THEN amount ELSE 0 END), 0) AS from_donations,
       COALESCE(SUM(CASE WHEN fee_type = 'withdrawal' THEN amount ELSE 0 END), 0) AS from_withdrawals
     FROM platform_fees`,
  );

  const row = result.rows[0] as {
    total: string;
    from_donations: string;
    from_withdrawals: string;
  };

  return {
    total: Number(row.total),
    from_donations: Number(row.from_donations),
    from_withdrawals: Number(row.from_withdrawals),
  };
}

// ============================================================
// GET PLATFORM FEE PERCENTAGE (CACHED)
// ============================================================

/**
 * Read the current platform fee percentage from the `admin_settings`
 * table.  The value is cached in-memory for 5 minutes to avoid
 * repeated reads for a value that rarely changes.
 *
 * Defaults to **1** (percent) if no row exists.
 */
export async function getPlatformFeePercentage(): Promise<number> {
  const now = Date.now();

  if (cachedFeePercentage !== null && now - feePercentageCachedAt < FEE_CACHE_TTL_MS) {
    return cachedFeePercentage;
  }

  const result = await query(
    `SELECT platform_fee_percentage FROM admin_settings ORDER BY updated_at DESC LIMIT 1`,
  );

  if (result.rows.length === 0) {
    console.log('[Sahovat] No admin_settings row found — defaulting platform fee to 1%');
    cachedFeePercentage = 1;
  } else {
    const row = result.rows[0] as { platform_fee_percentage: number };
    cachedFeePercentage = Number(row.platform_fee_percentage);
  }

  feePercentageCachedAt = now;
  return cachedFeePercentage;
}
