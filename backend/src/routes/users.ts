/**
 * User Routes
 * Handles user profile and withdrawal account management
 */

import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  addWithdrawalAccount,
  listWithdrawalAccounts,
  getWithdrawalAccount,
  updateWithdrawalAccount,
  deleteWithdrawalAccount,
  setPrimaryWithdrawalAccount,
} from '../controllers/withdrawalAccounts';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @route   POST /api/users/withdrawal-accounts
 * @desc    Add a new withdrawal account
 * @access  Private (authenticated users)
 * @body    { provider: string, account_number: string, account_holder_name: string }
 */
router.post('/withdrawal-accounts', addWithdrawalAccount);

/**
 * @route   GET /api/users/withdrawal-accounts
 * @desc    List all withdrawal accounts for the current user
 * @access  Private (authenticated users)
 */
router.get('/withdrawal-accounts', listWithdrawalAccounts);

/**
 * @route   GET /api/users/withdrawal-accounts/:id
 * @desc    Get a single withdrawal account by ID
 * @access  Private (authenticated users)
 */
router.get('/withdrawal-accounts/:id', getWithdrawalAccount);

/**
 * @route   PUT /api/users/withdrawal-accounts/:id
 * @desc    Update a withdrawal account
 * @access  Private (authenticated users)
 * @body    { provider?: string, account_number?: string, account_holder_name?: string }
 */
router.put('/withdrawal-accounts/:id', updateWithdrawalAccount);

/**
 * @route   DELETE /api/users/withdrawal-accounts/:id
 * @desc    Delete a withdrawal account
 * @access  Private (authenticated users)
 */
router.delete('/withdrawal-accounts/:id', deleteWithdrawalAccount);

/**
 * @route   POST /api/users/withdrawal-accounts/:id/set-primary
 * @desc    Set a withdrawal account as the primary account
 * @access  Private (authenticated users)
 */
router.post('/withdrawal-accounts/:id/set-primary', setPrimaryWithdrawalAccount);

export default router;
