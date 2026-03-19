import { Router } from 'express';
import { handleMerchantApi } from './payme.controller.js';

export const paymeRouter = Router();

// POST /api/payme — PayMe Merchant API callback endpoint.
// PayMe sends JSON-RPC 2.0 requests with Basic auth.
// No Express auth middleware — authentication is handled inside the controller
// by verifying the Authorization: Basic header against PAYME_KEY.
paymeRouter.post('/', handleMerchantApi);
