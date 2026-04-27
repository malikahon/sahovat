import { query } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { getTotalEscrow, getPlatformRevenue } from '../donations/ledger.service.js';

const STATS_CACHE_KEY = 'public:stats:v1';
const STATS_CACHE_TTL_SECONDS = 300; // 5 min

export interface PublicStats {
  active_campaigns: number;
  total_campaigns: number;
  completed_donations_count: number;
  total_donated_amount: number;
  total_withdrawn_amount: number;
  verified_organizers: number;
  recent_verifications_30d: number;
  platform_fee_total: number;
  generated_at: string;
}

/**
 * Public, sanitized aggregate stats. NO PII, NO per-user data.
 * Cached in Redis for 5 minutes.
 */
export async function getPublicStats(): Promise<PublicStats> {
  // Try cache first.
  try {
    const cached = await redis.get(STATS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as PublicStats;
    }
  } catch (err) {
    console.warn('[Sahovat] [public-stats] Redis read failed, computing fresh:', err);
  }

  const [statsResult, escrow, fees] = await Promise.all([
    query(`
      SELECT
        (SELECT COUNT(*)::int FROM campaigns WHERE status = 'active')                  AS active_campaigns,
        (SELECT COUNT(*)::int FROM campaigns WHERE status IN ('active','completed','funded')) AS total_campaigns,
        (SELECT COUNT(*)::int FROM donations WHERE status = 'completed')               AS completed_donations_count,
        (SELECT COUNT(*)::int FROM users WHERE verification_status = 'approved')       AS verified_organizers,
        (SELECT COUNT(*)::int FROM users
            WHERE verification_status = 'approved'
              AND updated_at >= NOW() - INTERVAL '30 days')                            AS recent_verifications_30d
    `),
    getTotalEscrow(),
    getPlatformRevenue(),
  ]);

  const row = statsResult.rows[0] as {
    active_campaigns: number;
    total_campaigns: number;
    completed_donations_count: number;
    verified_organizers: number;
    recent_verifications_30d: number;
  };

  const stats: PublicStats = {
    active_campaigns: row.active_campaigns,
    total_campaigns: row.total_campaigns,
    completed_donations_count: row.completed_donations_count,
    total_donated_amount: escrow.total_donated,
    total_withdrawn_amount: escrow.total_withdrawn,
    verified_organizers: row.verified_organizers,
    recent_verifications_30d: row.recent_verifications_30d,
    platform_fee_total: fees.total,
    generated_at: new Date().toISOString(),
  };

  try {
    await redis.set(STATS_CACHE_KEY, JSON.stringify(stats), 'EX', STATS_CACHE_TTL_SECONDS);
  } catch (err) {
    console.warn('[Sahovat] [public-stats] Redis write failed:', err);
  }

  return stats;
}

/** Test/admin helper to invalidate the cache. */
export async function invalidatePublicStatsCache(): Promise<void> {
  try {
    await redis.del(STATS_CACHE_KEY);
  } catch (err) {
    console.warn('[Sahovat] [public-stats] cache invalidation failed:', err);
  }
}
