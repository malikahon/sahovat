import { query, getClient } from '../../config/database.js';
import { encrypt, decrypt } from '../../lib/encryption.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import type { CreateWithdrawalAccountDto, UpdateWithdrawalAccountDto } from '../../types/api.js';
import type { WithdrawalAccountRow, SafeWithdrawalAccount } from './withdrawal-accounts.types.js';

// ============================================================
// HELPERS
// ============================================================

/**
 * Masks a card number for display: "8600 **** **** 1234"
 */
export function maskCardNumber(decryptedNumber: string): string {
  const first4 = decryptedNumber.slice(0, 4);
  const last4 = decryptedNumber.slice(-4);
  return `${first4} **** **** ${last4}`;
}

/**
 * Converts a raw DB row to a safe API response object.
 * Decrypts the card number and masks it.
 */
export function toSafeAccount(row: WithdrawalAccountRow): SafeWithdrawalAccount {
  const decryptedNumber = decrypt(row.account_number_encrypted);
  return {
    id: row.id,
    user_id: row.user_id,
    provider: row.provider,
    account_number_masked: maskCardNumber(decryptedNumber),
    account_holder_name: row.account_holder_name,
    is_primary: row.is_primary,
    is_verified: row.is_verified,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ============================================================
// CREATE ACCOUNT
// ============================================================

/**
 * Creates a new withdrawal account for a user.
 * Encrypts the card number before storing.
 * If the user has no other accounts, sets is_primary=true automatically.
 * If is_primary is explicitly true, unsets all other primary accounts first.
 */
export async function createAccount(
  userId: string,
  data: CreateWithdrawalAccountDto,
): Promise<SafeWithdrawalAccount> {
  const encryptedNumber = encrypt(data.account_number);

  // Check if user has any existing accounts
  const existingResult = await query(
    'SELECT COUNT(*)::int AS count FROM withdrawal_accounts WHERE user_id = $1',
    [userId],
  );
  const existingCount = (existingResult.rows[0] as { count: number }).count;
  const shouldBePrimary = existingCount === 0 || data.is_primary === true;

  if (shouldBePrimary && existingCount > 0) {
    // Need a transaction to unset other primaries and insert
    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE withdrawal_accounts SET is_primary = FALSE, updated_at = NOW() WHERE user_id = $1 AND is_primary = TRUE',
        [userId],
      );

      const result = await client.query(
        `INSERT INTO withdrawal_accounts (user_id, provider, account_number_encrypted, account_holder_name, is_primary)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING *`,
        [userId, data.provider, encryptedNumber, data.account_holder_name],
      );

      await client.query('COMMIT');
      return toSafeAccount(result.rows[0] as WithdrawalAccountRow);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Simple insert (first account or non-primary)
  const result = await query(
    `INSERT INTO withdrawal_accounts (user_id, provider, account_number_encrypted, account_holder_name, is_primary)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, data.provider, encryptedNumber, data.account_holder_name, shouldBePrimary],
  );

  return toSafeAccount(result.rows[0] as WithdrawalAccountRow);
}

// ============================================================
// LIST ACCOUNTS
// ============================================================

/**
 * Lists all withdrawal accounts for a user, ordered by primary status then creation date.
 */
export async function listAccounts(userId: string): Promise<SafeWithdrawalAccount[]> {
  const result = await query(
    `SELECT * FROM withdrawal_accounts
     WHERE user_id = $1
     ORDER BY is_primary DESC, created_at ASC`,
    [userId],
  );

  return (result.rows as WithdrawalAccountRow[]).map(toSafeAccount);
}

// ============================================================
// GET ACCOUNT BY ID
// ============================================================

/**
 * Fetches a single withdrawal account by ID, verifying ownership.
 * Throws NotFoundError if not found or belongs to a different user.
 */
export async function getAccountById(
  userId: string,
  accountId: string,
): Promise<SafeWithdrawalAccount> {
  const result = await query(
    'SELECT * FROM withdrawal_accounts WHERE id = $1 AND user_id = $2',
    [accountId, userId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Withdrawal account not found');
  }

  return toSafeAccount(result.rows[0] as WithdrawalAccountRow);
}

// ============================================================
// UPDATE ACCOUNT
// ============================================================

/**
 * Updates a withdrawal account. Verifies ownership.
 * If is_primary is being set to true, unsets all other primaries in a transaction.
 */
export async function updateAccount(
  userId: string,
  accountId: string,
  data: UpdateWithdrawalAccountDto,
): Promise<SafeWithdrawalAccount> {
  // Verify ownership
  const existingResult = await query(
    'SELECT * FROM withdrawal_accounts WHERE id = $1 AND user_id = $2',
    [accountId, userId],
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('Withdrawal account not found');
  }

  // Build SET clause dynamically
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.account_holder_name !== undefined) {
    setClauses.push(`account_holder_name = $${paramIndex}`);
    params.push(data.account_holder_name);
    paramIndex++;
  }

  if (data.is_primary === true) {
    // Use a transaction to unset other primaries
    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE withdrawal_accounts SET is_primary = FALSE, updated_at = NOW() WHERE user_id = $1 AND is_primary = TRUE',
        [userId],
      );

      setClauses.push(`is_primary = TRUE`);
      params.push(accountId);
      params.push(userId);

      const result = await client.query(
        `UPDATE withdrawal_accounts
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
         RETURNING *`,
        params,
      );

      await client.query('COMMIT');
      return toSafeAccount(result.rows[0] as WithdrawalAccountRow);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Simple update (no is_primary change)
  params.push(accountId);
  params.push(userId);

  const result = await query(
    `UPDATE withdrawal_accounts
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
     RETURNING *`,
    params,
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Withdrawal account not found');
  }

  return toSafeAccount(result.rows[0] as WithdrawalAccountRow);
}

// ============================================================
// DELETE ACCOUNT
// ============================================================

/**
 * Deletes a withdrawal account. Verifies ownership.
 * Prevents deletion of the only account or a primary account.
 */
export async function deleteAccount(
  userId: string,
  accountId: string,
): Promise<void> {
  // Verify ownership and get account details
  const accountResult = await query(
    'SELECT * FROM withdrawal_accounts WHERE id = $1 AND user_id = $2',
    [accountId, userId],
  );

  if (accountResult.rows.length === 0) {
    throw new NotFoundError('Withdrawal account not found');
  }

  const account = accountResult.rows[0] as WithdrawalAccountRow;

  // Check total account count
  const countResult = await query(
    'SELECT COUNT(*)::int AS count FROM withdrawal_accounts WHERE user_id = $1',
    [userId],
  );
  const totalCount = (countResult.rows[0] as { count: number }).count;

  if (totalCount <= 1) {
    throw new ValidationError('Cannot delete the only withdrawal account', 'LAST_WITHDRAWAL_ACCOUNT');
  }

  if (account.is_primary) {
    throw new ValidationError('Cannot delete a primary account. Set another account as primary first.', 'CANNOT_DELETE_PRIMARY');
  }

  await query(
    'DELETE FROM withdrawal_accounts WHERE id = $1 AND user_id = $2',
    [accountId, userId],
  );
}

// ============================================================
// SET PRIMARY
// ============================================================

/**
 * Sets a withdrawal account as the primary account.
 * Unsets all other primaries for the user in a transaction.
 */
export async function setPrimary(
  userId: string,
  accountId: string,
): Promise<SafeWithdrawalAccount> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Verify ownership
    const accountResult = await client.query(
      'SELECT * FROM withdrawal_accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId],
    );

    if (accountResult.rows.length === 0) {
      throw new NotFoundError('Withdrawal account not found');
    }

    // Unset all primaries for this user
    await client.query(
      'UPDATE withdrawal_accounts SET is_primary = FALSE, updated_at = NOW() WHERE user_id = $1 AND is_primary = TRUE',
      [userId],
    );

    // Set this account as primary
    const result = await client.query(
      `UPDATE withdrawal_accounts
       SET is_primary = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [accountId, userId],
    );

    await client.query('COMMIT');
    return toSafeAccount(result.rows[0] as WithdrawalAccountRow);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
