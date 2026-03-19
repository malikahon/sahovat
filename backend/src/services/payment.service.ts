import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { PaymentProvider } from '../types/entities.js';
import { paymeClient } from './payme.client.js';
import type {
  PaymentService,
  CreatePaymentParams,
  PaymentResult,
  ChargeCardParams,
  ChargeCardResult,
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
   * Charges a saved card using the mock PayMe client.
   * Creates a receipt and pays it in a single call.
   */
  async chargeCard(params: ChargeCardParams): Promise<ChargeCardResult> {
    const amountTiyin = params.amount * 100;

    try {
      const receipt = await paymeClient.receiptsCreate(
        amountTiyin,
        params.donation_id,
        `Donation ${params.donation_id}`,
      );

      const paidReceipt = await paymeClient.receiptsPay(
        receipt._id,
        params.card_token,
        params.payer_phone,
      );

      console.log(
        `[Sahovat] [MOCK PAYME] Card charged: ${params.donation_id} for ${params.amount} UZS (receipt: ${receipt._id})`,
      );

      return {
        success: paidReceipt.state === 4,
        receipt_id: receipt._id,
        transaction_id: receipt._id,
        state: paidReceipt.state,
      };
    } catch (err) {
      console.error(`[Sahovat] [MOCK PAYME] Card charge failed:`, err);
      return {
        success: false,
        receipt_id: null,
        transaction_id: randomUUID(),
        state: 0,
        error: err instanceof Error ? err.message : 'Card charge failed',
      };
    }
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
// REAL PAYME SERVICE (Sandbox/Production via Subscribe API)
// ============================================================

class RealPaymeService implements PaymentService {
  private readonly fallback = new MockPaymeService();

  /**
   * Creates a payment receipt via the PayMe Subscribe API.
   * Returns a checkout URL for redirect-based payment (when no saved card).
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const amountTiyin = params.amount * 100;

    try {
      const receipt = await paymeClient.receiptsCreate(
        amountTiyin,
        params.donation_id,
        `Donation ${params.donation_id}`,
      );

      // Build PayMe checkout URL
      const checkoutBase = env.PAYME_SANDBOX
        ? 'https://checkout.test.paycom.uz'
        : 'https://checkout.paycom.uz';

      const checkout_url = `${checkoutBase}/${receipt._id}`;

      return {
        transaction_id: receipt._id,
        checkout_url,
        provider: PaymentProvider.PAYME,
      };
    } catch (err) {
      console.error('[Sahovat] [PAYME] createPayment failed, falling back to mock:', err);
      return this.fallback.createPayment(params);
    }
  }

  /**
   * Charges a saved card via the PayMe Subscribe API.
   */
  async chargeCard(params: ChargeCardParams): Promise<ChargeCardResult> {
    const amountTiyin = params.amount * 100;

    try {
      const receipt = await paymeClient.receiptsCreate(
        amountTiyin,
        params.donation_id,
        `Donation ${params.donation_id}`,
      );

      const paidReceipt = await paymeClient.receiptsPay(
        receipt._id,
        params.card_token,
        params.payer_phone,
      );

      return {
        success: paidReceipt.state === 4,
        receipt_id: receipt._id,
        transaction_id: receipt._id,
        state: paidReceipt.state,
      };
    } catch (err) {
      console.error('[Sahovat] [PAYME] chargeCard failed:', err);
      return {
        success: false,
        receipt_id: null,
        transaction_id: randomUUID(),
        state: 0,
        error: err instanceof Error ? err.message : 'Card charge failed',
      };
    }
  }

  /**
   * Webhook verification for real PayMe.
   * The actual verification happens in the Merchant API controller (/api/payme).
   * This method is kept for backward compatibility with the simple webhook endpoint.
   */
  verifyWebhook(
    provider: PaymentProvider,
    headers: Record<string, string>,
    body: unknown,
  ): WebhookVerificationResult {
    // For the legacy webhook endpoint, fall back to mock verification.
    // Real PayMe uses the Merchant API endpoint at /api/payme instead.
    return this.fallback.verifyWebhook(provider, headers, body);
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

  console.log('[Sahovat] Using real PayMe payment service (sandbox mode)');
  return new RealPaymeService();
}

/** Singleton payment service instance */
export const paymentService: PaymentService = createPaymentService();
