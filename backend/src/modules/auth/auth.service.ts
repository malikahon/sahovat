import bcrypt from 'bcrypt';
import { query } from '../../config/database.js';
import {
  generateOtp,
  storeOtp,
  verifyOtp as verifyStoredOtp,
  isOtpLocked,
} from '../../lib/otp.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  validateStoredRefreshToken,
} from '../../lib/jwt.js';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '../../lib/errors.js';
import { validateUzbekPhone, formatPhone } from '../../lib/phone.js';
import { smsService } from '../../services/sms.service.js';
import type { CampaignCategory } from '../../types/entities.js';
import type { AuthResponse, AuthTokens } from '../../types/api.js';
import type { UserRow, SafeUser } from './auth.types.js';

const BCRYPT_SALT_ROUNDS = 12;

// ============================================================
// HELPERS
// ============================================================

/**
 * Strips password_hash from a user row to produce a safe response object.
 */
function toSafeUser(row: UserRow): SafeUser {
  const { password_hash, ...safe } = row;
  return { ...safe, has_password: !!password_hash };
}

/**
 * Generates an access/refresh token pair and stores the refresh token in Redis.
 */
async function generateTokenPair(userId: string, isAdmin: boolean): Promise<AuthTokens> {
  const payload = { userId, isAdmin };
  const access_token = generateAccessToken(payload);
  const refresh_token = generateRefreshToken(payload);
  await storeRefreshToken(userId, refresh_token);
  return { access_token, refresh_token };
}

// ============================================================
// REQUEST OTP
// ============================================================

/**
 * Initiates the OTP flow for a phone number.
 * If the phone doesn't exist in the database, creates a minimal user record.
 * Generates and sends OTP via SMS.
 */
export async function requestOtp(phoneNumber: string): Promise<void> {
  const phone = formatPhone(phoneNumber);

  if (!validateUzbekPhone(phone)) {
    throw new ValidationError('Invalid Uzbek phone number', 'INVALID_PHONE');
  }

  // Check if phone is locked out from too many OTP attempts
  const locked = await isOtpLocked(phone);
  if (locked) {
    throw new RateLimitError('Too many OTP attempts. Please try again later.', 'OTP_RATE_LIMIT');
  }

  // Upsert: find existing user or create minimal record
  const existingResult = await query(
    'SELECT id FROM users WHERE phone_number = $1',
    [phone],
  );

  if (existingResult.rows.length === 0) {
    await query(
      'INSERT INTO users (phone_number) VALUES ($1)',
      [phone],
    );
  }

  // Generate and store OTP
  const otp = generateOtp();
  await storeOtp(phone, otp);

  // Send OTP via SMS
  await smsService.sendOtp(phone, otp);
}

// ============================================================
// VERIFY OTP
// ============================================================

/**
 * Verifies an OTP for a phone number.
 * Returns the user with tokens, and flags whether the user is new (needs registration).
 */
