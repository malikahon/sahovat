import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { PaymentProvider } from '../types/entities.js';
import { clickClient } from './click.client.js';
import type {
  PaymentService,
  CreatePaymentParams,
  PaymentResult,
  ChargeCardParams,
  ChargeCardResult,
  WebhookVerificationResult,
} from '../types/services.js';

// ============================================================
// MOCK CLICK SERVICE (Development / Testing)
// ============================================================

class MockClickService implements PaymentService {
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const transaction_id = randomUUID();

    const checkout_url = clickClient.buildCheckoutUrl(
      params.donation_id,
      params.amount,
      params.return_url,
    );

    console.log(
      `[Sahovat] [MOCK CLICK] Payment created: ${params.donation_id} for ${params.amount} UZS`,
    );

    return {
      transaction_id,
      checkout_url,
      provider: PaymentProvider.CLICK,
    };
  }

  async chargeCard(_params: ChargeCardParams): Promise<ChargeCardResult> {
    throw new Error('[Sahovat] [CLICK] Card tokenization is not supported by Click. Use redirect-based payment.');
  }

  verifyWebhook(
    provider: PaymentProvider,
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

    if (provider !== PaymentProvider.CLICK) {
      return invalid;
    }

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
      `[Sahovat] [MOCK CLICK] Webhook verified: ${payload.donation_id} -> ${payload.status}`,
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
// REAL CLICK SERVICE (Dormant until merchant account activated)
// ============================================================

class RealClickService implements PaymentService {
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const transaction_id = randomUUID();

    const checkout_url = clickClient.buildCheckoutUrl(
      params.donation_id,
      params.amount,
      params.return_url,
    );

    console.log(
      `[Sahovat] [CLICK] Payment created: ${params.donation_id} for ${params.amount} UZS`,
    );

    return {
      transaction_id,
      checkout_url,
      provider: PaymentProvider.CLICK,
    };
  }

  async chargeCard(_params: ChargeCardParams): Promise<ChargeCardResult> {
    throw new Error('[Sahovat] [CLICK] Card tokenization is not supported by Click. Use redirect-based payment.');
  }

  verifyWebhook(
    provider: PaymentProvider,
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

    if (provider !== PaymentProvider.CLICK) {
      return invalid;
    }

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
      `[Sahovat] [CLICK] Webhook verified: ${payload.donation_id} -> ${payload.status}`,
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
// FACTORY
// ============================================================

export function createClickService(): PaymentService {
  if (env.PAYMENT_PROVIDER_CLICK === 'real' && env.CLICK_SECRET_KEY && env.NODE_ENV !== 'test') {
    console.log('[Sahovat] Using real Click payment service');
    return new RealClickService();
  }

  console.log('[Sahovat] Using mock Click payment service');
  return new MockClickService();
}