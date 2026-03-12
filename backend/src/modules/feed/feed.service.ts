import { query as dbQuery } from '../../config/database.js';
import type { ScoredCampaign, ScoreProvider } from '../../types/services.js';
import type { Campaign } from '../../types/entities.js';

// ============================================================
// SCORE WEIGHTS (Week 11.3)
// ============================================================

const WEIGHTS = {
  urgency: 0.35,
  affinity: 0.35,
  recency: 0.30,
};

// ============================================================
// SIMPLE SCORE PROVIDER (MVP)
// ============================================================

/**
 * MVP feed scoring algorithm.
 *
 * Weighted score = urgency_weight * proximity_to_goal
 *               + affinity_weight * category_score
 *               + recency_weight * freshness
 *
 * For anonymous users or users with no category scores,
 * falls back to urgency + recency only.
 */
export const simpleScoreProvider: ScoreProvider = {
  async rankCampaigns(
    campaigns: Campaign[],
    userId: string | null,
  ): Promise<ScoredCampaign[]> {
    if (campaigns.length === 0) return [];

    // Fetch user's category scores if logged in
    let categoryScores: Record<string, number> = {};
    if (userId) {
      const scoresResult = await dbQuery(
        `SELECT category, score FROM user_category_scores WHERE user_id = $1`,
        [userId],
      );
      for (const row of scoresResult.rows as Array<{ category: string; score: number }>) {
        categoryScores[row.category] = row.score;
      }
    }

    const hasAffinity = Object.keys(categoryScores).length > 0;
    const maxScore = Math.max(...Object.values(categoryScores), 1);
    const now = Date.now();

    const scored: ScoredCampaign[] = campaigns.map((campaign) => {
      // 1. Urgency: how close to goal (higher = more urgent)
      const progressRatio = campaign.goal_amount > 0
        ? campaign.current_amount / campaign.goal_amount
        : 0;
      // Boost campaigns that are 60-95% funded (almost there)
      let urgencyScore: number;
      if (progressRatio >= 0.6 && progressRatio < 0.95) {
        urgencyScore = 0.5 + progressRatio * 0.5; // 0.8 to ~0.975
      } else if (progressRatio >= 0.95) {
        urgencyScore = 0.3; // nearly done, less urgent
      } else {
        urgencyScore = progressRatio * 0.6; // early stage
      }

      // If campaign has end_date, boost urgency for ending soon
      if (campaign.end_date) {
        const daysLeft = Math.max(0, (new Date(campaign.end_date).getTime() - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7 && daysLeft > 0) {
          urgencyScore += (7 - daysLeft) / 7 * 0.3; // up to +0.3 for last day
        }
      }

      // 2. Category affinity (normalized 0–1)
      let affinityScore = 0;
      if (hasAffinity) {
        affinityScore = (categoryScores[campaign.category] ?? 0) / maxScore;
      }

      // 3. Recency (exponential decay over 30 days)
      const ageMs = now - new Date(campaign.created_at).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyScore = Math.exp(-ageDays / 30); // half-life ~21 days

      // Weighted total
      let totalScore: number;
      if (hasAffinity) {
        totalScore =
          WEIGHTS.urgency * urgencyScore +
          WEIGHTS.affinity * affinityScore +
          WEIGHTS.recency * recencyScore;
      } else {
        // No affinity data — redistribute weight to urgency + recency
        totalScore =
          0.55 * urgencyScore +
          0.45 * recencyScore;
      }

      return { campaign, score: totalScore };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored;
  },
};

// ============================================================
// FEED SERVICE — get personalized campaign feed
// ============================================================

export interface FeedQuery {
  page: number;
  limit: number;
}

export interface FeedResult {
  campaigns: Array<Campaign & { score: number; donor_count: number; progress_percentage: number; days_remaining: number | null }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Get personalized feed for a user (or anonymous visitor).
 * Fetches active campaigns, scores them, returns paginated result.
 */
export async function getPersonalizedFeed(
  userId: string | null,
  feedQuery: FeedQuery,
): Promise<FeedResult> {
  const { page, limit } = feedQuery;

  // Fetch all active campaigns (for scoring — we need the full set to rank)
  // For large-scale, this should be limited to a candidate pool.
  const campaignsResult = await dbQuery(
    `SELECT
       c.*,
       COUNT(DISTINCT d.donor_id) FILTER (WHERE d.status = 'completed') AS donor_count
     FROM campaigns c
     LEFT JOIN donations d ON d.campaign_id = c.id
     WHERE c.status = 'active'
     GROUP BY c.id
     ORDER BY c.created_at DESC
     LIMIT 200`,
    [],
  );

  const campaigns = campaignsResult.rows as Array<Campaign & { donor_count: number }>;

  // Score and rank
  const scored = await simpleScoreProvider.rankCampaigns(
    campaigns,
    userId,
  );

  // Paginate the scored result
  const total = scored.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paged = scored.slice(start, start + limit);

  const now = Date.now();

  const result = paged.map((sc) => {
    const c = sc.campaign as Campaign & { donor_count: number };
    const progressPercentage = c.goal_amount > 0
      ? Math.min(100, Math.round((c.current_amount / c.goal_amount) * 100))
      : 0;

    let daysRemaining: number | null = null;
    if (c.end_date) {
      daysRemaining = Math.max(0, Math.ceil((new Date(c.end_date).getTime() - now) / (1000 * 60 * 60 * 24)));
    }

    return {
      ...c,
      score: Math.round(sc.score * 1000) / 1000,
      donor_count: Number(c.donor_count) || 0,
      progress_percentage: progressPercentage,
      days_remaining: daysRemaining,
    };
  });

  return {
    campaigns: result,
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
  };
}
