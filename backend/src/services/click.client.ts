import { createHash } from 'node:crypto';
import { env } from '../config/env.js';

// ============================================================
// TYPES
// ============================================================

export interface ClickPrepareResult {
  click_trans_id: number;
  merchant_trans_id: string;
  merchant_prepare_id: number;
  error: ClickErrorCode;
  error_note?: string;
}

export interface ClickCompleteResult {
  click_trans_id: number;
  merchant_trans_id: string;
  merchant_confirm_id: number;
  error: ClickErrorCode;
  error_note?: string;
}

export enum ClickAction {
  PREPARE = 0,
  COMPLETE = 1,
}

export enum ClickErrorCode {
  SUCCESS = 0,
  SIGN_CHECK_FAILED = -1,
  INVALID_AMOUNT = -2,
  ALREADY_PAID = -4,
  TRANSACTION_NOT_FOUND = -6,
  TRANSACTION_CANCELLED = -9,
  INVALID_PARAMETER = -7,
  SYSTEM_ERROR = -8,
}

export interface ClickWebhookPayload {
  click_trans_id: number;
  service_id: string;
  click_paydoc_id?: string;
  merchant_trans_id: string;
  amount: number;
  action: ClickAction;
  error?: number;
  error_note?: string;
  sign_time: string;
  sign_string: string;
  merchant_prepare_id?: number;
}

// ============================================================
// MD5 SIGNATURE HELPERS (per docs.click.uz)
// ============================================================

/**
 * Verify an MD5 sign_string from a Click webhook payload.
 *
 * Prepare action sign:
 *   md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
 *
 * Complete action sign:
 *   md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
 */
export function verifyClickSign(payload: ClickWebhookPayload, secretKey: string): boolean {
  const expectedSign = computeClickSign(payload, secretKey);
  return expectedSign === payload.sign_string;
}

export function computeClickSign(
  payload: Pick<ClickWebhookPayload, 'click_trans_id' | 'service_id' | 'merchant_trans_id' | 'amount' | 'action' | 'sign_time' | 'merchant_prepare_id'>,
  secretKey: string,
): string {
  const parts: string[] = [
    String(payload.click_trans_id),
    payload.service_id,
    secretKey,
    payload.merchant_trans_id,
  ];

  if (payload.action === ClickAction.COMPLETE && payload.merchant_prepare_id !== undefined) {
    parts.push(String(payload.merchant_prepare_id));
  }

  parts.push(String(payload.amount));
  parts.push(String(payload.action));
  parts.push(payload.sign_time);

  const dataCheckString = parts.join('');
  return createHash('md5').update(dataCheckString).digest('hex');
}

// ============================================================
// REAL CLICK CLIENT
// ============================================================

class RealClickClient {
  private readonly serviceId: string;
  private readonly merchantId: string;
  private readonly secretKey: string;
  private readonly merchantUserId: string;
  private readonly checkoutUrl: string;

  constructor() {
    this.serviceId = env.CLICK_SERVICE_ID;
    this.merchantId = env.CLICK_MERCHANT_ID;
    this.secretKey = env.CLICK_SECRET_KEY;
    this.merchantUserId = env.CLICK_MERCHANT_USER_ID;
    this.checkoutUrl = env.CLICK_CHECKOUT_URL;
  }

  verifySign(payload: ClickWebhookPayload): boolean {
    return verifyClickSign(payload, this.secretKey);
  }

  buildCheckoutUrl(donationId: string, amount: number, returnUrl?: string): string {
    const params = new URLSearchParams({
      service_id: this.serviceId,
      merchant_id: this.merchantId,
      amount: String(amount),
      transaction_param: donationId,
    });

    if (returnUrl) {
      params.set('return_url', returnUrl);
    }

    return `${this.checkoutUrl}?${params.toString()}`;
  }
}

// ============================================================
// MOCK CLICK CLIENT
// ============================================================

class MockClickClient {
  verifySign(_payload: ClickWebhookPayload): boolean {
    console.log('[Sahovat] [MOCK CLICK] Sign verification skipped (mock mode)');
    return true;
  }

  buildCheckoutUrl(donationId: string, amount: number, returnUrl?: string): string {
    const params = new URLSearchParams({
      service_id: 'mock_service',
      merchant_id: 'mock_merchant',
      amount: String(amount),
      transaction_param: donationId,
    });

    if (returnUrl) {
      params.set('return_url', returnUrl);
    }

    return `${env.FRONTEND_URL}/mock-click/${donationId}?${params.toString()}`;
  }
}

// ============================================================
// FACTORY
// ============================================================

export type ClickClient = RealClickClient | MockClickClient;

export interface ClickClientMethods {
  verifySign(payload: ClickWebhookPayload): boolean;
  buildCheckoutUrl(donationId: string, amount: number, returnUrl?: string): string;
}

export function createClickClient(): ClickClientMethods {
  if (env.PAYMENT_PROVIDER_CLICK === 'real' && env.CLICK_SECRET_KEY && env.NODE_ENV !== 'test') {
    console.log('[Sahovat] Using real Click client');
    return new RealClickClient();
  }

  console.log('[Sahovat] Using mock Click client');
  return new MockClickClient();
}

export const clickClient: ClickClientMethods = createClickClient();