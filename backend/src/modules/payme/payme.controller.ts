import type { Request, Response } from 'express';
import { query, getClient } from '../../config/database.js';
import { env } from '../../config/env.js';
import { DonationStatus } from '../../types/entities.js';
import * as donationsService from '../donations/donations.service.js';
import {
  PaymeMethod,
  PaymeTxState,
  PaymeErrorCode,
  type PaymeJsonRpcRequest,
  type PaymeTransactionRow,
  type CheckPerformParams,
  type CreateTransactionParams,
  type PerformTransactionParams,
  type CancelTransactionParams,
  type CheckTransactionParams,
  type GetStatementParams,
} from './payme.types.js';

// ============================================================
// CONSTANTS
// ============================================================

/** PayMe pending transactions expire after 12 minutes. */
const TRANSACTION_TIMEOUT_MS = 12 * 60 * 1000;

// ============================================================
// ERROR HELPERS
// ============================================================

function paymeError(id: number, code: PaymeErrorCode, messageEn: string, data?: string) {
  return {
    jsonrpc: '2.0' as const,
    id,
    error: {
      code,
      message: { uz: messageEn, ru: messageEn, en: messageEn },
      ...(data ? { data } : {}),
    },
  };
}

function paymeResult(id: number, result: unknown) {
  return { jsonrpc: '2.0' as const, id, result };
}

// ============================================================
// AUTH VERIFICATION
// ============================================================

function verifyAuth(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
  // PayMe sends "Paycom:{PAYME_KEY}"
  const expectedKey = env.PAYME_KEY;

  // In mock mode (no credentials), accept any auth
  if (!expectedKey) {
    return true;
  }

  return decoded === `Paycom:${expectedKey}`;
}

// ============================================================
// MAIN HANDLER
// ============================================================

/**
 * POST /api/payme
 * Single endpoint that handles all PayMe Merchant API JSON-RPC calls.
 */
export async function handleMerchantApi(req: Request, res: Response): Promise<void> {
  const body = req.body as PaymeJsonRpcRequest;
  const rpcId = body.id ?? 0;

  // Auth check
  if (!verifyAuth(req)) {
    res.json(paymeError(rpcId, PaymeErrorCode.INSUFFICIENT_PRIVILEGES, 'Unauthorized'));
    return;
  }

  const { method, params } = body;

  try {
    switch (method) {
      case PaymeMethod.CheckPerformTransaction:
        res.json(await checkPerformTransaction(rpcId, params as CheckPerformParams));
        return;
      case PaymeMethod.CreateTransaction:
        res.json(await createTransaction(rpcId, params as CreateTransactionParams));
        return;
      case PaymeMethod.PerformTransaction:
        res.json(await performTransaction(rpcId, params as PerformTransactionParams));
        return;
      case PaymeMethod.CancelTransaction:
        res.json(await cancelTransaction(rpcId, params as CancelTransactionParams));
        return;
      case PaymeMethod.CheckTransaction:
        res.json(await checkTransaction(rpcId, params as CheckTransactionParams));
        return;
      case PaymeMethod.GetStatement:
        res.json(await getStatement(rpcId, params as GetStatementParams));
        return;
      default:
        res.json(paymeError(rpcId, PaymeErrorCode.METHOD_NOT_FOUND, `Method not found: ${method}`));
        return;
    }
  } catch (err) {
    console.error(`[Sahovat] [PAYME MERCHANT] Error handling ${method}:`, err);
    res.json(paymeError(rpcId, PaymeErrorCode.INTERNAL_ERROR, 'Internal server error'));
  }
}

// ============================================================
// METHOD HANDLERS
// ============================================================

/**
 * CheckPerformTransaction
 * Validate that the order (donation) exists, is pending, and the amount matches.
 */
async function checkPerformTransaction(id: number, params: CheckPerformParams) {
  const donationId = params.account?.order_id;
  if (!donationId) {
    return paymeError(id, PaymeErrorCode.ORDER_NOT_FOUND, 'order_id is required', 'order_id');
  }

  const result = await query(
    `SELECT id, amount, status FROM donations WHERE id = $1`,
    [donationId],
  );

  if (result.rows.length === 0) {
    return paymeError(id, PaymeErrorCode.ORDER_NOT_FOUND, 'Donation not found', 'order_id');
  }

  const donation = result.rows[0] as { id: string; amount: number; status: string };

  // Amount is in tiyin from PayMe, our DB stores UZS
  const expectedTiyin = Number(donation.amount) * 100;
  if (params.amount !== expectedTiyin) {
    return paymeError(id, PaymeErrorCode.INVALID_AMOUNT, 'Amount mismatch', 'amount');
  }

  if (donation.status === DonationStatus.COMPLETED) {
    return paymeError(id, PaymeErrorCode.ALREADY_PAID, 'Donation already completed');
  }

  if (donation.status !== DonationStatus.PENDING) {
    return paymeError(id, PaymeErrorCode.CANNOT_PERFORM, 'Donation is not in pending state');
  }

  return paymeResult(id, { allow: true });
}

