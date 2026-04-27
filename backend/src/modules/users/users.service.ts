import { randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { query } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ConflictError,
  RateLimitError,
  AppError,
} from '../../lib/errors.js';
import { storageService } from '../../services/storage.service.js';
import { verifyDocumentName } from '../../services/ocr.service.js';
import { emailService } from '../../services/email.service.js';
import type { UpdateProfileDto } from '../../types/api.js';
import type { UserRow, SafeUser } from './users.types.js';

const ONEID_STATE_PREFIX = 'oneid_state:';
const ONEID_STATE_TTL_SECONDS = 600; // 10 minutes

// ============================================================
// HELPERS
// ============================================================

const USER_COLUMNS = `id, phone_number, display_name, password_hash,
  date_of_birth, gender, preferred_categories,
  is_verified, is_admin, is_banned, verification_status,
  oneid_id, oneid_verified_at, language_preference,
  telegram_id, telegram_username, telegram_photo_url, telegram_linked_at,
  preferred_otp_channel, email, email_verified_at,
  created_at, updated_at`;

/**
 * Strips password_hash from a user row to produce a safe response object.
 */
function toSafeUser(row: UserRow): SafeUser {
  const { password_hash, ...safe } = row;
  return { ...safe, has_password: !!password_hash };
}

// ============================================================
// GET PROFILE
// ============================================================

/**
 * Fetches a user by ID and returns their profile without password_hash.
 */
export async function getProfile(userId: string): Promise<SafeUser> {
  const result = await query(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  return toSafeUser(result.rows[0] as UserRow);
}

// ============================================================
// UPDATE PROFILE
// ============================================================

/**
 * Updates user profile fields. Only provided fields are updated.
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileDto,
): Promise<SafeUser> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.display_name !== undefined) {
    setClauses.push(`display_name = $${paramIndex}`);
    params.push(data.display_name);
    paramIndex++;
  }

  if (data.date_of_birth !== undefined) {
    setClauses.push(`date_of_birth = $${paramIndex}`);
    params.push(data.date_of_birth);
    paramIndex++;
  }

  if (data.gender !== undefined) {
    setClauses.push(`gender = $${paramIndex}`);
    params.push(data.gender);
    paramIndex++;
  }

  if (data.preferred_categories !== undefined) {
    setClauses.push(`preferred_categories = $${paramIndex}`);
    params.push(data.preferred_categories);
    paramIndex++;
  }

  if (data.language_preference !== undefined) {
    setClauses.push(`language_preference = $${paramIndex}`);
    params.push(data.language_preference);
    paramIndex++;
  }

  if (setClauses.length === 0) {
    throw new ValidationError('No fields to update');
  }

  // Always update updated_at
  setClauses.push(`updated_at = NOW()`);

  // Add userId as last parameter for WHERE clause
  params.push(userId);

  const result = await query(
    `UPDATE users
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING ${USER_COLUMNS}`,
    params,
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  return toSafeUser(result.rows[0] as UserRow);
}

// ============================================================
// ONEID VERIFICATION — INITIATE
// ============================================================

/**
 * Initiates OneID verification.
 * In dev mode (ONEID_ENABLED=false), returns a mock callback URL.
 * In production mode, constructs a real OneID OAuth URL.
 */
export async function initiateOneIdVerification(
  userId: string,
): Promise<{ redirect_url: string }> {
  // Verify user exists
  const result = await query('SELECT id FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  // Generate a secure, single-use state token and store in Redis mapped to userId
  const stateToken = randomUUID();
  await redis.set(
    `${ONEID_STATE_PREFIX}${stateToken}`,
    userId,
    'EX',
    ONEID_STATE_TTL_SECONDS,
  );

  if (!env.ONEID_ENABLED) {
    // Dev mode — return mock callback URL that auto-verifies
    const redirect_url = `${env.ONEID_REDIRECT_URI}?code=mock_code&state=${stateToken}`;
    return { redirect_url };
  }

  // Production mode — construct real OneID OAuth URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.ONEID_CLIENT_ID,
    redirect_uri: env.ONEID_REDIRECT_URI,
    state: stateToken,
    scope: 'openid profile',
  });

  const redirect_url = `https://sso.egov.uz/sso/oauth/Authorization.do?${params.toString()}`;
  return { redirect_url };
}

