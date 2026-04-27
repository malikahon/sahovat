import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { query } from '../../config/database.js';
import { redis } from '../../config/redis.js';
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
import { verifyTelegramAuth } from '../../services/telegram-auth.service.js';
import type { CampaignCategory } from '../../types/entities.js';
import type { AuthResponse, AuthTokens } from '../../types/api.js';
import type { UserRow, SafeUser } from './auth.types.js';
import { ConflictError } from '../../lib/errors.js';

const PG_UNIQUE_VIOLATION = '23505';

const BCRYPT_SALT_ROUNDS = 12;
const REG_TOKEN_PREFIX = 'reg_token:';
const REG_TOKEN_TTL_SECONDS = 30 * 60; // 30 minutes

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
 * Generates and sends OTP via SMS.
 * Does NOT create a user record — that only happens during registration.
 */
export async function requestOtp(phoneNumber: string): Promise<string> {
  const phone = formatPhone(phoneNumber);

  if (!validateUzbekPhone(phone)) {
    throw new ValidationError('Invalid Uzbek phone number', 'INVALID_PHONE');
  }

  // Check if phone is locked out from too many OTP attempts
  const locked = await isOtpLocked(phone);
  if (locked) {
    throw new RateLimitError('Too many OTP attempts. Please try again later.', 'OTP_RATE_LIMIT');
  }

  // Check if user is banned (if they exist)
  const existingResult = await query(
    'SELECT is_banned FROM users WHERE phone_number = $1',
    [phone],
  );
  if (existingResult.rows.length > 0 && (existingResult.rows[0] as { is_banned: boolean }).is_banned) {
    throw new ForbiddenError('Account is banned');
  }

  // Generate and store OTP
  const otp = generateOtp();
  await storeOtp(phone, otp);

  // Send OTP via SMS (non-fatal — OTP is already stored in Redis)
  try {
    await smsService.sendOtp(phone, otp);
  } catch (err) {
    console.error('[Sahovat] SMS send failed (non-fatal):', (err as Error).message);
  }

  return otp;
}

// ============================================================
// VERIFY OTP
// ============================================================

/**
 * Verifies an OTP for a phone number.
 * If user exists and has completed registration: returns user + JWT tokens.
 * If user doesn't exist or hasn't completed registration: returns is_new_user + registration_token.
 */