/**
 * CreateTransaction
 * Creates a payme_transactions record. Idempotent — returns existing if already created.
 */
async function createTransaction(id: number, params: CreateTransactionParams) {
  const donationId = params.account?.order_id;
  if (!donationId) {
    return paymeError(id, PaymeErrorCode.ORDER_NOT_FOUND, 'order_id is required', 'order_id');
  }

  // Check if transaction with this payme_id already exists (idempotency)
  const existing = await query(
    `SELECT * FROM payme_transactions WHERE payme_id = $1`,
    [params.id],
  );

  if (existing.rows.length > 0) {
    const tx = existing.rows[0] as PaymeTransactionRow;
    const state = Number(tx.state);

    if (state === PaymeTxState.PENDING) {
      // Check timeout
      const createTime = Number(tx.create_time);
      if (Date.now() - createTime >= TRANSACTION_TIMEOUT_MS) {
        // Auto-cancel expired transaction
        await query(
          `UPDATE payme_transactions SET state = $1, reason = 4, cancel_time = $2 WHERE payme_id = $3`,
          [PaymeTxState.CANCELLED_PENDING, Date.now(), params.id],
        );
        return paymeError(id, PaymeErrorCode.CANNOT_PERFORM, 'Transaction expired');
      }

      return paymeResult(id, {
        create_time: createTime,
        transaction: tx.id,
        state: PaymeTxState.PENDING,
      });
    }

    // Already completed or cancelled — cannot create again
    return paymeError(id, PaymeErrorCode.CANNOT_PERFORM, 'Transaction already exists in non-pending state');
  }

  // Validate donation
  const donationResult = await query(
    `SELECT id, amount, status FROM donations WHERE id = $1`,
    [donationId],
  );

  if (donationResult.rows.length === 0) {
    return paymeError(id, PaymeErrorCode.ORDER_NOT_FOUND, 'Donation not found', 'order_id');
  }

  const donation = donationResult.rows[0] as { id: string; amount: number; status: string };

  const expectedTiyin = Number(donation.amount) * 100;
  if (params.amount !== expectedTiyin) {
    return paymeError(id, PaymeErrorCode.INVALID_AMOUNT, 'Amount mismatch', 'amount');
  }

  if (donation.status !== DonationStatus.PENDING) {
    return paymeError(id, PaymeErrorCode.CANNOT_PERFORM, 'Donation is not in pending state');
  }

  // Check if another PayMe transaction already exists for this donation
  const otherTx = await query(
    `SELECT id, state FROM payme_transactions WHERE donation_id = $1 AND state = $2`,
    [donationId, PaymeTxState.PENDING],
  );

  if (otherTx.rows.length > 0) {
    const otherRow = otherTx.rows[0] as PaymeTransactionRow;
    // Cancel the old pending transaction
    await query(
      `UPDATE payme_transactions SET state = $1, reason = 4, cancel_time = $2 WHERE id = $3`,
      [PaymeTxState.CANCELLED_PENDING, Date.now(), otherRow.id],
    );
  }

  // Create new transaction
  const createTime = params.time || Date.now();
  const insertResult = await query(
    `INSERT INTO payme_transactions (payme_id, donation_id, state, amount, create_time)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [params.id, donationId, PaymeTxState.PENDING, params.amount, createTime],
  );

  const tx = insertResult.rows[0] as PaymeTransactionRow;

  return paymeResult(id, {
    create_time: createTime,
    transaction: tx.id,
    state: PaymeTxState.PENDING,
  });
}

/**
 * PerformTransaction
 * Marks the transaction as completed and triggers donation confirmation.
 */
async function performTransaction(id: number, params: PerformTransactionParams) {
  const result = await query(
    `SELECT * FROM payme_transactions WHERE payme_id = $1`,
    [params.id],
  );

  if (result.rows.length === 0) {
    return paymeError(id, PaymeErrorCode.TRANSACTION_NOT_FOUND, 'Transaction not found');
  }

  const tx = result.rows[0] as PaymeTransactionRow;
  const state = Number(tx.state);

  // Idempotent: if already completed, return same result
  if (state === PaymeTxState.COMPLETED) {
    return paymeResult(id, {
      transaction: tx.id,
      perform_time: Number(tx.perform_time),
      state: PaymeTxState.COMPLETED,
    });
  }

  if (state !== PaymeTxState.PENDING) {
    return paymeError(id, PaymeErrorCode.CANNOT_PERFORM, 'Transaction is not in pending state');
  }

  // Check timeout
  const createTime = Number(tx.create_time);
  if (Date.now() - createTime >= TRANSACTION_TIMEOUT_MS) {
    await query(
      `UPDATE payme_transactions SET state = $1, reason = 4, cancel_time = $2 WHERE payme_id = $3`,
      [PaymeTxState.CANCELLED_PENDING, Date.now(), params.id],
    );
    return paymeError(id, PaymeErrorCode.CANNOT_PERFORM, 'Transaction expired');
  }

  const performTime = Date.now();

  // Update PayMe transaction
  await query(
    `UPDATE payme_transactions SET state = $1, perform_time = $2 WHERE payme_id = $3`,
    [PaymeTxState.COMPLETED, performTime, params.id],
  );

  // Confirm the donation in our system
  try {
    await donationsService.confirmDonation(
      tx.donation_id,
      params.id,
      'completed',
      Number(tx.amount) / 100, // Convert tiyin back to UZS
    );
  } catch (err) {
    console.error(`[Sahovat] [PAYME MERCHANT] PerformTransaction: donation confirmation failed:`, err);
    // Still return success to PayMe — the transaction is performed on their side
  }

  return paymeResult(id, {
    transaction: tx.id,
    perform_time: performTime,
    state: PaymeTxState.COMPLETED,
  });
}

/**
 * CancelTransaction
 * Cancels a pending or completed transaction.
 */
async function cancelTransaction(id: number, params: CancelTransactionParams) {
  const result = await query(
    `SELECT * FROM payme_transactions WHERE payme_id = $1`,
    [params.id],
  );

  if (result.rows.length === 0) {
    return paymeError(id, PaymeErrorCode.TRANSACTION_NOT_FOUND, 'Transaction not found');
  }

  const tx = result.rows[0] as PaymeTransactionRow;
  const state = Number(tx.state);

  // Already cancelled — idempotent
  if (state === PaymeTxState.CANCELLED_PENDING || state === PaymeTxState.CANCELLED_COMPLETED) {
    return paymeResult(id, {
      transaction: tx.id,
      cancel_time: Number(tx.cancel_time),
      state,
    });
  }

  const cancelTime = Date.now();
  let newState: PaymeTxState;

  if (state === PaymeTxState.PENDING) {
    newState = PaymeTxState.CANCELLED_PENDING;
  } else if (state === PaymeTxState.COMPLETED) {
    newState = PaymeTxState.CANCELLED_COMPLETED;
  } else {
    return paymeError(id, PaymeErrorCode.CANNOT_PERFORM, 'Cannot cancel transaction in current state');
  }

  await query(
    `UPDATE payme_transactions SET state = $1, reason = $2, cancel_time = $3 WHERE payme_id = $4`,
    [newState, params.reason, cancelTime, params.id],
  );

  // If was completed, mark donation as failed/refunded
  if (state === PaymeTxState.COMPLETED) {
    try {
      const client = await getClient();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE donations SET status = $1 WHERE id = $2 AND status = $3`,
          [DonationStatus.REFUNDED, tx.donation_id, DonationStatus.COMPLETED],
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`[Sahovat] [PAYME MERCHANT] CancelTransaction: refund failed for donation ${tx.donation_id}:`, err);
    }
  } else {
    // Was pending — just mark as failed
    try {
      await query(
        `UPDATE donations SET status = $1 WHERE id = $2 AND status = $3`,
        [DonationStatus.FAILED, tx.donation_id, DonationStatus.PENDING],
      );
    } catch (err) {
      console.error(`[Sahovat] [PAYME MERCHANT] CancelTransaction: failed to update donation ${tx.donation_id}:`, err);
    }
  }

  return paymeResult(id, {
    transaction: tx.id,
    cancel_time: cancelTime,
    state: newState,
  });
}