// ============================================================
// ONEID VERIFICATION — CALLBACK
// ============================================================

/**
 * Handles the OneID OAuth callback.
 * In dev mode, auto-verifies the user.
 * In production, exchanges code for token and fetches profile.
 */
export async function handleOneIdCallback(
  code: string,
  state: string,
): Promise<SafeUser> {
  // Resolve the state token to a userId from Redis (single-use)
  const stateKey = `${ONEID_STATE_PREFIX}${state}`;
  const userId = await redis.get(stateKey);

  if (!userId) {
    throw new UnauthorizedError('Invalid or expired verification state');
  }

  // Delete the state token immediately to prevent reuse
  await redis.del(stateKey);

  if (!env.ONEID_ENABLED) {
    // Dev mode — auto-verify the user
    const result = await query(
      `UPDATE users
       SET verification_status = 'approved',
           is_verified = true,
           oneid_id = $1,
           oneid_verified_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING ${USER_COLUMNS}`,
      [randomUUID(), userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    return toSafeUser(result.rows[0] as UserRow);
  }

  // Production mode — exchange code for token, fetch profile, update user
  // TODO: Implement real OneID token exchange when API is available
  // 1. POST to OneID token endpoint with code + client_id + client_secret
  // 2. Use access_token to GET user profile
  // 3. Update user with OneID profile data

  // Placeholder for production implementation
  const result = await query(
    `UPDATE users
     SET verification_status = 'approved',
         is_verified = true,
         oneid_id = $1,
         oneid_verified_at = NOW(),
         updated_at = NOW()
     WHERE id = $2
     RETURNING ${USER_COLUMNS}`,
    [code, userId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  return toSafeUser(result.rows[0] as UserRow);
}

// ============================================================
// UPLOAD VERIFICATION DOCUMENT
// ============================================================

/**
 * Saves a KYC verification document to private storage.
 * Records the document in verification_documents table.
 * Sets user's verification_status to 'pending' if currently 'none' or 'rejected'.
 */
export async function uploadVerificationDocument(
  userId: string,
  file: Express.Multer.File,
  documentType: string,
  legalFirstName: string,
  legalLastName: string,
): Promise<{ file_url: string; document_id: string; ai_status: string }> {
  // Verify user exists
  const userResult = await query(
    'SELECT id, verification_status FROM users WHERE id = $1',
    [userId],
  );

  if (userResult.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const user = userResult.rows[0] as { id: string; verification_status: string };

  // Cannot re-upload if already approved
  if (user.verification_status === 'approved') {
    throw new ValidationError('Your identity is already verified', 'ALREADY_VERIFIED');
  }

  // Save file to private storage
  const file_url = await storageService.savePrivate(
    file.buffer,
    file.originalname,
    file.mimetype,
  );

  // Record document in verification_documents table (ai_status starts as 'pending')
  const docResult = await query(
    `INSERT INTO verification_documents
       (user_id, document_type, file_url, original_filename, status,
        legal_first_name, legal_last_name, ai_status)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6, 'pending')
     RETURNING id`,
    [userId, documentType, file_url, file.originalname, legalFirstName, legalLastName],
  );

  const document_id = (docResult.rows[0] as { id: string }).id;

  // Set verification_status to 'pending' if currently 'none' or 'rejected'
  if (user.verification_status === 'none' || user.verification_status === 'rejected') {
    await query(
      `UPDATE users
       SET verification_status = 'pending', updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );
  }

  // Run OCR asynchronously — don't block the upload response.
  // Results are written back to the DB; auto_approved also marks user verified.
  runOcrAsync(document_id, userId, file.buffer, file.mimetype, legalFirstName, legalLastName);

  return { file_url, document_id, ai_status: 'pending' };
}

/**
 * Runs OCR on the uploaded document buffer in the background.
 * Writes the result back to verification_documents.
 * If auto_approved, also marks the user as verified.
 *
 * All errors — including unhandled worker-level rejections — are caught here
 * so they never reach the process-level unhandledRejection handler (which
 * would shut the server down).
 */
function runOcrAsync(
  documentId: string,
  userId: string,
  buffer: Buffer,
  mimetype: string,
  legalFirst: string,
  legalLast: string,
): void {
  console.log(`[OCR] Starting async verification for document ${documentId}`);

  // Wrap everything in a self-contained async IIFE with a top-level catch
  // so no rejection can escape to the process event loop.
  (async () => {
    let result;
    try {
      result = await verifyDocumentName(buffer, legalFirst, legalLast, mimetype);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[OCR] verifyDocumentName threw for document ${documentId}:`, msg);
      result = {
        decision: 'needs_review' as const,
        confidence: 0,
        extractedText: '',
        error: msg,
      };
    }

    console.log(`[OCR] Document ${documentId} — decision: ${result.decision}, confidence: ${result.confidence.toFixed(2)}${result.error ? `, note: ${result.error}` : ''}`);

    try {
      await query(
        `UPDATE verification_documents
         SET ai_status = $1,
             ai_confidence = $2,
             ai_extracted_text = $3,
             ai_processed_at = NOW()
         WHERE id = $4`,
        [result.decision, result.confidence, result.extractedText, documentId],
      );

      // Auto-approved: mark document + user as verified
      if (result.decision === 'auto_approved') {
        await query(
          `UPDATE verification_documents
           SET status = 'approved', reviewed_at = NOW()
           WHERE id = $1`,
          [documentId],
        );
        await query(
          `UPDATE users
           SET verification_status = 'approved', is_verified = true, updated_at = NOW()
           WHERE id = $1`,
          [userId],
        );
        console.log(`[OCR] User ${userId} auto-approved via AI`);
      }
      // auto_rejected: leave document status = 'pending' for admin to confirm
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.error(`[OCR] DB write failed for document ${documentId}:`, msg);
    }
  })();
  // Intentionally no .catch() here — the IIFE has its own try/catch throughout.
  // This pattern prevents any rejected promise from leaking to the process.
}

// ============================================================
// EMAIL — UPDATE / VERIFY (Week 1 baseline; verification flow in F.5)
// ============================================================

/**
 * Postgres unique-violation error code. node-postgres surfaces this on
 * `err.code` when a UNIQUE constraint fails (e.g. users_email_unique).
 */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * Sets or replaces the current user's email. Always clears
 * email_verified_at — verification must be re-done.
 *
 * Throws ConflictError if the email is already on another user.
 */
export async function updateEmail(userId: string, email: string): Promise<SafeUser> {
  // Normalize again at the boundary as belt-and-braces (zod already lowercased).
  const normalized = email.trim().toLowerCase();

  try {
    const result = await query(
      `UPDATE users
       SET email             = $1,
           email_verified_at = NULL,
           updated_at        = NOW()
       WHERE id = $2
       RETURNING ${USER_COLUMNS}`,
      [normalized, userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    return toSafeUser(result.rows[0] as UserRow);
  } catch (err) {
    // Unique constraint hit on users_email_unique → conflict.
    if ((err as { code?: string }).code === PG_UNIQUE_VIOLATION) {
      throw new ConflictError('This email is already in use', 'EMAIL_TAKEN');
    }
    throw err;
  }
}

/**
 * Marks the current user's email as verified by setting email_verified_at.
 * Used by the verification-code flow (F.5).
 */
export async function markEmailVerified(userId: string): Promise<SafeUser> {
  const result = await query(
    `UPDATE users
     SET email_verified_at = NOW(),
         updated_at        = NOW()
     WHERE id = $1
       AND email IS NOT NULL
     RETURNING ${USER_COLUMNS}`,
    [userId],
  );

  if (result.rows.length === 0) {
    throw new ValidationError(
      'Cannot verify: no email set on this account',
      'NO_EMAIL_SET',
    );
  }

  return toSafeUser(result.rows[0] as UserRow);
}

/**
 * Re-export the rate-limit error class for callers that want to map
 * Redis counter overflows to a 429 response.
 */
export { RateLimitError };

// ------------------------------------------------------------
// Email verification flow (pulled forward from Week 3 task 3.12)
// ------------------------------------------------------------

const EMAIL_VERIFY_PREFIX = 'email_verify:';
const EMAIL_VERIFY_COUNT_PREFIX = 'email_verify_count:';
const EMAIL_VERIFY_TTL_SECONDS = 600; // 10 minutes
const EMAIL_VERIFY_RATE_WINDOW_SECONDS = 3600; // 1 hour
const EMAIL_VERIFY_RATE_LIMIT = 5; // max 5 sends per hour per user

/**
 * Generates a 6-digit numeric code using crypto.randomInt for unbiased
 * uniform distribution. Padded to 6 chars.
 */
function generateVerificationCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * Sends a 6-digit verification code to the current user's email.
 *
 * Behavior:
 *  - 400 if user has no email or it's already verified.
 *  - 429 if the user has already requested >5 codes in the last hour.
 *  - 502 if the email provider rejects the send.
 *
 * The code is stored in Redis at `email_verify:{userId}` with a 10-min TTL.
 * Re-requesting overwrites the existing code (the latest request wins).
 */
export async function requestEmailVerification(userId: string): Promise<void> {
  // Fetch current email + verified state.
  const result = await query(
    `SELECT email, email_verified_at FROM users WHERE id = $1`,
    [userId],
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }
  const { email, email_verified_at } = result.rows[0] as {
    email: string | null;
    email_verified_at: string | null;
  };

  if (!email) {
    throw new ValidationError(
      'No email address on file. Add an email first.',
      'NO_EMAIL_SET',
    );
  }
  if (email_verified_at) {
    throw new ValidationError('Email is already verified', 'ALREADY_VERIFIED');
  }

  // Rate limit. INCR returns the new value; first call sets the key.
  const countKey = `${EMAIL_VERIFY_COUNT_PREFIX}${userId}`;
  const count = await redis.incr(countKey);
  if (count === 1) {
    // First send in the window — set the TTL.
    await redis.expire(countKey, EMAIL_VERIFY_RATE_WINDOW_SECONDS);
  }
  if (count > EMAIL_VERIFY_RATE_LIMIT) {
    throw new RateLimitError(
      'Too many verification code requests. Please wait an hour.',
      'EMAIL_VERIFY_RATE_LIMIT',
    );
  }

  // Generate and store code.
  const code = generateVerificationCode();
  await redis.set(
    `${EMAIL_VERIFY_PREFIX}${userId}`,
    code,
    'EX',
    EMAIL_VERIFY_TTL_SECONDS,
  );

  // Send — surface failures as 502 (Bad Gateway: upstream provider failed).
  try {
    await emailService.sendVerificationCode(email, code);
  } catch (err) {
    // Don't leave a stale code in Redis if the send failed — the user
    // would never receive it but the code would still validate.
    await redis.del(`${EMAIL_VERIFY_PREFIX}${userId}`);
    const msg = err instanceof Error ? err.message : 'Email send failed';
    console.error(`[Sahovat] Email send failed for user ${userId}: ${msg}`);
    throw new AppError(
      'Could not send verification email. Please try again.',
      502,
      'EMAIL_SEND_FAILED',
    );
  }
}

/**
 * Validates a 6-digit verification code against the Redis-stored value.
 * On success, marks the user's email as verified and deletes the code.
 *
 * Uses constant-time comparison even though the code TTL is short — an
 * attacker who could observe timing can otherwise extract codes char by
 * char in <600s.
 */
export async function confirmEmailVerification(
  userId: string,
  code: string,
): Promise<SafeUser> {
  const key = `${EMAIL_VERIFY_PREFIX}${userId}`;
  const stored = await redis.get(key);

  if (!stored) {
    throw new UnauthorizedError(
      'This verification code has expired. Request a new one.',
      'CODE_EXPIRED',
    );
  }

  // Constant-time compare. Both must be the same byte length; otherwise
  // it's invalid by construction.
  const a = Buffer.from(stored);
  const b = Buffer.from(code);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedError('Invalid verification code', 'INVALID_CODE');
  }

  // Mark verified + delete the code.
  const user = await markEmailVerified(userId);
  await redis.del(key);

  return user;
}

/**
 * Lists all verification documents submitted by a user.
 */
export async function getMyVerificationDocuments(userId: string): Promise<Array<{
  id: string;
  document_type: string;
  status: string;
  original_filename: string | null;
  legal_first_name: string | null;
  legal_last_name: string | null;
  ai_status: string | null;
  ai_confidence: number | null;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}>> {
  const result = await query(
    `SELECT id, document_type, status, original_filename,
            legal_first_name, legal_last_name,
            ai_status, ai_confidence,
            uploaded_at, reviewed_at, reviewer_notes
     FROM verification_documents
     WHERE user_id = $1
     ORDER BY uploaded_at DESC`,
    [userId],
  );

  return result.rows as Array<{
    id: string;
    document_type: string;
    status: string;
    original_filename: string | null;
    legal_first_name: string | null;
    legal_last_name: string | null;
    ai_status: string | null;
    ai_confidence: number | null;
    uploaded_at: string;
    reviewed_at: string | null;
    reviewer_notes: string | null;
  }>;
}

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================

import {
  NotificationChannel,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_TYPES,
  type NotificationEventType,
  type NotificationPreference,
} from '../../types/entities.js';

interface PreferenceUpdate {
  event_type: NotificationEventType;
  channel: NotificationChannel;
  enabled: boolean;
}

/**
 * Returns the full preference grid for a user. Lazy-creates default rows
 * if any are missing — defends against users created before migration 011
 * was applied (or against partial backfill failures).
 */
export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreference[]> {
  // Fetch existing rows.
  const existing = await query(
    `SELECT user_id, event_type, channel, enabled, created_at, updated_at
     FROM notification_preferences
     WHERE user_id = $1`,
    [userId],
  );

  const rows = existing.rows as NotificationPreference[];

  // Compute missing (event, channel) pairs and lazily insert defaults.
  const present = new Set(rows.map((r) => `${r.event_type}:${r.channel}`));
  const missing: PreferenceUpdate[] = [];

  // Look up email_verified_at once for default-enable decision on email channel.
  const userResult = await query(
    `SELECT email_verified_at FROM users WHERE id = $1`,
    [userId],
  );
  if (userResult.rows.length === 0) {
    throw new NotFoundError('User not found');
  }
  const emailVerified =
    !!(userResult.rows[0] as { email_verified_at: string | null }).email_verified_at;

  for (const event_type of NOTIFICATION_EVENT_TYPES) {
    for (const channel of NOTIFICATION_CHANNELS) {
      if (!present.has(`${event_type}:${channel}`)) {
        missing.push({
          event_type,
          channel,
          enabled: channel === NotificationChannel.EMAIL ? emailVerified : true,
        });
      }
    }
  }

  if (missing.length > 0) {
    const values: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const m of missing) {
      values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      params.push(userId, m.event_type, m.channel, m.enabled);
    }
    await query(
      `INSERT INTO notification_preferences (user_id, event_type, channel, enabled)
       VALUES ${values.join(', ')}
       ON CONFLICT (user_id, event_type, channel) DO NOTHING`,
      params,
    );
    // Refetch to return a consistent set.
    const refetch = await query(
      `SELECT user_id, event_type, channel, enabled, created_at, updated_at
       FROM notification_preferences
       WHERE user_id = $1`,
      [userId],
    );
    return refetch.rows as NotificationPreference[];
  }

  return rows;
}

/**
 * Bulk-update a user's preferences. Validates each update against the
 * email-verification gate: enabling email channels requires a verified
 * email. Other validation (event_type / channel enum) is handled by the
 * route's zod schema.
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: PreferenceUpdate[],
): Promise<NotificationPreference[]> {
  if (updates.length === 0) {
    return getNotificationPreferences(userId);
  }

  // Email-verification gate: any update enabling 'email' requires verified email.
  const enablingEmail = updates.some(
    (u) => u.channel === NotificationChannel.EMAIL && u.enabled,
  );
  if (enablingEmail) {
    const userResult = await query(
      `SELECT email_verified_at FROM users WHERE id = $1`,
      [userId],
    );
    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }
    const verified = !!(userResult.rows[0] as { email_verified_at: string | null })
      .email_verified_at;
    if (!verified) {
      throw new ValidationError(
        'Verify your email before enabling the email channel.',
        'EMAIL_NOT_VERIFIED',
      );
    }
  }

  // Upsert each update. Done in a single statement using UNNEST for efficiency.
  const eventTypes = updates.map((u) => u.event_type);
  const channels = updates.map((u) => u.channel);
  const enabledFlags = updates.map((u) => u.enabled);

  await query(
    `INSERT INTO notification_preferences (user_id, event_type, channel, enabled, updated_at)
     SELECT $1, e, c, en, NOW()
     FROM UNNEST($2::text[], $3::text[], $4::boolean[]) AS t(e, c, en)
     ON CONFLICT (user_id, event_type, channel)
     DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
    [userId, eventTypes, channels, enabledFlags],
  );

  return getNotificationPreferences(userId);
}
