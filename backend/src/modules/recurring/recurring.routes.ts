import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import {
  createRecurringSchema,
  updateRecurringSchema,
  listRecurringSchema,
  recurringIdParamSchema,
} from './recurring.validation.js';
import * as recurringController from './recurring.controller.js';

export const recurringRouter = Router();

// All routes require authentication — applied at the app.ts level

// Impact stats (must be before /:id to avoid matching "impact" as UUID)
recurringRouter.get(
  '/impact',
  recurringController.getImpact,
);

// CRUD
recurringRouter.post(
  '/',
  validate(createRecurringSchema),
  recurringController.create,
);

recurringRouter.get(
  '/',
  validate(listRecurringSchema),
  recurringController.listMy,
);

recurringRouter.get(
  '/:id',
  validate(recurringIdParamSchema),
  recurringController.getById,
);

recurringRouter.put(
  '/:id',
  validate({ ...recurringIdParamSchema, ...updateRecurringSchema }),
  recurringController.update,
);

recurringRouter.delete(
  '/:id',
  validate(recurringIdParamSchema),
  recurringController.remove,
);
