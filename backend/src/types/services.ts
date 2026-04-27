import type { Campaign, Donation, PaymentProvider, WithdrawalProvider } from './entities.js';

// ============================================================
// SMS SERVICE
// ============================================================

export interface SmsService {
  sendOtp(phone: string, otp: string, locale?: string): Promise<void>;
  sendNotification(phone: string, message: string): Promise<void>;
}

// ============================================================
// EMAIL SERVICE
// ============================================================

/**
 * Inputs for the generic email sender. The `react` element is the
 * React Email template instance (rendered to HTML via @react-email/render).
 */
export interface SendEmailParams {
  to: string;
  subject: string;
  /** Pre-rendered React Email element. */
  react: React.ReactElement;
  /** Optional plain-text fallback. If omitted, derived from html. */
  text?: string;
  /** Optional list-unsubscribe headers, etc. */
  headers?: Record<string, string>;
}

export interface EmailService {
  /**
   * Sends a single email. Resolves with the provider's message id.
   */
  sendEmail(params: SendEmailParams): Promise<{ id: string }>;

  /**
   * Convenience: sends a 6-digit verification code email.
   */
  sendVerificationCode(to: string, code: string, locale?: string): Promise<void>;
}

// ============================================================
// TELEGRAM BOT SERVICE (outbound notifications)
// ============================================================

/**
 * Subset of Telegram Bot API sendMessage parameters we use.
 * https://core.telegram.org/bots/api#sendmessage
 */
export interface TelegramMessageParams {
  /** Markdown / HTML / plain text body. */
  text: string;
  /** 'HTML' (default) or 'MarkdownV2'. We use HTML for safety + ease. */
  parse_mode?: 'HTML' | 'MarkdownV2';
  /** Suppress link previews — keeps messages tight. */
  disable_web_page_preview?: boolean;
}

export interface TelegramService {
  /**
   * Sends a Telegram message. `chatId` is the numeric Telegram user id
   * (or group/channel id, as a string to avoid 64-bit JS overflow).
   * Resolves with Telegram's `message_id`. Throws on non-2xx.
   */
  sendMessage(chatId: string, params: TelegramMessageParams): Promise<{ message_id: number }>;
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

export interface ChargeCardParams {
  amount: number;          // UZS
  donation_id: string;
  card_token: string;
  payer_phone?: string;
}

export interface ChargeCardResult {
  success: boolean;
  receipt_id: string | null;
  transaction_id: string;
  state: number;
  error?: string;
}

export interface PaymentService {
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  chargeCard(params: ChargeCardParams): Promise<ChargeCardResult>;
  verifyWebhook(provider: PaymentProvider, headers: Record<string, string>, body: unknown): WebhookVerificationResult;
}

// ============================================================
// STORAGE SERVICE
// ============================================================

export interface StorageService {
  savePublic(file: Buffer, fileName: string, mimeType: string): Promise<string>;
  savePrivate(file: Buffer, fileName: string, mimeType: string): Promise<string>;
  getPrivate(filePath: string): Promise<Buffer>;
  delete(filePath: string, storage?: 'public' | 'private'): Promise<void>;
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
