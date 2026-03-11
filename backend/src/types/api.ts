import type {
  Campaign,
  CampaignCategory,
  CampaignStatus,
  Donation,
  DonationStatus,
  EventType,
  PaymentProvider,
  RecurringFrequency,
  RecurringStatus,
  UzbekRegion,
  User,
  Withdrawal,
  WithdrawalAccount,
  WithdrawalProvider,
  WithdrawalStatus,
} from './entities.js';

// ============================================================
// GENERIC WRAPPERS
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
