import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { PaymentProvider } from '../types/entities.js';
import { paymeClient } from './payme.client.js';
import { createClickService } from './click-payment.service.js';
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

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const amountTiyin = params.amount * 100;

    try {
      const receipt = await paymeClient.receiptsCreate(
        amountTiyin,
        params.donation_id,
        `Donation ${params.donation_id}`,
      );

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

  verifyWebhook(
    provider: PaymentProvider,
    headers: Record<string, string>,
    body: unknown,
  ): WebhookVerificationResult {
    return this.fallback.verifyWebhook(provider, headers, body);
  }
}

// ============================================================
// PAYME FACTORY
// ============================================================

function createPaymeService(): PaymentService {
  if (!env.PAYME_MERCHANT_ID || env.NODE_ENV === 'test') {
    console.log('[Sahovat] Using mock PayMe payment service');
    return new MockPaymeService();
  }

  console.log('[Sahovat] Using real PayMe payment service (sandbox mode)');
  return new RealPaymeService();
}

// ============================================================
// PROVIDER REGISTRY
// ============================================================

const providerRegistry = new Map<PaymentProvider, PaymentService>([
  [PaymentProvider.PAYME, createPaymeService()],
  [PaymentProvider.CLICK, createClickService()],
]);

export const paymentService: PaymentService = {
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const service = providerRegistry.get(params.provider);
    if (!service) {
      throw new Error(`[Sahovat] Unsupported payment provider: ${params.provider}`);
    }
    return service.createPayment(params);
  },

  async chargeCard(params: ChargeCardParams): Promise<ChargeCardResult> {
    return providerRegistry.get(PaymentProvider.PAYME)!.chargeCard(params);
  },

  verifyWebhook(
    provider: PaymentProvider,
    headers: Record<string, string>,
    body: unknown,
  ): WebhookVerificationResult {
    const service = providerRegistry.get(provider);
    if (!service) {
      return {
        valid: false,
        donation_id: null,
        transaction_id: null,
        status: null,
        amount: null,
      };
    }
    return service.verifyWebhook(provider, headers, body);
  },
};