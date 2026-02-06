/**
 * Withdrawal Accounts Controller
 * Handles CRUD operations for user withdrawal accounts
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, WithdrawalAccount, WithdrawalProvider } from '../types';
import { query } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { encrypt, decrypt, maskAccountNumber } from '../utils/encryption';

// Valid providers
const VALID_PROVIDERS: WithdrawalProvider[] = ['payme', 'click', 'uzcard', 'humo'];

/**
 * Interface for withdrawal account response (with masked account number)
 */
interface WithdrawalAccountResponse {
  id: string;
  user_id: string;
  provider: WithdrawalProvider;
  account_number_masked: string;
  account_holder_name: string;
  is_primary: boolean;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Transform a withdrawal account to response format (mask account number)
 */
function transformToResponse(account: WithdrawalAccount): WithdrawalAccountResponse {
  const decryptedNumber = decrypt(account.account_number_encrypted);
  return {
    id: account.id,
    user_id: account.user_id,
    provider: account.provider,
    account_number_masked: maskAccountNumber(decryptedNumber),
    account_holder_name: account.account_holder_name,
    is_primary: account.is_primary,
    is_verified: account.is_verified,
    created_at: account.created_at,
    updated_at: account.updated_at,
  };
}

/**
 * Validate account number format based on provider
 */
function validateAccountNumber(provider: WithdrawalProvider, accountNumber: string): boolean {
  // Remove spaces and dashes
  const cleanNumber = accountNumber.replace(/[\s-]/g, '');
  
  switch (provider) {
    case 'payme':
    case 'click':
      // Phone number format: should be 9 digits (without country code) or 12 digits (with 998)
      return /^(998)?\d{9}$/.test(cleanNumber);
    case 'uzcard':
    case 'humo':
      // Card number: 16 digits
      return /^\d{16}$/.test(cleanNumber);
    default:
      return false;
  }
}

/**
 * Mock verification - checks if account holder name matches user display name
 * In production, this would integrate with actual payment providers
 */
function mockVerifyAccount(accountHolderName: string, userDisplayName: string | null): boolean {
  if (!userDisplayName) return false;
  
  // Simple name matching (case-insensitive, trimmed)
  const normalizedHolder = accountHolderName.toLowerCase().trim();
  const normalizedUser = userDisplayName.toLowerCase().trim();
  
  // Check if names are similar (either contains the other or exact match)
  return normalizedHolder === normalizedUser || 
         normalizedHolder.includes(normalizedUser) || 
         normalizedUser.includes(normalizedHolder);
}

/**
 * Add a new withdrawal account
 * POST /api/users/withdrawal-accounts
 */
export async function addWithdrawalAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { provider, account_number, account_holder_name } = req.body;

    // Validate required fields
    if (!provider || !account_number || !account_holder_name) {
      throw new AppError('Provider, account number, and account holder name are required', 400);
    }

    // Validate provider
    if (!VALID_PROVIDERS.includes(provider)) {
      throw new AppError(`Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`, 400);
    }

    // Validate account number format
    const cleanAccountNumber = account_number.replace(/[\s-]/g, '');
    if (!validateAccountNumber(provider, cleanAccountNumber)) {
      throw new AppError('Invalid account number format for the selected provider', 400);
    }

    // Validate account holder name
    if (account_holder_name.trim().length < 2) {
      throw new AppError('Account holder name must be at least 2 characters', 400);
    }

    // Check if user already has 5 accounts (limit)
    const countResult = await query(
      'SELECT COUNT(*) FROM withdrawal_accounts WHERE user_id = $1',
      [user.id],
    );
    if (parseInt(countResult.rows[0].count) >= 5) {
      throw new AppError('Maximum of 5 withdrawal accounts allowed', 400);
    }

    // Check if this account already exists for the user
    // We need to check by decrypting, but for simplicity, we'll encrypt and compare
    const existingAccounts = await query(
      'SELECT account_number_encrypted FROM withdrawal_accounts WHERE user_id = $1 AND provider = $2',
      [user.id, provider],
    );
    
    for (const existing of existingAccounts.rows) {
      if (decrypt(existing.account_number_encrypted) === cleanAccountNumber) {
        throw new AppError('This account is already added', 400);
      }
    }

    // Encrypt account number
    const encryptedAccountNumber = encrypt(cleanAccountNumber);

    // Check if this is the first account (make it primary)
    const isFirstAccount = parseInt(countResult.rows[0].count) === 0;

    // Mock verify the account
    const isVerified = mockVerifyAccount(account_holder_name, user.display_name);

