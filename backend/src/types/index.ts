import { Request } from 'express';

// User types
export interface User {
  id: string;
  phone_number: string;
  display_name: string | null;
  is_verified: boolean;
  is_admin: boolean;
  verification_status: 'none' | 'pending' | 'approved' | 'rejected';
  verification_document_url: string | null;
  verification_rejection_reason: string | null;
  language_preference: 'uz' | 'ru' | 'en';
  created_at: Date;
  updated_at: Date;
}

// Extend Express Request
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Fundraiser types
export type FundraiserCategory =
  | 'medical'
  | 'education'
  | 'emergency'
  | 'community'
  | 'creative'
  | 'business'
  | 'other';

export type FundraiserStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface Fundraiser {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: FundraiserCategory;
  goal_amount: number;
  current_amount: number;
  cover_image_url: string | null;
  video_url: string | null;
  status: FundraiserStatus;
  is_verified: boolean;
  withdrawal_account_id: string | null;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Donation types
export type PaymentProvider = 'payme' | 'click' | 'uzcard' | 'humo';
export type DonationStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Donation {
  id: string;
  fundraiser_id: string;
  donor_id: string | null;
  amount: number;
  platform_fee: number;
  net_amount: number;
  payment_provider: PaymentProvider;
  payment_transaction_id: string | null;
  status: DonationStatus;
  is_anonymous: boolean;
  donor_display_name: string | null;
  note: string | null;
  note_edited_at: Date | null;
  requires_verification: boolean;
  created_at: Date;
  updated_at: Date;
}

// Withdrawal types
export type WithdrawalProvider = 'payme' | 'click' | 'uzcard' | 'humo';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface WithdrawalAccount {
  id: string;
  user_id: string;
  provider: WithdrawalProvider;
  account_number_encrypted: string;
  account_holder_name: string;
  is_primary: boolean;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Withdrawal {
  id: string;
  fundraiser_id: string;
  withdrawal_account_id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: WithdrawalStatus;
  admin_id: string | null;
  admin_notes: string | null;
  transaction_reference: string | null;
  created_at: Date;
  updated_at: Date;
}

// Document types
export type DocumentType =
  | 'medical_report'
  | 'id_document'
  | 'proof_of_residence'
  | 'financial_statement'
  | 'photo'
  | 'other';

export interface FundraiserDocument {
  id: string;
  fundraiser_id: string;
  document_type: DocumentType;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  note: string | null;
  created_at: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
