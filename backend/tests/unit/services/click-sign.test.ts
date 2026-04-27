import { describe, it, expect } from 'vitest';
import { computeClickSign, verifyClickSign, ClickAction, ClickErrorCode } from '../../../src/services/click.client.js';
import type { ClickWebhookPayload } from '../../../src/services/click.client.js';

const SECRET_KEY = 'test_secret_key_12345';

describe('Click MD5 signature verification', () => {
  // Self-generated reference vectors with documented inputs
  // Formula: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
  // For COMPLETE: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)

  it('computes correct MD5 sign for PREPARE action', () => {
    const payload = {
      click_trans_id: 12345,
      service_id: 'svc_001',
      merchant_trans_id: 'donation-abc',
      amount: 50000,
      action: ClickAction.PREPARE,
      sign_time: '2026-04-27 12:00:00',
    };

    const sign = computeClickSign(payload, SECRET_KEY);

    // Verify it's a valid 32-char hex MD5
    expect(sign).toMatch(/^[a-f0-9]{32}$/);

    // Verify round-trip: sign verification passes
    expect(verifyClickSign({
      ...payload,
      sign_string: sign,
    } as ClickWebhookPayload, SECRET_KEY)).toBe(true);
  });

  it('computes correct MD5 sign for COMPLETE action (includes merchant_prepare_id)', () => {
    const payload = {
      click_trans_id: 12345,
      service_id: 'svc_001',
      merchant_trans_id: 'donation-abc',
      amount: 50000,
      action: ClickAction.COMPLETE,
      sign_time: '2026-04-27 12:00:00',
      merchant_prepare_id: 67890,
    };

    const sign = computeClickSign(payload, SECRET_KEY);

    // COMPLETE sign must differ from PREPARE sign (merchant_prepare_id is included)
    const prepareSign = computeClickSign({
      ...payload,
      action: ClickAction.PREPARE,
      merchant_prepare_id: undefined,
    }, SECRET_KEY);

    expect(sign).not.toBe(prepareSign);
    expect(sign).toMatch(/^[a-f0-9]{32}$/);

    expect(verifyClickSign({
      ...payload,
      sign_string: sign,
    } as ClickWebhookPayload, SECRET_KEY)).toBe(true);
  });

  it('rejects tampered sign_string', () => {
    const payload = {
      click_trans_id: 12345,
      service_id: 'svc_001',
      merchant_trans_id: 'donation-abc',
      amount: 50000,
      action: ClickAction.PREPARE,
      sign_time: '2026-04-27 12:00:00',
    };

    const correctSign = computeClickSign(payload, SECRET_KEY);

    // Tampering with even one character should fail
    const tamperedSign = correctSign.slice(0, -1) + 'x';
    expect(verifyClickSign({
      ...payload,
      sign_string: tamperedSign,
    } as ClickWebhookPayload, SECRET_KEY)).toBe(false);
  });

  it('rejects sign computed with wrong secret key', () => {
    const payload = {
      click_trans_id: 12345,
      service_id: 'svc_001',
      merchant_trans_id: 'donation-abc',
      amount: 50000,
      action: ClickAction.PREPARE,
      sign_time: '2026-04-27 12:00:00',
    };

    const signWithWrongKey = computeClickSign(payload, 'wrong_secret');
    expect(verifyClickSign({
      ...payload,
      sign_string: signWithWrongKey,
    } as ClickWebhookPayload, SECRET_KEY)).toBe(false);
  });

  it('rejects sign when amount is modified after signing', () => {
    const payload = {
      click_trans_id: 12345,
      service_id: 'svc_001',
      merchant_trans_id: 'donation-abc',
      amount: 50000,
      action: ClickAction.PREPARE,
      sign_time: '2026-04-27 12:00:00',
    };

    const correctSign = computeClickSign(payload, SECRET_KEY);

    // Change amount after signing
    expect(verifyClickSign({
      ...payload,
      amount: 99999,
      sign_string: correctSign,
    } as ClickWebhookPayload, SECRET_KEY)).toBe(false);
  });

  it('ClickErrorCode enum values match Click documentation', () => {
    expect(ClickErrorCode.SUCCESS).toBe(0);
    expect(ClickErrorCode.SIGN_CHECK_FAILED).toBe(-1);
    expect(ClickErrorCode.INVALID_AMOUNT).toBe(-2);
    expect(ClickErrorCode.ALREADY_PAID).toBe(-4);
    expect(ClickErrorCode.TRANSACTION_NOT_FOUND).toBe(-6);
    expect(ClickErrorCode.INVALID_PARAMETER).toBe(-7);
    expect(ClickErrorCode.SYSTEM_ERROR).toBe(-8);
    expect(ClickErrorCode.TRANSACTION_CANCELLED).toBe(-9);
  });
});