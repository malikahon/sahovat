import { randomUUID, createHash } from 'node:crypto';
import { env } from '../config/env.js';

// ============================================================
// TYPES
// ============================================================

export interface PaymeCardResult {
  number: string;    // masked: "860006******6311"
  expire: string;    // "03/99"
  token: string;
  recurrent: boolean;
  verify: boolean;
}

export interface PaymeVerifyCodeResult {
  sent: boolean;
  phone: string;     // masked: "99890*****31"
  wait: number;      // ms until OTP expires
}

export interface PaymeReceiptResult {
  _id: string;
  create_time: number;
  pay_time: number;
  cancel_time: number;
  state: number;
  amount: number;
  account: Array<{ name: string; title: string; value: string }>;
}

export interface PaymeError {
  code: number;
  message: { uz: string; ru: string; en: string };
  data?: string;
}

// ============================================================
// PAYME CLIENT INTERFACE
// ============================================================

export interface PaymeClient {
  // Card methods (Subscribe API)
  cardsCreate(cardNumber: string, cardExpire: string, save?: boolean): Promise<PaymeCardResult>;
  cardsGetVerifyCode(token: string): Promise<PaymeVerifyCodeResult>;
  cardsVerify(token: string, code: string): Promise<PaymeCardResult>;
  cardsCheck(token: string): Promise<PaymeCardResult>;
  cardsRemove(token: string): Promise<{ success: boolean }>;

  // Receipt methods (Subscribe API)
  receiptsCreate(amount: number, orderId: string, description?: string): Promise<PaymeReceiptResult>;
  receiptsPay(receiptId: string, cardToken: string, payerPhone?: string): Promise<PaymeReceiptResult>;
  receiptsCheck(receiptId: string): Promise<PaymeReceiptResult>;
  receiptsCancel(receiptId: string): Promise<PaymeReceiptResult>;
}

// ============================================================
// JSON-RPC HELPERS
// ============================================================

let rpcIdCounter = 1;

function nextRpcId(): number {
  return rpcIdCounter++;
}

// ============================================================
// REAL PAYME CLIENT (calls PayMe Subscribe API)
// ============================================================

class RealPaymeClient implements PaymeClient {
  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly merchantKey: string;

  constructor() {
    this.baseUrl = env.PAYME_SUBSCRIBE_URL;
    this.merchantId = env.PAYME_MERCHANT_ID;
    this.merchantKey = env.PAYME_KEY;
  }

  private clientAuth(): string {
    return this.merchantId;
  }

  private serverAuth(): string {
    return `${this.merchantId}:${this.merchantKey}`;
  }

  private async rpc<T>(method: string, params: Record<string, unknown>, serverSide: boolean): Promise<T> {
    const id = nextRpcId();
    const auth = serverSide ? this.serverAuth() : this.clientAuth();

    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth': auth,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }),
    });

    const data = await res.json() as { result?: T; error?: PaymeError };

    if (data.error) {
      const msg = data.error.message?.en || data.error.message?.ru || 'PayMe API error';
      const err = new Error(`[PayMe] ${method} failed: ${msg} (code: ${data.error.code})`);
      (err as Error & { paymeCode: number }).paymeCode = data.error.code;
      throw err;
    }

    return data.result as T;
  }

  async cardsCreate(cardNumber: string, cardExpire: string, save = true): Promise<PaymeCardResult> {
    const result = await this.rpc<{ card: PaymeCardResult }>('cards.create', {
      card: { number: cardNumber, expire: cardExpire },
      save,
    }, false);
    return result.card;
  }

  async cardsGetVerifyCode(token: string): Promise<PaymeVerifyCodeResult> {
    return this.rpc<PaymeVerifyCodeResult>('cards.get_verify_code', { token }, false);
  }

  async cardsVerify(token: string, code: string): Promise<PaymeCardResult> {
    const result = await this.rpc<{ card: PaymeCardResult }>('cards.verify', { token, code }, false);
    return result.card;
  }

  async cardsCheck(token: string): Promise<PaymeCardResult> {
    const result = await this.rpc<{ card: PaymeCardResult }>('cards.check', { token }, true);
    return result.card;
  }

  async cardsRemove(token: string): Promise<{ success: boolean }> {
    return this.rpc<{ success: boolean }>('cards.remove', { token }, true);
  }

  async receiptsCreate(amount: number, orderId: string, description?: string): Promise<PaymeReceiptResult> {
    const result = await this.rpc<{ receipt: PaymeReceiptResult }>('receipts.create', {
      amount,
      account: { order_id: orderId },
      description: description || `Donation ${orderId}`,
      detail: {
        receipt_type: 0,
        items: [{
          title: 'Donation',
          price: amount,
          count: 1,
          code: '00702001001000001',
          vat_percent: 0,
          package_code: '123456',
        }],
      },
    }, true);
    return result.receipt;
  }

  async receiptsPay(receiptId: string, cardToken: string, payerPhone?: string): Promise<PaymeReceiptResult> {
    const params: Record<string, unknown> = { id: receiptId, token: cardToken };
    if (payerPhone) {
      params.payer = { phone: payerPhone };
    }
    const result = await this.rpc<{ receipt: PaymeReceiptResult }>('receipts.pay', params, true);
    return result.receipt;
  }

  async receiptsCheck(receiptId: string): Promise<PaymeReceiptResult> {
    const result = await this.rpc<{ receipt: PaymeReceiptResult }>('receipts.check', { id: receiptId }, true);
    return result.receipt;
  }

  async receiptsCancel(receiptId: string): Promise<PaymeReceiptResult> {
    const result = await this.rpc<{ receipt: PaymeReceiptResult }>('receipts.cancel', { id: receiptId }, true);
    return result.receipt;
  }
}