/**
 * CheckTransaction
 * Returns the current state of a transaction.
 */
async function checkTransaction(id: number, params: CheckTransactionParams) {
  const result = await query(
    `SELECT * FROM payme_transactions WHERE payme_id = $1`,
    [params.id],
  );

  if (result.rows.length === 0) {
    return paymeError(id, PaymeErrorCode.TRANSACTION_NOT_FOUND, 'Transaction not found');
  }

  const tx = result.rows[0] as PaymeTransactionRow;

  return paymeResult(id, {
    create_time: Number(tx.create_time),
    perform_time: Number(tx.perform_time),
    cancel_time: Number(tx.cancel_time),
    transaction: tx.id,
    state: Number(tx.state),
    reason: tx.reason ? Number(tx.reason) : null,
  });
}

/**
 * GetStatement
 * Returns transactions within a time range.
 */
async function getStatement(id: number, params: GetStatementParams) {
  const result = await query(
    `SELECT * FROM payme_transactions
     WHERE create_time >= $1 AND create_time <= $2
     ORDER BY create_time ASC`,
    [params.from, params.to],
  );

  const transactions = (result.rows as PaymeTransactionRow[]).map((tx) => ({
    id: tx.payme_id,
    time: Number(tx.create_time),
    amount: Number(tx.amount),
    account: { order_id: tx.donation_id },
    create_time: Number(tx.create_time),
    perform_time: Number(tx.perform_time),
    cancel_time: Number(tx.cancel_time),
    transaction: tx.id,
    state: Number(tx.state),
    reason: tx.reason ? Number(tx.reason) : null,
  }));

  return paymeResult(id, { transactions });
}
