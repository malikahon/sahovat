// ============================================================
// ENUMS
// ============================================================

export enum CampaignCategory {
  MEDICAL = 'medical',
  EDUCATION = 'education',
  EMERGENCY = 'emergency',
  COMMUNITY = 'community',
  CREATIVE = 'creative',
  BUSINESS = 'business',
  OTHER = 'other',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FROZEN = 'frozen',
}

export enum DonationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

export enum PaymentProvider {
  PAYME = 'payme',
  CLICK = 'click',
  UZUM = 'uzum',
}

export enum WithdrawalProvider {
  PAYME = 'payme',
  UZCARD = 'uzcard',
  HUMO = 'humo',
}

export enum DocumentType {
  MEDICAL_REPORT = 'medical_report',
  ID_DOCUMENT = 'id_document',
  PROOF_OF_RESIDENCE = 'proof_of_residence',
  FINANCIAL_STATEMENT = 'financial_statement',
  PHOTO = 'photo',
  OTHER = 'other',
}

export enum VerificationStatus {
  NONE = 'none',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum EventType {
  CAMPAIGN_VIEWED = 'campaign_viewed',
  CAMPAIGN_SHARED = 'campaign_shared',
  DONATION_INITIATED = 'donation_initiated',
  DONATION_COMPLETED = 'donation_completed',
}

export enum UzbekRegion {
  TASHKENT = 'tashkent',
  TASHKENT_REGION = 'tashkent_region',
  SAMARKAND = 'samarkand',
  BUKHARA = 'bukhara',
  FERGANA = 'fergana',
  ANDIJAN = 'andijan',
  NAMANGAN = 'namangan',
  KASHKADARYA = 'kashkadarya',
  SURKHANDARYA = 'surkhandarya',
  KHOREZM = 'khorezm',
  NAVOI = 'navoi',
  JIZZAKH = 'jizzakh',
  SYRDARYA = 'syrdarya',
  KARAKALPAKSTAN = 'karakalpakstan',
}

export enum RecurringFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum RecurringStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

// ============================================================
// ENTITY INTERFACES
// ============================================================

export interface User {
  id: string;
  phone_number: string | null;
  email: string | null;
  email_verified_at: string | null;
  display_name: string | null;
  password_hash: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | null;
  preferred_categories: CampaignCategory[];
  is_verified: boolean;
  is_admin: boolean;
  is_banned: boolean;
  verification_status: VerificationStatus;
  oneid_id: string | null;
  oneid_verified_at: string | null;
  language_preference: 'uz' | 'ru' | 'en';
  created_at: string;
  updated_at: string;
}

export interface Campaign {
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

export interface CampaignDocument {
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

export interface Donation {
  id: string;
  campaign_id: string;
  donor_id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  payment_provider: PaymentProvider;
  payment_transaction_id: string | null;
  status: DonationStatus;
  is_anonymous: boolean;
  donor_display_name: string | null;
  note: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface WithdrawalAccount {
  id: string;
  user_id: string;
  provider: WithdrawalProvider;
  account_number_encrypted: string;
  account_holder_name: string;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Withdrawal {
  id: string;
  campaign_id: string;
  organizer_id: string;
  withdrawal_account_id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: WithdrawalStatus;
  card_number_masked: string;
  cardholder_name: string;
  admin_notes: string | null;
  transaction_reference: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  completed_at: string | null;
}

export interface PlatformFee {
  id: string;
  donation_id: string | null;
  withdrawal_id: string | null;
  fee_type: 'donation' | 'withdrawal';
  amount: number;
  created_at: string;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AdminSettings {
  id: string;
  master_card_number_encrypted: string;
  master_card_holder_name: string;
  platform_fee_percentage: number;
  updated_at: string;
  updated_by: string;
}

export interface UserEvent {
  id: string;
  user_id: string | null;
  session_id: string;
  event_type: EventType;
  campaign_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UserCategoryScore {
  id: string;
  user_id: string;
  category: CampaignCategory;
  score: number;
  last_interaction_at: string;
  updated_at: string;
}

export interface RecurringDonation {
  id: string;
  donor_id: string;
  campaign_id: string | null;
  category: CampaignCategory | null;
  amount: number;
  frequency: RecurringFrequency;
  payment_provider: PaymentProvider;
  status: RecurringStatus;
  next_charge_date: string;
  last_charge_date: string | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface DonationReceipt {
  id: string;
  donation_id: string;
  file_url: string;
  generated_at: string;
}

// ============================================================
// PAYME INTEGRATION
// ============================================================

/** Merchant API transaction states (PayMe → us). */
export enum PaymeTransactionState {
  PENDING = 1,
  COMPLETED = 2,
  CANCELLED_PENDING = -1,
  CANCELLED_COMPLETED = -2,
}

export interface PaymeTransaction {
  id: string;
  payme_id: string;
  donation_id: string;
  state: PaymeTransactionState;
  amount: number;       // tiyin
  reason: number | null;
  create_time: number;  // Unix ms
  perform_time: number;
  cancel_time: number;
  created_at: string;
}

export interface SavedCard {
  id: string;
  user_id: string;
  card_token: string;
  card_number_masked: string;
  card_expire: string;
  card_type: 'uzcard' | 'humo' | 'unknown';
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}