// ============================================================
// MOCK PAYME CLIENT (faithful simulation for development)
// ============================================================

class MockPaymeClient implements PaymeClient {
  /**
   * In-memory store for mock cards and receipts.
   * Tokens are deterministic hashes so the same card always produces the same token.
   */
  private cards = new Map<string, { number: string; expire: string; verified: boolean }>();
  private receipts = new Map<string, { amount: number; state: number; orderId: string; payTime: number; cancelTime: number }>();

  private generateToken(cardNumber: string): string {
    return createHash('sha256').update(`mock_card_${cardNumber}`).digest('hex').slice(0, 40);
  }

  private maskCardNumber(num: string): string {
    const clean = num.replace(/\s/g, '');
    return `${clean.slice(0, 6)}******${clean.slice(-4)}`;
  }

  private detectCardType(num: string): string {
    const clean = num.replace(/\s/g, '');
    if (clean.startsWith('8600')) return 'uzcard';
    if (clean.startsWith('9860')) return 'humo';
    return 'unknown';
  }

  async cardsCreate(cardNumber: string, cardExpire: string, _save = true): Promise<PaymeCardResult> {
    const clean = cardNumber.replace(/\s/g, '');

    // Simulate error cards
    if (clean === '3333336415804657') {
      throw new Error('[PayMe] cards.create failed: Card expired (code: -31400)');
    }
    if (clean === '4444445987459073') {
      throw new Error('[PayMe] cards.create failed: Card blocked (code: -31400)');
    }

    const token = this.generateToken(clean);
    this.cards.set(token, { number: clean, expire: cardExpire, verified: false });

    console.log(`[Sahovat] [MOCK PAYME] cards.create: ${this.maskCardNumber(clean)} -> token ${token.slice(0, 12)}...`);

    return {
      number: this.maskCardNumber(clean),
      expire: `${cardExpire.slice(0, 2)}/${cardExpire.slice(2)}`,
      token,
      recurrent: true,
      verify: false,
    };
  }

  async cardsGetVerifyCode(token: string): Promise<PaymeVerifyCodeResult> {
    const card = this.cards.get(token);
    if (!card) {
      throw new Error('[PayMe] cards.get_verify_code failed: Card not found (code: -31400)');
    }

    console.log(`[Sahovat] [MOCK PAYME] cards.get_verify_code: OTP sent (use 666666)`);

    return {
      sent: true,
      phone: '998XX*****XX',
      wait: 60000,
    };
  }

  async cardsVerify(token: string, code: string): Promise<PaymeCardResult> {
    const card = this.cards.get(token);
    if (!card) {
      throw new Error('[PayMe] cards.verify failed: Card not found (code: -31400)');
    }

    if (code !== '666666') {
      throw new Error('[PayMe] cards.verify failed: Invalid OTP code (code: -31001)');
    }

    card.verified = true;

    console.log(`[Sahovat] [MOCK PAYME] cards.verify: ${this.maskCardNumber(card.number)} verified successfully`);

    return {
      number: this.maskCardNumber(card.number),
      expire: `${card.expire.slice(0, 2)}/${card.expire.slice(2)}`,
      token,
      recurrent: true,
      verify: true,
    };
  }

