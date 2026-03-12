import { query as dbQuery } from '../../config/database.js';
import { EventType } from '../../types/entities.js';
import type { TrackEventDto } from '../../types/api.js';
import type { UserEventRow, UserCategoryScoreRow } from './events.types.js';

// ============================================================
// SCORE WEIGHTS
// ============================================================

const EVENT_SCORE_WEIGHTS: Record<EventType, number> = {
  [EventType.CAMPAIGN_VIEWED]: 1.0,
  [EventType.CAMPAIGN_SHARED]: 2.0,
  [EventType.DONATION_INITIATED]: 1.5,
  [EventType.DONATION_COMPLETED]: 5.0,
};

/** Time decay multiplier applied to existing score before adding new increment */
const SCORE_DECAY_FACTOR = 0.95;

// ============================================================
// TRACK EVENT
// ============================================================

/**
 * Insert a single event and update category affinity scores.
 */
export async function trackEvent(
  userId: string | null,
  dto: TrackEventDto,
): Promise<UserEventRow> {
  const result = await dbQuery(
    `INSERT INTO user_events (user_id, session_id, event_type, campaign_id, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, dto.session_id, dto.event_type, dto.campaign_id ?? null, JSON.stringify(dto.metadata ?? {})],
  );

  const event = result.rows[0] as UserEventRow;

  // Update category affinity scores (only for logged-in users with a campaign)
  if (userId && dto.campaign_id) {
    await updateCategoryScore(userId, dto.campaign_id, dto.event_type as EventType);
  }

  return event;
}

/**
 * Insert multiple events in batch. Updates category scores for each.
 */
export async function trackEventsBatch(
  userId: string | null,
  events: TrackEventDto[],
): Promise<void> {
  if (events.length === 0) return;

  // Build a multi-row INSERT
  const values: unknown[] = [];
  const placeholders: string[] = [];

  for (let i = 0; i < events.length; i++) {
    const evt = events[i]!;
    const offset = i * 5;
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
    values.push(
      userId,
      evt.session_id,
      evt.event_type,
      evt.campaign_id ?? null,
      JSON.stringify(evt.metadata ?? {}),
    );
  }

  await dbQuery(
    `INSERT INTO user_events (user_id, session_id, event_type, campaign_id, metadata)
     VALUES ${placeholders.join(', ')}`,
    values,
  );

  // Update category scores for logged-in users
  if (userId) {
    for (const event of events) {
      if (event.campaign_id) {
        await updateCategoryScore(userId, event.campaign_id, event.event_type as EventType);
      }
    }
  }
}

// ============================================================
// 11.2 — CATEGORY AFFINITY SCORING
// ============================================================

/**
 * Increment the user's category score based on the event type.
 * Uses time decay: existing_score * 0.95 + new_increment.
 */
async function updateCategoryScore(
  userId: string,
  campaignId: string,
  eventType: EventType,
): Promise<void> {
  // Look up the campaign's category
  const campaignResult = await dbQuery(
    `SELECT category FROM campaigns WHERE id = $1`,
    [campaignId],
  );

  if (campaignResult.rows.length === 0) return;

  const category = (campaignResult.rows[0] as { category: string }).category;
  const increment = EVENT_SCORE_WEIGHTS[eventType] ?? 0;

  if (increment === 0) return;

  // UPSERT with time decay on existing score
  await dbQuery(
    `INSERT INTO user_category_scores (user_id, category, score, last_interaction_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, category)
     DO UPDATE SET
       score = user_category_scores.score * $4 + $3,
       last_interaction_at = NOW()`,
    [userId, category, increment, SCORE_DECAY_FACTOR],
  );
}

// ============================================================
// READ — Get user's category scores
// ============================================================

export async function getUserCategoryScores(
  userId: string,
): Promise<UserCategoryScoreRow[]> {
  const result = await dbQuery(
    `SELECT * FROM user_category_scores
     WHERE user_id = $1
     ORDER BY score DESC`,
    [userId],
  );
  return result.rows as UserCategoryScoreRow[];
}

// ============================================================
// 11.4 — DEMOGRAPHIC SCAFFOLD (data query only, not activated)
// ============================================================

/**
 * Query age-bracket donation patterns. Scaffolded for post-MVP.
 * Returns aggregated donation counts/amounts by age bracket and category.
 * This data will be used in the full ML engine (Phase 7).
 *
 * Not called by the feed algorithm — kept for future use.
 */
export async function getAgeBracketPatterns(): Promise<
  Array<{ age_bracket: string; category: string; donation_count: number; avg_amount: number }>
> {
  const result = await dbQuery(
    `SELECT
       CASE
         WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth::date)) BETWEEN 18 AND 24 THEN '18-24'
         WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth::date)) BETWEEN 25 AND 34 THEN '25-34'
         WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth::date)) BETWEEN 35 AND 44 THEN '35-44'
         WHEN EXTRACT(YEAR FROM AGE(u.date_of_birth::date)) BETWEEN 45 AND 54 THEN '45-54'
         ELSE '55+'
       END AS age_bracket,
       c.category,
       COUNT(d.id)::int AS donation_count,
       COALESCE(AVG(d.amount), 0)::numeric(12,2) AS avg_amount
     FROM donations d
     JOIN users u ON d.donor_id = u.id
     JOIN campaigns c ON d.campaign_id = c.id
     WHERE d.status = 'completed'
       AND u.date_of_birth IS NOT NULL
     GROUP BY age_bracket, c.category
     ORDER BY age_bracket, donation_count DESC`,
    [],
  );

  return result.rows as Array<{
    age_bracket: string;
    category: string;
    donation_count: number;
    avg_amount: number;
  }>;
}
