import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { cleanDatabase, createTestAdmin, createTestUser, closeTestPool } from '../helpers/db.js';
import { generateTestAccessToken, generateTestRefreshToken } from '../helpers/auth.js';
import { redis } from '../../src/config/redis.js';

const app = createApp();

beforeAll(async () => {
  await cleanDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
  // Clean OTP-related keys from Redis
  const keys = await redis.keys('otp:*');
  if (keys.length > 0) await redis.del(...keys);
  const attemptKeys = await redis.keys('otp_attempts:*');
  if (attemptKeys.length > 0) await redis.del(...attemptKeys);
  const rtKeys = await redis.keys('refresh:*');
  if (rtKeys.length > 0) await redis.del(...rtKeys);
});

afterAll(async () => {
  await closeTestPool();
});

describe('POST /api/auth/request-otp', () => {
  it('returns 200 for a new valid phone number', async () => {
    const res = await request(app)
      .post('/api/auth/request-otp')
      .send({ phone_number: '+998901234501' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 200 for an existing user phone number', async () => {
    await createTestUser({ phone_number: '+998901234502' });

    const res = await request(app)
      .post('/api/auth/request-otp')
      .send({ phone_number: '+998901234502' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 for an invalid phone number', async () => {
    const res = await request(app)
      .post('/api/auth/request-otp')
      .send({ phone_number: '123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when phone_number is missing', async () => {
    const res = await request(app)
      .post('/api/auth/request-otp')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/verify-otp', () => {
  it('returns tokens and user for a valid OTP', async () => {
    const phone = '+998901234503';

    // Request OTP
    await request(app)
      .post('/api/auth/request-otp')
      .send({ phone_number: phone });

    // Get OTP from test endpoint
    const otpRes = await request(app).get(`/api/auth/test-otp/${encodeURIComponent(phone)}`);
    expect(otpRes.status).toBe(200);
    const { otp } = otpRes.body as { otp: string };

    // Verify OTP
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone_number: phone, otp });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.access_token).toBeDefined();
    expect(res.body.data.tokens.refresh_token).toBeDefined();
    expect(res.body.data.is_new_user).toBe(true);
  });

  it('returns 401 for an invalid OTP', async () => {
    const phone = '+998901234504';
    await request(app).post('/api/auth/request-otp').send({ phone_number: phone });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone_number: phone, otp: '000000' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/register', () => {
  it('completes registration for an authenticated new user', async () => {
    // Create a user without display_name
    const user = await createTestUser({ phone_number: '+998901234505', display_name: undefined });
    // Manually set display_name to null in DB (createTestUser sets it)
    // Use a fresh user with null display_name by inserting directly
    const { dbQuery } = await import('../helpers/db.js');
    await dbQuery(`UPDATE users SET display_name = NULL WHERE id = $1`, [user.id]);

    const token = generateTestAccessToken(user.id);

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        display_name: 'Ali Valiyev',
        date_of_birth: '1990-01-15',
        gender: 'male',
        preferred_categories: ['medical', 'education'],
      });

    expect(res.status).toBe(200);
    // register returns { data: { user: { ... } } }
    expect(res.body.data.user.display_name).toBe('Ali Valiyev');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ display_name: 'Test' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/admin/login', () => {
  it('returns tokens for valid admin credentials', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901234506' });

    const res = await request(app)
      .post('/api/auth/admin/login')
      .send({ phone_number: admin.phone_number, password: admin.password });

    expect(res.status).toBe(200);
    expect(res.body.data.tokens.access_token).toBeDefined();
    expect(res.body.data.user.is_admin).toBe(true);
  });

  it('returns 401 for wrong password', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901234507' });

    const res = await request(app)
      .post('/api/auth/admin/login')
      .send({ phone_number: admin.phone_number, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const user = await createTestUser({ phone_number: '+998901234508' });

    const res = await request(app)
      .post('/api/auth/admin/login')
      .send({ phone_number: user.phone_number, password: 'anypassword' });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns new tokens for a valid refresh token', async () => {
    const user = await createTestUser({ phone_number: '+998901234509' });
    const refreshToken = generateTestRefreshToken(user.id);
    // Store refresh token in Redis
    await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 604800);

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(200);
    // Refresh returns { data: { tokens: { access_token, refresh_token } } }
    expect(res.body.data.tokens.access_token).toBeDefined();
    expect(res.body.data.tokens.refresh_token).toBeDefined();
  });

  it('returns 401 for an invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: 'invalid.token.here' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 and removes refresh token from Redis', async () => {
    const user = await createTestUser({ phone_number: '+998901234510' });
    const token = generateTestAccessToken(user.id);
    const refreshToken = generateTestRefreshToken(user.id);
    await redis.set(`refresh:${user.id}`, refreshToken, 'EX', 604800);

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    // Refresh token should be gone from Redis
    const stored = await redis.get(`refresh:${user.id}`);
    expect(stored).toBeNull();
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated user', async () => {
    const user = await createTestUser({ phone_number: '+998901234511', display_name: 'Me User' });
    const token = generateTestAccessToken(user.id);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // /me returns { data: { user: { id, ... } } }
    expect(res.body.data.user.id).toBe(user.id);
    expect(res.body.data.user.phone_number).toBe('+998901234511');
  });
});
