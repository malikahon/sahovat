import { randomUUID } from 'node:crypto';
import { query } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { NotFoundError, ValidationError, UnauthorizedError } from '../../lib/errors.js';
import { storageService } from '../../services/storage.service.js';
import { verifyDocumentName } from '../../services/ocr.service.js';
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