export async function verifyOtpAndLogin(
  phoneNumber: string,
  otp: string,
): Promise<AuthResponse & { registration_token?: string }> {
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
            telegram_id, telegram_username, telegram_photo_url, telegram_linked_at,
            preferred_otp_channel, email, email_verified_at,
            created_at, updated_at
     FROM users WHERE phone_number = $1`,
    [phone],
  );

  // No user record exists OR user hasn't completed registration (no display_name)
  const userRow = result.rows.length > 0 ? (result.rows[0] as UserRow) : null;
  const isNewUser = !userRow || userRow.display_name === null;

  if (isNewUser) {
    // Block banned users
    if (userRow?.is_banned) {
      throw new ForbiddenError('Account is banned');
    }

    // Generate a temporary registration token and store it in Redis
    const registrationToken = randomBytes(32).toString('hex');
    await redis.set(
      `${REG_TOKEN_PREFIX}${registrationToken}`,
      phone,
      'EX',
      REG_TOKEN_TTL_SECONDS,
    );

    // For users that exist but haven't completed registration, also return tokens
    // so they can access the register page as an authenticated user
    if (userRow) {
      const tokens = await generateTokenPair(userRow.id, userRow.is_admin);
      return {
        user: toSafeUser(userRow),
        tokens,
        is_new_user: true,
        registration_token: registrationToken,
      };
    }

    // Truly new user — no user record, no tokens
    return {
      user: null as unknown as ReturnType<typeof toSafeUser>,
      tokens: { access_token: '', refresh_token: '' },
      is_new_user: true,
      registration_token: registrationToken,
    };
  }

  // Existing registered user
  if (userRow.is_banned) {
    throw new ForbiddenError('Account is banned');
  }

  const tokens = await generateTokenPair(userRow.id, userRow.is_admin);

  return {
    user: toSafeUser(userRow),
    tokens,
    is_new_user: false,
  };
}

/**
 * Validates a registration token from Redis.
 * Returns the phone number if valid, null otherwise.
 * Consumes (deletes) the token on successful validation.
 */
export async function validateRegistrationToken(token: string): Promise<string | null> {
  const key = `${REG_TOKEN_PREFIX}${token}`;
  const phone = await redis.get(key);
  if (!phone) return null;
  await redis.del(key);
  return phone;
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
  registration_token?: string;
  email?: string;
}

/**
 * Completes registration for a user.
 * Accepts either:
 * - An authenticated user (userId) who has an incomplete profile
 * - A registration_token for truly new users (no DB record yet)
 *
 * Returns user + tokens so the frontend can set auth cookies.
 */
export async function register(
  userId: string | null,
  data: RegisterData,
): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  let phone: string | null = null;

  // If a registration token is provided, validate it to get the phone
  if (data.registration_token) {
    phone = await validateRegistrationToken(data.registration_token);
    if (!phone) {
      throw new UnauthorizedError('Invalid or expired registration token', 'INVALID_REG_TOKEN');
    }
  }

  try {
    // Determine the target user
    if (userId) {
      // Authenticated user completing registration
      const existingResult = await query(
        'SELECT id, display_name, phone_number FROM users WHERE id = $1',
        [userId],
      );

      if (existingResult.rows.length === 0) {
        throw new NotFoundError('User not found');
      }

      const existing = existingResult.rows[0] as { id: string; display_name: string | null; phone_number: string | null };
      if (existing.display_name !== null) {
        throw new ValidationError('User already registered');
      }

      // Update the existing user's profile
      const user = await updateUserProfile(existing.id, data);
      const tokens = await generateTokenPair(user.id, user.is_admin);
      return { user, tokens };
    } else if (phone) {
      // New user via registration token — check if a partial record exists
      const existingResult = await query(
        'SELECT id, display_name FROM users WHERE phone_number = $1',
        [phone],
      );

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0] as { id: string; display_name: string | null };
        if (existing.display_name !== null) {
          throw new ValidationError('User already registered');
        }
        // Update the existing incomplete user
        const user = await updateUserProfile(existing.id, data);
        const tokens = await generateTokenPair(user.id, user.is_admin);
        return { user, tokens };
      }

      // Create a brand new user with profile data in one step
      const insertResult = await query(
        `INSERT INTO users (phone_number, display_name, date_of_birth, gender, preferred_categories, language_preference, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, phone_number, display_name, password_hash,
                   date_of_birth, gender, preferred_categories,
                   is_verified, is_admin, is_banned, verification_status,
                   oneid_id, oneid_verified_at, language_preference,
                   telegram_id, telegram_username, telegram_photo_url, telegram_linked_at,
                   preferred_otp_channel, email, email_verified_at,
                   created_at, updated_at`,
        [
          phone,
          data.display_name,
          data.date_of_birth || null,
          data.gender || null,
          data.preferred_categories || [],
          data.language_preference || 'uz',
          data.email ?? null,
        ],
      );

      const user = toSafeUser(insertResult.rows[0] as UserRow);
      const tokens = await generateTokenPair(user.id, user.is_admin);
      return { user, tokens };
    } else {
      throw new UnauthorizedError('Authentication or registration token required');
    }
  } catch (err) {
    // Map unique-constraint violations to clean validation errors.
    if ((err as { code?: string }).code === PG_UNIQUE_VIOLATION) {
      const detail = String((err as { detail?: string }).detail ?? '');
      if (detail.includes('(email)')) {
        throw new ValidationError('This email is already in use', 'EMAIL_TAKEN');
      }
      if (detail.includes('(phone_number)')) {
        throw new ValidationError('This phone number is already registered', 'PHONE_TAKEN');
      }
    }
    throw err;
  }
}

/**
 * Helper: Updates an existing user's profile fields.
 */
async function updateUserProfile(userId: string, data: RegisterData): Promise<SafeUser> {
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

  if (data.email !== undefined) {
    setClauses.push(`email = $${paramIndex}`);
    params.push(data.email);
    paramIndex++;
    // Changing email always invalidates the prior verification.
    setClauses.push('email_verified_at = NULL');
  }

  setClauses.push('updated_at = NOW()');
  params.push(userId);

  const result = await query(
    `UPDATE users
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, phone_number, display_name, password_hash,
               date_of_birth, gender, preferred_categories,
               is_verified, is_admin, is_banned, verification_status,
               oneid_id, oneid_verified_at, language_preference,
               telegram_id, telegram_username, telegram_photo_url, telegram_linked_at,
               preferred_otp_channel, email, email_verified_at,
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
            telegram_id, telegram_username, telegram_photo_url, telegram_linked_at,
            preferred_otp_channel, email, email_verified_at,
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
            telegram_id, telegram_username, telegram_photo_url, telegram_linked_at,
            preferred_otp_channel, email, email_verified_at,
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
            telegram_id, telegram_username, telegram_photo_url, telegram_linked_at,
            preferred_otp_channel, email, email_verified_at,
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
               telegram_id, telegram_username, telegram_photo_url, telegram_linked_at,
               preferred_otp_channel, email, email_verified_at,
               created_at, updated_at`,
    [password_hash, userId],
  );

  return toSafeUser(result.rows[0] as UserRow);
}

// ============================================================
// TELEGRAM AUTH (Week 1)
// ============================================================

const FULL_USER_COLUMNS = `id, phone_number, display_name, password_hash,
  date_of_birth, gender, preferred_categories,
  is_verified, is_admin, is_banned, verification_status,
  oneid_id, oneid_verified_at, language_preference,
  telegram_id, telegram_username, telegram_photo_url, telegram_linked_at,
  preferred_otp_channel, email, email_verified_at,
  created_at, updated_at`;

/**
 * Composes a default display_name from a Telegram payload's first/last name.
 * Falls back to username if no first name (rare). Returns null if neither.
 */
function deriveTelegramDisplayName(data: {
  first_name?: string;
  last_name?: string;
  username?: string;
}): string | null {
  const parts = [data.first_name, data.last_name]
    .filter((p): p is string => Boolean(p && p.trim().length))
    .map((p) => p.trim());
  if (parts.length > 0) return parts.join(' ');
  if (data.username) return `@${data.username}`;
  return null;
}

/**
 * Logs a user in via the Telegram Login Widget.
 *
 * Flow:
 *  1. Verify HMAC of the payload (throws on failure).
 *  2. Look up user by telegram_id.
 *  3. If found → check ban → issue tokens.
 *  4. If not found → create a new user with telegram_id and default
 *     display_name from first/last name. phone_number remains NULL.
 */
export async function telegramLogin(
  payload: Record<string, string | undefined>,
): Promise<AuthResponse> {
  const verified = verifyTelegramAuth(payload);
  const telegramId = verified.id;

  // Look up by telegram_id (BIGINT).
  const existing = await query(
    `SELECT ${FULL_USER_COLUMNS}
     FROM users
     WHERE telegram_id = $1`,
    [telegramId],
  );

  if (existing.rows.length > 0) {
    const user = existing.rows[0] as UserRow;

    if (user.is_banned) {
      throw new ForbiddenError('Account is banned');
    }

    // Refresh telegram metadata in case the user changed username/photo.
    await query(
      `UPDATE users
       SET telegram_username   = $1,
           telegram_photo_url  = $2,
           updated_at          = NOW()
       WHERE id = $3`,
      [verified.username ?? null, verified.photo_url ?? null, user.id],
    );

    const tokens = await generateTokenPair(user.id, user.is_admin);
    return {
      user: toSafeUser({
        ...user,
        telegram_username: verified.username ?? null,
        telegram_photo_url: verified.photo_url ?? null,
      }),
      tokens,
      is_new_user: false,
    };
  }

  // No existing user — create one. display_name is set so the user is NOT
  // flagged as "new" / incomplete (registration page won't appear).
  const displayName = deriveTelegramDisplayName(verified);

  const insertResult = await query(
    `INSERT INTO users (
       telegram_id, telegram_username, telegram_photo_url, telegram_linked_at,
       display_name, preferred_otp_channel, language_preference
     )
     VALUES ($1, $2, $3, NOW(), $4, 'telegram', 'uz')
     RETURNING ${FULL_USER_COLUMNS}`,
    [
      telegramId,
      verified.username ?? null,
      verified.photo_url ?? null,
      displayName,
    ],
  );

  const newUser = insertResult.rows[0] as UserRow;
  const tokens = await generateTokenPair(newUser.id, newUser.is_admin);

  // is_new_user=true tells the frontend to redirect to /register so the
  // user can fill in optional profile fields. They are still authenticated.
  const isIncomplete = newUser.display_name === null;

  return {
    user: toSafeUser(newUser),
    tokens,
    is_new_user: isIncomplete,
  };
}

/**
 * Links a Telegram identity to the currently authenticated user.
 * Refuses if the telegram_id is already linked to a different user.
 */
export async function telegramLink(
  userId: string,
  payload: Record<string, string | undefined>,
): Promise<SafeUser> {
  const verified = verifyTelegramAuth(payload);
  const telegramId = verified.id;

  // Reject if the Telegram account is already on another user.
  const conflict = await query(
    `SELECT id FROM users WHERE telegram_id = $1 AND id <> $2`,
    [telegramId, userId],
  );
  if (conflict.rows.length > 0) {
    throw new ConflictError(
      'This Telegram account is already linked to another Sahovat account',
      'TELEGRAM_ALREADY_LINKED',
    );
  }

  const result = await query(
    `UPDATE users
     SET telegram_id          = $1,
         telegram_username    = $2,
         telegram_photo_url   = $3,
         telegram_linked_at   = NOW(),
         updated_at           = NOW()
     WHERE id = $4
     RETURNING ${FULL_USER_COLUMNS}`,
    [
      telegramId,
      verified.username ?? null,
      verified.photo_url ?? null,
      userId,
    ],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  return toSafeUser(result.rows[0] as UserRow);
}

/**
 * Unlinks the current user's Telegram identity.
 *
 * Safety: refuses if doing so would leave the user with no way to log in.
 * A user must retain at least ONE of: phone_number, password_hash, or
 * telegram_id. Phone alone or password alone is sufficient. (Password without
 * phone is uncommon but possible for admin-seeded accounts.)
 */
export async function telegramUnlink(userId: string): Promise<SafeUser> {
  const result = await query(
    `SELECT ${FULL_USER_COLUMNS} FROM users WHERE id = $1`,
    [userId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const user = result.rows[0] as UserRow;

  if (user.telegram_id === null) {
    // Idempotent — nothing to do.
    return toSafeUser(user);
  }

  // Block unlink that would orphan the account.
  const hasPhone = !!user.phone_number;
  const hasPassword = !!user.password_hash;
  if (!hasPhone && !hasPassword) {
    throw new ValidationError(
      'Cannot unlink Telegram: this is your only login method. Add a phone number first.',
      'WOULD_ORPHAN_ACCOUNT',
    );
  }

  const updated = await query(
    `UPDATE users
     SET telegram_id          = NULL,
         telegram_username    = NULL,
         telegram_photo_url   = NULL,
         telegram_linked_at   = NULL,
         updated_at           = NOW()
     WHERE id = $1
     RETURNING ${FULL_USER_COLUMNS}`,
    [userId],
  );

  return toSafeUser(updated.rows[0] as UserRow);
}