  async cardsCheck(token: string): Promise<PaymeCardResult> {
    const card = this.cards.get(token);
    if (!card) {
      throw new Error('[PayMe] cards.check failed: Card not found (code: -31400)');
    }

    return {
      number: this.maskCardNumber(card.number),
      expire: `${card.expire.slice(0, 2)}/${card.expire.slice(2)}`,
      token,
      recurrent: true,
      verify: card.verified,
    };
  }

  async cardsRemove(token: string): Promise<{ success: boolean }> {
    const deleted = this.cards.delete(token);
    console.log(`[Sahovat] [MOCK PAYME] cards.remove: ${deleted ? 'removed' : 'not found'}`);
    return { success: deleted };
  }

  async receiptsCreate(amount: number, orderId: string, _description?: string): Promise<PaymeReceiptResult> {
    const receiptId = randomUUID().replace(/-/g, '').slice(0, 24);
    const now = Date.now();

    this.receipts.set(receiptId, { amount, state: 0, orderId, payTime: 0, cancelTime: 0 });

    console.log(`[Sahovat] [MOCK PAYME] receipts.create: ${receiptId} for ${amount} tiyin (order: ${orderId})`);

    return {
      _id: receiptId,
      create_time: now,
      pay_time: 0,
      cancel_time: 0,
      state: 0,
      amount,
      account: [{ name: 'order_id', title: 'Order', value: orderId }],
    };
  }

  async receiptsPay(receiptId: string, cardToken: string, _payerPhone?: string): Promise<PaymeReceiptResult> {
    const receipt = this.receipts.get(receiptId);
    if (!receipt) {
      throw new Error('[PayMe] receipts.pay failed: Receipt not found (code: -31003)');
    }

    const card = this.cards.get(cardToken);
    if (!card) {
      throw new Error('[PayMe] receipts.pay failed: Card not found (code: -31400)');
    }

    if (!card.verified) {
      throw new Error('[PayMe] receipts.pay failed: Card not verified (code: -31008)');
    }

    receipt.state = 4; // Paid
    receipt.payTime = Date.now();

    console.log(`[Sahovat] [MOCK PAYME] receipts.pay: ${receiptId} paid successfully`);

    return {
      _id: receiptId,
      create_time: receipt.payTime - 1000,
      pay_time: receipt.payTime,
      cancel_time: 0,
      state: 4,
      amount: receipt.amount,
      account: [{ name: 'order_id', title: 'Order', value: receipt.orderId }],
    };
  }

  async receiptsCheck(receiptId: string): Promise<PaymeReceiptResult> {
    const receipt = this.receipts.get(receiptId);
    if (!receipt) {
      throw new Error('[PayMe] receipts.check failed: Receipt not found (code: -31003)');
    }

    return {
      _id: receiptId,
      create_time: Date.now() - 60000,
      pay_time: receipt.payTime,
      cancel_time: receipt.cancelTime,
      state: receipt.state,
      amount: receipt.amount,
      account: [{ name: 'order_id', title: 'Order', value: receipt.orderId }],
    };
  }

  async receiptsCancel(receiptId: string): Promise<PaymeReceiptResult> {
    const receipt = this.receipts.get(receiptId);
    if (!receipt) {
      throw new Error('[PayMe] receipts.cancel failed: Receipt not found (code: -31003)');
    }

    receipt.state = 50; // Cancelled
    receipt.cancelTime = Date.now();

    console.log(`[Sahovat] [MOCK PAYME] receipts.cancel: ${receiptId} cancelled`);

    return {
      _id: receiptId,
      create_time: Date.now() - 60000,
      pay_time: receipt.payTime,
      cancel_time: receipt.cancelTime,
      state: 50,
      amount: receipt.amount,
      account: [{ name: 'order_id', title: 'Order', value: receipt.orderId }],
    };
  }
}

// ============================================================
// FACTORY
// ============================================================

export function createPaymeClient(): PaymeClient {
  if (!env.PAYME_MERCHANT_ID || env.NODE_ENV === 'test') {
    console.log('[Sahovat] Using mock PayMe client');
    return new MockPaymeClient();
  }

  console.log(`[Sahovat] Using real PayMe client (${env.PAYME_SANDBOX ? 'sandbox' : 'production'})`);
  return new RealPaymeClient();
}

/** Singleton PayMe client */
export const paymeClient: PaymeClient = createPaymeClient();
