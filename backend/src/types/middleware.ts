import type { Request } from 'express';
import type { VerificationStatus } from './entities.js';

export interface AuthenticatedUser {
  id: string;
  phone_number: string | null;
  email: string | null;
  display_name: string | null;
  is_verified: boolean;
  is_admin: boolean;
  is_banned: boolean;
  verification_status: VerificationStatus;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