    // Insert the account
    const result = await query(
      `INSERT INTO withdrawal_accounts 
       (user_id, provider, account_number_encrypted, account_holder_name, is_primary, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.id, provider, encryptedAccountNumber, account_holder_name.trim(), isFirstAccount, isVerified],
    );

    const account = result.rows[0] as WithdrawalAccount;

    res.status(201).json({
      success: true,
      message: 'Withdrawal account added successfully',
      data: {
        account: transformToResponse(account),
        verification_note: isVerified 
          ? 'Account verified successfully' 
          : 'Account holder name does not match your profile name. Please update your display name or contact support.',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all withdrawal accounts for the current user
 * GET /api/users/withdrawal-accounts
 */
export async function listWithdrawalAccounts(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;

    const result = await query(
      `SELECT * FROM withdrawal_accounts 
       WHERE user_id = $1 
       ORDER BY is_primary DESC, created_at DESC`,
      [user.id],
    );

    const accounts = result.rows.map((row) => transformToResponse(row as WithdrawalAccount));

    res.json({
      success: true,
      data: {
        accounts,
        count: accounts.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a withdrawal account
 * PUT /api/users/withdrawal-accounts/:id
 */
export async function updateWithdrawalAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { provider, account_number, account_holder_name } = req.body;

    // Check if account exists and belongs to user
    const existingResult = await query(
      'SELECT * FROM withdrawal_accounts WHERE id = $1 AND user_id = $2',
      [id, user.id],
    );

    if (existingResult.rows.length === 0) {
      throw new AppError('Withdrawal account not found', 404);
    }

    const existing = existingResult.rows[0] as WithdrawalAccount;

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (provider) {
      if (!VALID_PROVIDERS.includes(provider)) {
        throw new AppError(`Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`, 400);
      }
      updates.push(`provider = $${paramIndex++}`);
      values.push(provider);
    }

    if (account_number) {
      const cleanAccountNumber = account_number.replace(/[\s-]/g, '');
      const providerToValidate = provider || existing.provider;
      
      if (!validateAccountNumber(providerToValidate, cleanAccountNumber)) {
        throw new AppError('Invalid account number format for the selected provider', 400);
      }
      
      updates.push(`account_number_encrypted = $${paramIndex++}`);
      values.push(encrypt(cleanAccountNumber));
    }

    if (account_holder_name) {
      if (account_holder_name.trim().length < 2) {
        throw new AppError('Account holder name must be at least 2 characters', 400);
      }
      updates.push(`account_holder_name = $${paramIndex++}`);
      values.push(account_holder_name.trim());
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    // Re-verify if account holder name changed
    if (account_holder_name) {
      const isVerified = mockVerifyAccount(account_holder_name, user.display_name);
      updates.push(`is_verified = $${paramIndex++}`);
      values.push(isVerified);
    }

    // Add WHERE clause params
    values.push(id, user.id);

    const result = await query(
      `UPDATE withdrawal_accounts 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values,
    );

    const account = result.rows[0] as WithdrawalAccount;

    res.json({
      success: true,
      message: 'Withdrawal account updated successfully',
      data: {
        account: transformToResponse(account),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a withdrawal account
 * DELETE /api/users/withdrawal-accounts/:id
 */
export async function deleteWithdrawalAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Check if account exists and belongs to user
    const existingResult = await query(
      'SELECT * FROM withdrawal_accounts WHERE id = $1 AND user_id = $2',
      [id, user.id],
    );

    if (existingResult.rows.length === 0) {
      throw new AppError('Withdrawal account not found', 404);
    }

    const existing = existingResult.rows[0] as WithdrawalAccount;

    // Check if account is used by any active fundraiser
    const fundraiserResult = await query(
      `SELECT id FROM fundraisers 
       WHERE withdrawal_account_id = $1 AND status IN ('draft', 'active', 'paused')`,
      [id],
    );

    if (fundraiserResult.rows.length > 0) {
      throw new AppError(
        'Cannot delete account that is linked to active fundraisers. Please update the fundraiser first.',
        400,
      );
    }

    // Delete the account
    await query('DELETE FROM withdrawal_accounts WHERE id = $1', [id]);

    // If deleted account was primary, make another one primary
    if (existing.is_primary) {
      await query(
        `UPDATE withdrawal_accounts 
         SET is_primary = true 
         WHERE user_id = $1 AND id != $2
         ORDER BY created_at ASC
         LIMIT 1`,
        [user.id, id],
      );
    }

    res.json({
      success: true,
      message: 'Withdrawal account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Set a withdrawal account as primary
 * POST /api/users/withdrawal-accounts/:id/set-primary
 */
export async function setPrimaryWithdrawalAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Check if account exists and belongs to user
    const existingResult = await query(
      'SELECT * FROM withdrawal_accounts WHERE id = $1 AND user_id = $2',
      [id, user.id],
    );

    if (existingResult.rows.length === 0) {
      throw new AppError('Withdrawal account not found', 404);
    }

    // Remove primary from all other accounts
    await query(
      'UPDATE withdrawal_accounts SET is_primary = false WHERE user_id = $1',
      [user.id],
    );

    // Set this account as primary
    const result = await query(
      'UPDATE withdrawal_accounts SET is_primary = true WHERE id = $1 RETURNING *',
      [id],
    );

    const account = result.rows[0] as WithdrawalAccount;

    res.json({
      success: true,
      message: 'Primary withdrawal account updated successfully',
      data: {
        account: transformToResponse(account),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single withdrawal account by ID
 * GET /api/users/withdrawal-accounts/:id
 */
export async function getWithdrawalAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM withdrawal_accounts WHERE id = $1 AND user_id = $2',
      [id, user.id],
    );

    if (result.rows.length === 0) {
      throw new AppError('Withdrawal account not found', 404);
    }

    const account = result.rows[0] as WithdrawalAccount;

    res.json({
      success: true,
      data: {
        account: transformToResponse(account),
      },
    });
  } catch (error) {
    next(error);
  }
}
