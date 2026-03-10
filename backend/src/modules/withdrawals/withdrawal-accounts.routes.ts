import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  createAccountSchema,
  updateAccountSchema,
  accountParamsSchema,
} from './withdrawal-accounts.validation.js';
import * as accountController from './withdrawal-accounts.controller.js';

export const withdrawalAccountsRouter = Router();

// POST /api/withdrawal-accounts — Create a new withdrawal account
withdrawalAccountsRouter.post(
  '/',
  requireAuth,
  validate(createAccountSchema),
  accountController.createAccount,
);

// GET /api/withdrawal-accounts — List all withdrawal accounts
withdrawalAccountsRouter.get(
  '/',
  requireAuth,
  accountController.listAccounts,
);

// GET /api/withdrawal-accounts/:id — Get a single withdrawal account
withdrawalAccountsRouter.get(
  '/:id',
  requireAuth,
  validate(accountParamsSchema),
  accountController.getAccount,
);

// PUT /api/withdrawal-accounts/:id — Update a withdrawal account
withdrawalAccountsRouter.put(
  '/:id',
  requireAuth,
  validate(updateAccountSchema),
  accountController.updateAccount,
);

// DELETE /api/withdrawal-accounts/:id — Delete a withdrawal account
withdrawalAccountsRouter.delete(
  '/:id',
  requireAuth,
  validate(accountParamsSchema),
  accountController.deleteAccount,
);

// PUT /api/withdrawal-accounts/:id/primary — Set account as primary
withdrawalAccountsRouter.put(
  '/:id/primary',
  requireAuth,
  validate(accountParamsSchema),
  accountController.setPrimary,
);
