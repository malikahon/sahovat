import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { PaymentProvider } from '../types/entities.js';
import type {
  PaymentService,
  CreatePaymentParams,
  PaymentResult,
  WebhookVerificationResult,
} from '../types/services.js';

// ============================================================
// MOCK PAYME SERVICE (Development / Testing)
// ============================================================

class MockPaymeService implements PaymentService {
  /**
   * Creates a mock payment by generating a fake transaction ID
   * and returning a local checkout URL for development.
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const transaction_id = randomUUID();
    const checkout_url =
      `${env.FRONTEND_URL}/mock-payment?donation_id=${params.donation_id}` +
      `&amount=${params.amount}&transaction_id=${transaction_id}`;

    console.log(
      `[Sahovat] [MOCK PAYME] Payment created: ${params.donation_id} for ${params.amount} UZS`,
    );

    return {
      transaction_id,
      checkout_url,
      provider: PaymentProvider.PAYME,
    };
  }

  /**
   * Verifies a mock webhook payload.
   * In mock mode this always returns `valid: true` as long as
   * the body contains the required fields.
   */
  verifyWebhook(
    _provider: PaymentProvider,
    _headers: Record<string, string>,
    body: unknown,
  ): WebhookVerificationResult {
    const invalid: WebhookVerificationResult = {
      valid: false,
      donation_id: null,
      transaction_id: null,
      status: null,
      amount: null,
    };

    if (typeof body !== 'object' || body === null) {
      return invalid;
    }

    const payload = body as Record<string, unknown>;

    if (
      typeof payload.donation_id !== 'string' ||
      typeof payload.transaction_id !== 'string' ||
      typeof payload.amount !== 'number' ||
      (payload.status !== 'completed' && payload.status !== 'failed')
    ) {
      return invalid;
    }

    console.log(
      `[Sahovat] [MOCK PAYME] Webhook verified: ${payload.donation_id} -> ${payload.status}`,
    );

    return {
      valid: true,
      donation_id: payload.donation_id,
      transaction_id: payload.transaction_id,
      status: payload.status,
      amount: payload.amount,
    };
  }
}

// ============================================================
// PAYME SERVICE (Sandbox — stub)
// ============================================================

class PaymeService implements PaymentService {
  private readonly mock = new MockPaymeService();

  /**
   * Creates a payment via the real PayMe sandbox.
   * Not yet implemented — falls back to mock behaviour.
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    console.log(
      '[Sahovat] [PAYME] Real PayMe integration not yet implemented, using mock',
    );
    return this.mock.createPayment(params);
  }

  /**
   * Verifies a webhook from the real PayMe sandbox.
   * Not yet implemented — falls back to mock behaviour.
   */
  verifyWebhook(
    provider: PaymentProvider,
    headers: Record<string, string>,
    body: unknown,
  ): WebhookVerificationResult {
    console.log(
      '[Sahovat] [PAYME] Real PayMe integration not yet implemented, using mock',
    );
    return this.mock.verifyWebhook(provider, headers, body);
  }
}

// ============================================================
// FACTORY
// ============================================================

/**
 * Creates the appropriate payment service based on environment.
 * Uses MockPaymeService when PAYME_MERCHANT_ID is not configured (development).
 */
export function createPaymentService(): PaymentService {
  if (!env.PAYME_MERCHANT_ID || env.NODE_ENV === 'test') {
    console.log('[Sahovat] Using mock PayMe payment service');
    return new MockPaymeService();
  }

  console.log('[Sahovat] Using PayMe payment service (sandbox mode)');
  return new PaymeService();
}

/** Singleton payment service instance */
export const paymentService: PaymentService = createPaymentService();
