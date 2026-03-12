import type { EventType } from '../../types/entities.js';

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface UserEventRow {
  id: string;
  user_id: string | null;
  session_id: string;
  event_type: EventType;
  campaign_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UserCategoryScoreRow {
  id: string;
  user_id: string;
  category: string;
  score: number;
  last_interaction_at: string;
  updated_at: string;
}

// ============================================================
// DEMOGRAPHIC SCAFFOLD (Week 11.4)
// ============================================================

/**
 * Age bracket demographic pattern — scaffolded for post-MVP.
 * This will store aggregated donation patterns by age group.
 * Not activated in feed scoring yet.
 */
export interface AgeBracketPattern {
  age_bracket: '18-24' | '25-34' | '35-44' | '45-54' | '55+';
  category: string;
  donation_count: number;
  avg_amount: number;
}
