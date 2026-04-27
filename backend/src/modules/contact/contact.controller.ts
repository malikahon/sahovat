import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/middleware.js';
import * as contactService from './contact.service.js';
import type { SubmitContactDto } from './contact.validation.js';

/**
 * POST /api/contact
 * Public endpoint — accepts auth optionally; if a JWT is present the
 * resulting row is associated with that user_id.
 */
export async function submitContactMessage(req: Request, res: Response): Promise<void> {
  const dto = req.body as SubmitContactDto;
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id ?? null;

  const sourceIp =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.ip ||
    null;

  const result = await contactService.submitContactMessage({
    ...dto,
    user_id: userId,
    source_ip: sourceIp,
  });

  res.status(201).json({
    success: true,
    data: {
      reference_code: result.reference_code,
      email_reply_sent: result.email_reply_sent,
    },
  });
}
