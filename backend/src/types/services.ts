import type { Campaign, Donation, PaymentProvider, WithdrawalProvider } from './entities.js';

// ============================================================
// SMS SERVICE
// ============================================================

export interface SmsService {
  sendOtp(phone: string, otp: string): Promise<void>;
  sendNotification(phone: string, message: string): Promise<void>;
}

// ============================================================
// PAYMENT SERVICE
// ============================================================

export interface CreatePaymentParams {
  amount: number;
  donation_id: string;
  provider: PaymentProvider;
  return_url?: string;
}

export interface PaymentResult {
  transaction_id: string;
  checkout_url: string;
  provider: PaymentProvider;
}

export interface WebhookVerificationResult {
  valid: boolean;
  donation_id: string | null;
  transaction_id: string | null;
  status: 'completed' | 'failed' | null;
  amount: number | null;
}

export interface PaymentService {
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  verifyWebhook(provider: PaymentProvider, headers: Record<string, string>, body: unknown): WebhookVerificationResult;
}

// ============================================================
// STORAGE SERVICE
// ============================================================

export interface StorageService {
  savePublic(file: Buffer, fileName: string, mimeType: string): Promise<string>;
  savePrivate(file: Buffer, fileName: string, mimeType: string): Promise<string>;
  getPrivate(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
  getPublicUrl(filePath: string): string;
}

// ============================================================
// PDF SERVICE
// ============================================================

export interface PdfService {
  generateDonationReceipt(donation: Donation, campaign: Campaign, donorName: string): Promise<Buffer>;
}

// ============================================================
// SCORE PROVIDER
// ============================================================

export interface ScoredCampaign {
  campaign: Campaign;
  score: number;
}

export interface ScoreProvider {
  rankCampaigns(campaigns: Campaign[], userId: string | null): Promise<ScoredCampaign[]>;
}

// ============================================================
// PAYOUT PROVIDER
// ============================================================

export interface PayoutParams {
  amount: number;
  card_number: string;
  provider: WithdrawalProvider;
  reference: string;
}

export interface PayoutResult {
  success: boolean;
  transaction_reference: string | null;
  error_message: string | null;
}

export interface PayoutProvider {
  transfer(params: PayoutParams): Promise<PayoutResult>;
  supports(provider: WithdrawalProvider): boolean;
}
