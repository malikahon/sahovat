import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { query } from '../../config/database.js';
import { env } from '../../config/env.js';
import { clickClient } from '../../services/click.client.js';
import { ClickAction, ClickErrorCode, type ClickWebhookPayload, type ClickTransactionRow } from './click.types.js';
import { DonationStatus } from '../../types/entities.js';
import * as donationsService from '../donations/donations.service.js';

// ============================================================
// RESPONSE HELPERS
// ============================================================

function clickError(errorCode: ClickErrorCode, errorNote: string) {
  return { error: errorCode, error_note: errorNote };
}

function clickPrepareSuccess(clickTransId: number, merchantTransId: string, merchantPrepareId: string) {
  return {
    click_trans_id: clickTransId,
    merchant_trans_id: merchantTransId,
    merchant_prepare_id: merchantPrepareId,
    error: ClickErrorCode.SUCCESS,
    error_note: '',
  };
}

function clickCompleteSuccess(clickTransId: number, merchantTransId: string, merchantConfirmId: string) {
  return {
    click_trans_id: clickTransId,
    merchant_trans_id: merchantTransId,
    merchant_confirm_id: merchantConfirmId,
    error: ClickErrorCode.SUCCESS,
    error_note: '',
  };
}

// ============================================================
// PREPARE HANDLER
// ============================================================

/**
 * POST /api/click/prepare
 * Click calls this before redirecting the user to payment.
 * We validate the sign, check that the donation exists and is pending,
 * and return a merchant_prepare_id to Click.
 */
export async function handlePrepare(req: Request, res: Response): Promise<void> {
  const payload = req.body as ClickWebhookPayload;

  if (payload.action !== ClickAction.PREPARE) {
    res.json(clickError(ClickErrorCode.INVALID_PARAMETER, 'Invalid action'));
    return;
  }

  // Verify MD5 signature (mock mode skips via MockClickClient)
  if (env.PAYMENT_PROVIDER_CLICK === 'real') {
    if (!clickClient.verifySign(payload)) {
      res.json(clickError(ClickErrorCode.SIGN_CHECK_FAILED, 'Sign check failed'));
      return;
    }
  }

  // Check for idempotency: if this click_trans_id already processed, return existing result
  const existing = await query(
    'SELECT * FROM click_transactions WHERE click_trans_id = $1',
    [String(payload.click_trans_id)],
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as ClickTransactionRow;
    // Already prepared or completed — return idempotent success
    res.json(clickPrepareSuccess(
      payload.click_trans_id,
      payload.merchant_trans_id,
      row.merchant_prepare_id,
    ));
    return;
  }

  // Look up the donation
  const donationResult = await query(
    'SELECT id, status, amount FROM donations WHERE id = $1',
    [payload.merchant_trans_id],
  );

  if (donationResult.rows.length === 0) {
    res.json(clickError(ClickErrorCode.TRANSACTION_NOT_FOUND, 'Transaction not found'));
    return;
  }

  const donation = donationResult.rows[0];

  if (donation.status !== DonationStatus.PENDING) {
    res.json(clickError(ClickErrorCode.ALREADY_PAID, 'Already paid'));
    return;
  }

  // Verify amount matches
  if (Number(payload.amount) !== Number(donation.amount)) {
    res.json(clickError(ClickErrorCode.INVALID_AMOUNT, 'Invalid amount'));
    return;
  }

  // Insert prepare record
  const merchantPrepareId = crypto.randomUUID();

  await query(
    `INSERT INTO click_transactions (click_trans_id, donation_id, merchant_prepare_id, state, amount)
     VALUES ($1, $2, $3, $4, $5)`,
    [String(payload.click_trans_id), payload.merchant_trans_id, merchantPrepareId, 0, payload.amount],
  );

  res.json(clickPrepareSuccess(
    payload.click_trans_id,
    payload.merchant_trans_id,
    merchantPrepareId,
  ));
}

// ============================================================
// COMPLETE HANDLER
// ============================================================

/**
 * POST /api/click/complete
 * Click calls this after the user successfully pays.
 * We confirm the donation and return a merchant_confirm_id.
 */
export async function handleComplete(req: Request, res: Response): Promise<void> {
  const payload = req.body as ClickWebhookPayload;

  if (payload.action !== ClickAction.COMPLETE) {
    res.json(clickError(ClickErrorCode.INVALID_PARAMETER, 'Invalid action'));
    return;
  }

  // Verify MD5 signature (mock mode skips via MockClickClient)
  if (env.PAYMENT_PROVIDER_CLICK === 'real') {
    if (!clickClient.verifySign(payload)) {
      res.json(clickError(ClickErrorCode.SIGN_CHECK_FAILED, 'Sign check failed'));
      return;
    }
  }

  // Find the prepare record
  const existing = await query(
    'SELECT * FROM click_transactions WHERE click_trans_id = $1',
    [String(payload.click_trans_id)],
  );

  if (existing.rows.length === 0) {
    res.json(clickError(ClickErrorCode.TRANSACTION_NOT_FOUND, 'Transaction not found'));
    return;
  }

  const row = existing.rows[0] as ClickTransactionRow;

  // Already completed — idempotent success
  if (row.state === 1) {
    res.json(clickCompleteSuccess(
      payload.click_trans_id,
      payload.merchant_trans_id,
      row.id,
    ));
    return;
  }

  // Verify merchant_prepare_id matches if provided
  if (payload.merchant_prepare_id !== undefined && String(payload.merchant_prepare_id) !== row.merchant_prepare_id) {
    res.json(clickError(ClickErrorCode.INVALID_PARAMETER, 'Invalid merchant_prepare_id'));
    return;
  }

  // Confirm the donation via shared service
  try {
    await donationsService.confirmDonation(
      row.donation_id,
      row.click_trans_id,
      'completed',
      Number(row.amount),
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes('already processed')) {
      // Donation already confirmed from duplicate webhook — idempotent
      res.json(clickCompleteSuccess(
        payload.click_trans_id,
        payload.merchant_trans_id,
        row.id,
      ));
      return;
    }
    throw err;
  }

  // Update click_transactions to completed state
  await query(
    `UPDATE click_transactions SET state = $1, perform_time = NOW() WHERE id = $2`,
    [1, row.id],
  );

  res.json(clickCompleteSuccess(
    payload.click_trans_id,
    payload.merchant_trans_id,
    row.id,
  ));
}