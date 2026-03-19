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
  phone_number: string;
  display_name: string | null;
  has_password: boolean;
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
// SAVED CARDS
// ============================================================

export interface SavedCard {
  id: string;
  user_id: string;
  card_number_masked: string;
  card_expire: string;
  card_type: 'uzcard' | 'humo' | 'unknown';
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// GENERIC API WRAPPERS
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedQuery {
  page?: number;
  limit?: number;
}

// ============================================================
// AUTH DTOs
// ============================================================

export interface RequestOtpDto {
  phone_number: string;
}

export interface VerifyOtpDto {
  phone_number: string;
  otp: string;
}

export interface RegisterDto {
  display_name: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  preferred_categories?: CampaignCategory[];
  language_preference?: 'uz' | 'ru' | 'en';
}

export interface AdminLoginDto {
  phone_number: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  tokens: AuthTokens;
  is_new_user: boolean;
}

export interface RefreshTokenDto {
  refresh_token: string;
}

// ============================================================
// USER DTOs
// ============================================================

export interface UpdateProfileDto {
  display_name?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  preferred_categories?: CampaignCategory[];
  language_preference?: 'uz' | 'ru' | 'en';
}

// ============================================================
// CAMPAIGN DTOs
// ============================================================

export interface CreateCampaignDto {
  title: string;
  description: string;
  category: CampaignCategory;
  goal_amount: number;
  region?: UzbekRegion;
  end_date?: string;
}

export interface UpdateCampaignDto {
  title?: string;
  description?: string;
  category?: CampaignCategory;
  goal_amount?: number;
  region?: UzbekRegion;
  end_date?: string;
  status?: CampaignStatus;
}

export interface CampaignListQuery extends PaginatedQuery {
  category?: CampaignCategory;
  status?: CampaignStatus;
  region?: UzbekRegion;
  search?: string;
  sort_by?: 'created_at' | 'goal_amount' | 'current_amount' | 'end_date' | 'urgency';
  sort_order?: 'asc' | 'desc';
  creator_id?: string;
}

export interface CampaignWithStats extends Campaign {
  donor_count: number;
  creator_display_name: string | null;
  progress_percentage: number;
}

// ============================================================
// DONATION DTOs
// ============================================================

export interface InitiateDonationDto {
  campaign_id: string;
  amount: number;
  fee_included?: boolean;
  payment_provider: PaymentProvider;
  is_anonymous?: boolean;
  donor_display_name?: string;
  note?: string;
  saved_card_id?: string;
}

export interface ConfirmDonationDto {
  donation_id: string;
  payment_transaction_id: string;
}

export interface DonationListQuery extends PaginatedQuery {
  campaign_id?: string;
  donor_id?: string;
  status?: DonationStatus;
  sort_by?: 'created_at' | 'amount';
  sort_order?: 'asc' | 'desc';
}

export interface DonationWithCampaign extends Donation {
  campaign_title: string;
  campaign_cover_image_url: string | null;
}

export interface DonationOtpDto {
  donation_id: string;
  otp: string;
}

// ============================================================
// WITHDRAWAL DTOs
// ============================================================

export interface CreateWithdrawalAccountDto {
  provider: WithdrawalProvider;
  account_number: string;
  account_holder_name: string;
  is_primary?: boolean;
}

export interface UpdateWithdrawalAccountDto {
  account_holder_name?: string;
  is_primary?: boolean;
}

export interface RequestWithdrawalDto {
  campaign_id: string;
  withdrawal_account_id: string;
  amount: number;
}

export interface WithdrawalWithDetails extends Withdrawal {
  campaign_title: string;
  withdrawal_account: WithdrawalAccount;
}

export interface CampaignBalance {
  campaign_id: string;
  total_donated: number;
  total_withdrawn: number;
  total_fees: number;
  available_balance: number;
  pending_withdrawals: number;
}

// ============================================================
// ADMIN DTOs
// ============================================================

export interface AdminVerifyCampaignDto {
  verified: boolean;
  admin_notes?: string;
}

export interface AdminWithdrawalActionDto {
  action: 'approve' | 'reject';
  admin_notes?: string;
  transaction_reference?: string;
}

export interface AdminDashboardStats {
  total_users: number;
  total_campaigns: number;
  active_campaigns: number;
  total_donations_amount: number;
  total_donations_count: number;
  total_withdrawals_amount: number;
  pending_withdrawals_count: number;
  pending_campaigns_count: number;
  total_platform_fees: number;
}

export interface AdminUpdateSettingsDto {
  master_card_number?: string;
  master_card_holder_name?: string;
  platform_fee_percentage?: number;
}

// ============================================================
// EVENT DTOs
// ============================================================

export interface TrackEventDto {
  event_type: EventType;
  campaign_id?: string;
  session_id: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// RECURRING DONATION DTOs
// ============================================================

export interface CreateRecurringDonationDto {
  campaign_id?: string;
  category?: CampaignCategory;
  amount: number;
  frequency: RecurringFrequency;
  payment_provider: PaymentProvider;
}

export interface UpdateRecurringDonationDto {
  amount?: number;
  frequency?: RecurringFrequency;
  status?: RecurringStatus;
}

// ============================================================
// ADMIN RESPONSE TYPES
// ============================================================

export interface AdminUserListItem {
  id: string;
  phone_number: string;
  display_name: string | null;
  is_verified: boolean;
  is_admin: boolean;
  is_banned: boolean;
  verification_status: VerificationStatus;
  language_preference: 'uz' | 'ru' | 'en';
  created_at: string;
  campaign_count: number;
  total_donated: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  date_of_birth: string | null;
  gender: 'male' | 'female' | null;
  preferred_categories: CampaignCategory[];
  oneid_id: string | null;
  oneid_verified_at: string | null;
  updated_at: string;
}

export interface AdminCampaignListItem {
  id: string;
  title: string;
  category: CampaignCategory;
  status: CampaignStatus;
  goal_amount: number;
  current_amount: number;
  is_verified: boolean;
  region: UzbekRegion | null;
  end_date: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  creator_id: string;
  creator_display_name: string | null;
  creator_phone: string;
  donor_count: number;
  document_count: number;
}

export interface AdminCampaignDetail extends AdminCampaignListItem {
  description: string;
  documents: CampaignDocument[];
  creator_verification_status: VerificationStatus;
  admin_notes: string | null;
}

export interface AdminAuditLogEntry {
  id: string;
  admin_id: string;
  admin_display_name: string | null;
  admin_phone: string;
  action_type: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AdminSettingsResponse {
  id: string;
  master_card_number_masked: string | null;
  master_card_holder_name: string | null;
  platform_fee_percentage: number;
  updated_at: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
}

export interface AdminDashboardStatsResponse {
  total_users: number;
  total_campaigns: number;
  active_campaigns: number;
  total_donations_amount: number;
  total_donations_count: number;
  total_withdrawals_amount: number;
  pending_withdrawals_count: number;
  pending_campaigns_count: number;
  total_platform_fees: number;
}

export interface DonationOverTimeEntry {
  date: string;
  count: number;
  amount: number;
}

export interface DonationByCategoryEntry {
  category: CampaignCategory;
  count: number;
  amount: number;
}

export interface CampaignEscrowBalance {
  campaign_id: string;
  campaign_title: string;
  total_donated: number;
  total_fees: number;
  total_withdrawn: number;
  available_balance: number;
}

export interface EscrowSummary {
  total_escrow_balance: number;
  total_platform_revenue: number;
  total_withdrawn: number;
  campaign_balances: CampaignEscrowBalance[];
}

export interface MoneyFlowStats {
  gross_donations: number;
  total_platform_fees: number;
  fee_breakdown: {
    from_donations: number;
    from_withdrawals: number;
  };
  net_to_campaigns: number;
  total_withdrawn: number;
  escrow_balance: number;
  this_month: {
    donations: number;
    fees: number;
    count: number;
  };
  last_month: {
    donations: number;
    fees: number;
    count: number;
  };
  withdrawals: {
    pending_amount: number;
    pending_count: number;
    approved_amount: number;
    approved_count: number;
    completed_amount: number;
    completed_count: number;
  };
  weekly_trend: {
    week_start: string;
    count: number;
    amount: number;
    fees: number;
  }[];
}

// ============================================================
// WITHDRAWAL RESPONSE TYPES (Week 10)
// ============================================================

export interface WithdrawalRequest {
  id: string;
  campaign_id: string;
  organizer_id: string;
  withdrawal_account_id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  card_number_masked: string;
  cardholder_name: string;
  admin_notes: string | null;
  transaction_reference: string | null;
  created_at: string;
  reviewed_at: string | null;
  completed_at: string | null;
  campaign_title: string;
  fee_percentage?: number;
}

export interface CampaignWithBalance {
  id: string;
  title: string;
  status: string;
  category: string;
  goal_amount: number;
  current_amount: number;
  cover_image_url: string | null;
  created_at: string;
  end_date: string | null;
  donor_count: number;
  balance: {
    campaign_id: string;
    total_donated: number;
    total_withdrawn: number;
    total_fees: number;
    available_balance: number;
    pending_withdrawals: number;
  };
}

export interface OrganizerDashboard {
  campaigns: CampaignWithBalance[];
  totals: {
    total_raised: number;
    total_withdrawn: number;
    total_available: number;
    total_pending_withdrawals: number;
  };
}

export interface AdminWithdrawalListItem {
  id: string;
  campaign_id: string;
  organizer_id: string;
  withdrawal_account_id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
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
}

export interface AdminWithdrawalDetail extends AdminWithdrawalListItem {
  goal_amount: number;
  current_amount: number;
  organizer_verification_status: string;
  organizer_oneid_id: string | null;
  organizer_oneid_verified_at: string | null;
  organizer_legal_name: string | null;
  name_match_note: string;
}

// ============================================================
// FRONTEND-ONLY TYPES
// ============================================================

export interface SafeWithdrawalAccount {
  id: string;
  user_id: string;
  provider: WithdrawalProvider;
  account_number_masked: string;
  account_holder_name: string;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login(phone: string): Promise<void>;
  verifyOtp(phone: string, otp: string): Promise<AuthResponse>;
  register(data: RegisterDto): Promise<void>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
}