export async function verifyOtpAndLogin(
  phoneNumber: string,
  otp: string,
): Promise<AuthResponse> {
  const phone = formatPhone(phoneNumber);

  // Check lockout
  const locked = await isOtpLocked(phone);
  if (locked) {
    throw new RateLimitError('Too many OTP attempts. Please try again later.', 'OTP_RATE_LIMIT');
  }

  // Verify OTP
  const isValid = await verifyStoredOtp(phone, otp);
  if (!isValid) {
    throw new UnauthorizedError('Invalid or expired OTP', 'INVALID_OTP');
  }

  // Fetch user
  const result = await query(
    `SELECT id, phone_number, display_name, password_hash,
            date_of_birth, gender, preferred_categories,
            is_verified, is_admin, is_banned, verification_status,
            oneid_id, oneid_verified_at, language_preference,
            created_at, updated_at
     FROM users WHERE phone_number = $1`,
    [phone],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const user = result.rows[0] as UserRow;

  // Block banned users from logging in
  if (user.is_banned) {
    throw new ForbiddenError('Account is banned');
  }

  // Determine if the user is new (hasn't completed registration)
  const isNewUser = user.display_name === null;

  // Generate tokens
  const tokens = await generateTokenPair(user.id, user.is_admin);

  return {
    user: toSafeUser(user),
    tokens,
    is_new_user: isNewUser,
  };
}

// ============================================================
// REGISTER (complete profile)
// ============================================================

export interface RegisterData {
  display_name: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  preferred_categories?: CampaignCategory[];
  language_preference?: 'uz' | 'ru' | 'en';
}

/**
 * Completes registration for an authenticated user.
 * Updates the user's profile with display name, DOB, gender, preferences.
 */
export async function register(
  userId: string,
  data: RegisterData,
): Promise<SafeUser> {
  // Verify user exists
  const existingResult = await query(
    'SELECT display_name FROM users WHERE id = $1',
    [userId],
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  if ((existingResult.rows[0] as { display_name: string | null }).display_name !== null) {
    throw new ValidationError('User already registered');
  }

  // Build SET clause dynamically
  const setClauses: string[] = ['display_name = $1'];
  const params: unknown[] = [data.display_name];
  let paramIndex = 2;

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

  // Always update the timestamp
  setClauses.push('updated_at = NOW()');

  // Add userId as last parameter for WHERE clause
  params.push(userId);

  const result = await query(
    `UPDATE users
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, phone_number, display_name, password_hash,
               date_of_birth, gender, preferred_categories,
               is_verified, is_admin, verification_status,
               oneid_id, oneid_verified_at, language_preference,
               created_at, updated_at`,
    params,
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  return toSafeUser(result.rows[0] as UserRow);
}

// ============================================================
// ADMIN LOGIN (Task 2.6)
// ============================================================

/**
 * Authenticates an admin user with phone + password.
 * Only users with is_admin=true and a password_hash can use this endpoint.
 */
export async function adminLogin(
  phoneNumber: string,
  password: string,
): Promise<AuthResponse> {
  const phone = formatPhone(phoneNumber);

  const result = await query(
    `SELECT id, phone_number, display_name, password_hash,
            date_of_birth, gender, preferred_categories,
            is_verified, is_admin, is_banned, verification_status,
            oneid_id, oneid_verified_at, language_preference,
            created_at, updated_at
     FROM users WHERE phone_number = $1`,
    [phone],
  );

  if (result.rows.length === 0) {
    // Use generic message to prevent phone enumeration
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const user = result.rows[0] as UserRow;

  // Block banned users
  if (user.is_banned) {
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Must be an admin
  if (!user.is_admin) {
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Must have a password set
  if (!user.password_hash) {
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const tokens = await generateTokenPair(user.id, user.is_admin);

  return {
    user: toSafeUser(user),
    tokens,
    is_new_user: false,
  };
}

// ============================================================
// ADMIN VERIFY PASSWORD (after OTP-based login)
// ============================================================

/**
 * Verifies the password for an already-authenticated admin user.
 * Used after the normal OTP login flow when the user is an admin.
 * Returns the safe user on success.
 */
export async function verifyAdminPassword(
  userId: string,
  password: string,
): Promise<SafeUser> {
  const result = await query(
    `SELECT id, phone_number, display_name, password_hash,
            date_of_birth, gender, preferred_categories,
            is_verified, is_admin, is_banned, verification_status,
            oneid_id, oneid_verified_at, language_preference,
            created_at, updated_at
     FROM users WHERE id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const user = result.rows[0] as UserRow;

  if (!user.is_admin) {
    throw new ForbiddenError('Not an admin user');
  }

  if (!user.password_hash) {
    throw new UnauthorizedError('Admin password not configured', 'NO_PASSWORD');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid password', 'INVALID_PASSWORD');
  }

  return toSafeUser(user);
}

// ============================================================
// REFRESH TOKENS
// ============================================================

/**
 * Refreshes an access/refresh token pair.
 * Validates the refresh token against Redis, generates new pair,
 * and replaces the old refresh token in Redis.
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  // Verify the JWT signature and expiry
  const payload = verifyRefreshToken(refreshToken);

  // Validate against stored token in Redis
  const isValid = await validateStoredRefreshToken(payload.userId, refreshToken);
  if (!isValid) {
    throw new UnauthorizedError('Refresh token has been revoked', 'TOKEN_REVOKED');
  }

  // Verify user still exists and is not banned
  const userResult = await query(
    'SELECT id, is_admin, is_banned FROM users WHERE id = $1',
    [payload.userId],
  );

  if (userResult.rows.length === 0) {
    await revokeRefreshToken(payload.userId);
    throw new UnauthorizedError('User no longer exists');
  }

  const user = userResult.rows[0] as { id: string; is_admin: boolean; is_banned: boolean };

  if (user.is_banned) {
    await revokeRefreshToken(payload.userId);
    throw new ForbiddenError('Account is banned');
  }

  // Generate new token pair with fresh admin status from DB
  const tokens = await generateTokenPair(payload.userId, user.is_admin);

  return tokens;
}

// ============================================================
// LOGOUT
// ============================================================

/**
 * Logs out a user by revoking their refresh token from Redis.
 */
export async function logout(userId: string): Promise<void> {
  await revokeRefreshToken(userId);
}

// ============================================================
// GET USER BY ID
// ============================================================

/**
 * Fetches a user by ID. Used by auth middleware and getMe endpoint.
 * Returns null if user not found.
 */
export async function getUserById(userId: string): Promise<SafeUser | null> {
  const result = await query(
    `SELECT id, phone_number, display_name, password_hash,
            date_of_birth, gender, preferred_categories,
            is_verified, is_admin, is_banned, verification_status,
            oneid_id, oneid_verified_at, language_preference,
            created_at, updated_at
     FROM users WHERE id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return toSafeUser(result.rows[0] as UserRow);
}

// ============================================================
// SET PASSWORD (for campaign creators)
// ============================================================

/**
 * Sets a password for a regular user (used before campaign creation).
 * Rejects if user already has a password (use a separate change-password flow for that).
 */
export async function setPassword(userId: string, password: string): Promise<SafeUser> {
  // Check if user already has a password
  const existing = await query(
    `SELECT id, password_hash FROM users WHERE id = $1`,
    [userId],
  );

  if (existing.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  if (existing.rows[0].password_hash) {
    throw new ValidationError('Password already set. Use change-password instead.', 'PASSWORD_ALREADY_SET');
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const result = await query(
    `UPDATE users
     SET password_hash = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, phone_number, display_name, password_hash,
               date_of_birth, gender, preferred_categories,
               is_verified, is_admin, is_banned, verification_status,
               oneid_id, oneid_verified_at, language_preference,
               created_at, updated_at`,
    [password_hash, userId],
  );

  return toSafeUser(result.rows[0] as UserRow);
}
