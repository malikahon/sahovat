import { randomUUID } from 'node:crypto';
import { query } from '../../config/database.js';
import { env } from '../../config/env.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { storageService } from '../../services/storage.service.js';
import type { UpdateProfileDto } from '../../types/api.js';
import type { UserRow, SafeUser } from './users.types.js';

// ============================================================
// HELPERS
// ============================================================

const USER_COLUMNS = `id, phone_number, display_name, password_hash,
  date_of_birth, gender, preferred_categories,
  is_verified, is_admin, verification_status,
  oneid_id, oneid_verified_at, language_preference,
  created_at, updated_at`;

/**
 * Strips password_hash from a user row to produce a safe response object.
 */
function toSafeUser(row: UserRow): SafeUser {
  const { password_hash: _, ...safe } = row;
  return safe;
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

  if (!env.ONEID_ENABLED) {
    // Dev mode — return mock callback URL that auto-verifies
    const redirect_url = `${env.ONEID_REDIRECT_URI}?code=mock_code&state=${userId}`;
    return { redirect_url };
  }

  // Production mode — construct real OneID OAuth URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.ONEID_CLIENT_ID,
    redirect_uri: env.ONEID_REDIRECT_URI,
    state: userId,
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
  const userId = state;

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
 * Updates user's verification_status to 'pending' if currently 'none'.
 */
export async function uploadVerificationDocument(
  userId: string,
  file: Express.Multer.File,
): Promise<{ file_url: string }> {
  // Verify user exists
  const userResult = await query(
    'SELECT id, verification_status FROM users WHERE id = $1',
    [userId],
  );

  if (userResult.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  // Save file to private storage
  const file_url = await storageService.savePrivate(
    file.buffer,
    file.originalname,
    file.mimetype,
  );

  // Update verification_status to 'pending' if currently 'none'
  const user = userResult.rows[0] as { id: string; verification_status: string };
  if (user.verification_status === 'none') {
    await query(
      `UPDATE users
       SET verification_status = 'pending', updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );
  }

  return { file_url };
}
