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
  password_hash: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | null;
  preferred_categories: CampaignCategory[];
  is_verified: boolean;
  is_admin: boolean;
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
  sort_by?: 'created_at' | 'goal_amount' | 'current_amount' | 'end_date';
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
  payment_provider: PaymentProvider;
  is_anonymous?: boolean;
  donor_display_name?: string;
  note?: string;
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
