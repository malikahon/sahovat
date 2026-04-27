import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { cleanDatabase, createTestUser, dbQuery, closeTestPool } from '../helpers/db.js';
import { getTestAuth } from '../helpers/auth.js';
import { redis } from '../../src/config/redis.js';

const app = createApp();

beforeEach(async () => {
  await cleanDatabase();
  // Wipe verify-related Redis keys.
  const keys = await redis.keys('email_verify*');
  if (keys.length > 0) await redis.del(...keys);
});

afterAll(async () => {
  await closeTestPool();
});

async function setEmail(userId: string, email: string, verified = false): Promise<void> {
  await dbQuery(
    `UPDATE users SET email = $1, email_verified_at = $2 WHERE id = $3`,
    [email, verified ? new Date() : null, userId],
  );
}

async function getStoredCode(userId: string): Promise<string | null> {
  return redis.get(`email_verify:${userId}`);
}

describe('PATCH /api/users/me/email', () => {
  it('sets a new email and clears email_verified_at', async () => {
    const user = await createTestUser({ phone_number: '+998900100001' });
    await setEmail(user.id, 'old@example.com', true);
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .patch('/api/users/me/email')
      .set(headers)
      .send({ email: 'NEW@Example.COM' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('new@example.com'); // CITEXT lowercased
    expect(res.body.data.user.email_verified_at).toBeNull();
  });

  it('rejects an email already used by another user', async () => {
    const a = await createTestUser({ phone_number: '+998900100002' });
    const b = await createTestUser({ phone_number: '+998900100003' });
    await setEmail(a.id, 'shared@example.com');

    const { headers } = getTestAuth(b.id);
    const res = await request(app)
      .patch('/api/users/me/email')
      .set(headers)
      .send({ email: 'shared@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('EMAIL_TAKEN');
  });

  it('rejects malformed email', async () => {
    const user = await createTestUser({ phone_number: '+998900100004' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .patch('/api/users/me/email')
      .set(headers)
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/users/me/email/verify-request', () => {
  it('sends a code and stores it in Redis with TTL', async () => {
    const user = await createTestUser({ phone_number: '+998900100010' });
    await setEmail(user.id, 'verifyme@example.com');
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .post('/api/users/me/email/verify-request')
      .set(headers)
      .send({});

    expect(res.status).toBe(200);

    const code = await getStoredCode(user.id);
    expect(code).toMatch(/^\d{6}$/);

    const ttl = await redis.ttl(`email_verify:${user.id}`);
    expect(ttl).toBeGreaterThan(500);
    expect(ttl).toBeLessThanOrEqual(600);
  });

  it('rejects when user has no email', async () => {
    const user = await createTestUser({ phone_number: '+998900100011' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .post('/api/users/me/email/verify-request')
      .set(headers)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('NO_EMAIL_SET');
  });

  it('rejects when email is already verified', async () => {
    const user = await createTestUser({ phone_number: '+998900100012' });
    await setEmail(user.id, 'already@example.com', true);
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .post('/api/users/me/email/verify-request')
      .set(headers)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ALREADY_VERIFIED');
  });

  it('rate-limits after 5 sends in an hour', async () => {
    const user = await createTestUser({ phone_number: '+998900100013' });
    await setEmail(user.id, 'rate@example.com');
    const { headers } = getTestAuth(user.id);

    // First 5 succeed.
    for (let i = 0; i < 5; i++) {
      const ok = await request(app)
        .post('/api/users/me/email/verify-request')
        .set(headers)
        .send({});
      expect(ok.status).toBe(200);
    }

    // Sixth is throttled.
    const res = await request(app)
      .post('/api/users/me/email/verify-request')
      .set(headers)
      .send({});

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('EMAIL_VERIFY_RATE_LIMIT');
  });
});

describe('POST /api/users/me/email/verify-confirm', () => {
  it('marks email_verified_at on correct code', async () => {
    const user = await createTestUser({ phone_number: '+998900100020' });
    await setEmail(user.id, 'confirm@example.com');
    const { headers } = getTestAuth(user.id);

    await request(app)
      .post('/api/users/me/email/verify-request')
      .set(headers)
      .send({});

    const code = await getStoredCode(user.id);
    expect(code).toBeTruthy();

    const res = await request(app)
      .post('/api/users/me/email/verify-confirm')
      .set(headers)
      .send({ code });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email_verified_at).toBeTruthy();

    // Code is consumed — Redis key should be gone.
    const after = await getStoredCode(user.id);
    expect(after).toBeNull();
  });

  it('rejects an incorrect code without consuming the stored one', async () => {
    const user = await createTestUser({ phone_number: '+998900100021' });
    await setEmail(user.id, 'wrong@example.com');
    const { headers } = getTestAuth(user.id);

    await request(app)
      .post('/api/users/me/email/verify-request')
      .set(headers)
      .send({});

    const correct = await getStoredCode(user.id);

    const res = await request(app)
      .post('/api/users/me/email/verify-confirm')
      .set(headers)
      .send({ code: '000000' });

    // Could be the right code in the 1-in-million case. Re-roll if so.
    if (correct === '000000') {
      // Skip — extraordinarily unlikely flake.
      return;
    }

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_CODE');

    // Stored code unchanged.
    const after = await getStoredCode(user.id);
    expect(after).toBe(correct);
  });

  it('rejects when no code has been requested', async () => {
    const user = await createTestUser({ phone_number: '+998900100022' });
    await setEmail(user.id, 'nocode@example.com');
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .post('/api/users/me/email/verify-confirm')
      .set(headers)
      .send({ code: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('CODE_EXPIRED');
  });

  it('rejects malformed code (not 6 digits)', async () => {
    const user = await createTestUser({ phone_number: '+998900100023' });
    await setEmail(user.id, 'short@example.com');
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .post('/api/users/me/email/verify-confirm')
      .set(headers)
      .send({ code: '123' });

    expect(res.status).toBe(400);
  });
});
