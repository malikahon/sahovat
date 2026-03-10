import type {
  CampaignCategory,
  CampaignStatus,
  DocumentType,
  UzbekRegion,
} from '../../types/entities.js';

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface CampaignRow {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: CampaignCategory;
  goal_amount: number;
  current_amount: number;
  status: CampaignStatus;
  region: UzbekRegion | null;
  is_verified: boolean;
  end_date: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignDocumentRow {
  id: string;
  campaign_id: string;
  document_type: DocumentType;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  is_private: boolean;
  notes: string | null;
  uploaded_at: string;
}

export interface CampaignWithStatsRow extends CampaignRow {
  donor_count: number;
  creator_display_name: string | null;
}
