import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { cleanDatabase, createTestUser, dbQuery, closeTestPool } from '../helpers/db.js';
import { getTestAuth } from '../helpers/auth.js';

const app = createApp();

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await closeTestPool();
});

async function setEmailVerified(userId: string, email: string): Promise<void> {
  await dbQuery(
    `UPDATE users SET email = $1, email_verified_at = NOW() WHERE id = $2`,
    [email, userId],
  );
}

describe('GET /api/users/me/notification-preferences', () => {
  it('returns the full preference grid for the authenticated user', async () => {
    const user = await createTestUser({ phone_number: '+998900200001' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .get('/api/users/me/notification-preferences')
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const prefs = res.body.data.preferences as Array<{
      event_type: string;
      channel: string;
      enabled: boolean;
    }>;
    // 7 events × 3 channels = 21 rows.
    expect(prefs.length).toBe(21);
    // SMS + Telegram default to enabled.
    const smsRows = prefs.filter((p) => p.channel === 'sms');
    const tgRows = prefs.filter((p) => p.channel === 'telegram');
    expect(smsRows.every((r) => r.enabled === true)).toBe(true);
    expect(tgRows.every((r) => r.enabled === true)).toBe(true);
    // Email defaults to disabled when email_verified_at is null.
    const emailRows = prefs.filter((p) => p.channel === 'email');
    expect(emailRows.every((r) => r.enabled === false)).toBe(true);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/users/me/notification-preferences');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/users/me/notification-preferences', () => {
  it('updates the requested channels and returns the new full grid', async () => {
    const user = await createTestUser({ phone_number: '+998900200002' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .put('/api/users/me/notification-preferences')
      .set(headers)
      .send({
        updates: [
          { event_type: 'donation_completed', channel: 'sms', enabled: false },
          { event_type: 'donation_completed', channel: 'telegram', enabled: true },
        ],
      });

    expect(res.status).toBe(200);
    const prefs = res.body.data.preferences as Array<{
      event_type: string;
      channel: string;
      enabled: boolean;
    }>;
    const smsForDonation = prefs.find(
      (p) => p.event_type === 'donation_completed' && p.channel === 'sms',
    );
    expect(smsForDonation?.enabled).toBe(false);
    const tgForDonation = prefs.find(
      (p) => p.event_type === 'donation_completed' && p.channel === 'telegram',
    );
    expect(tgForDonation?.enabled).toBe(true);
  });

  it('rejects enabling email when email is unverified', async () => {
    const user = await createTestUser({ phone_number: '+998900200003' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .put('/api/users/me/notification-preferences')
      .set(headers)
      .send({
        updates: [
          { event_type: 'donation_completed', channel: 'email', enabled: true },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('EMAIL_NOT_VERIFIED');
  });

  it('allows enabling email when email is verified', async () => {
    const user = await createTestUser({ phone_number: '+998900200004' });
    await setEmailVerified(user.id, 'verified@example.com');
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .put('/api/users/me/notification-preferences')
      .set(headers)
      .send({
        updates: [
          { event_type: 'donation_completed', channel: 'email', enabled: true },
        ],
      });

    expect(res.status).toBe(200);
    const prefs = res.body.data.preferences as Array<{
      event_type: string;
      channel: string;
      enabled: boolean;
    }>;
    const emailForDonation = prefs.find(
      (p) => p.event_type === 'donation_completed' && p.channel === 'email',
    );
    expect(emailForDonation?.enabled).toBe(true);
  });

  it('rejects bad event types via zod validation', async () => {
    const user = await createTestUser({ phone_number: '+998900200005' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .put('/api/users/me/notification-preferences')
      .set(headers)
      .send({
        updates: [
          { event_type: 'bogus_event', channel: 'sms', enabled: true },
        ],
      });

    expect(res.status).toBe(400);
  });

  it('rejects bad channels via zod validation', async () => {
    const user = await createTestUser({ phone_number: '+998900200006' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .put('/api/users/me/notification-preferences')
      .set(headers)
      .send({
        updates: [
          { event_type: 'donation_completed', channel: 'whatsapp', enabled: true },
        ],
      });

    expect(res.status).toBe(400);
  });

  it('rejects empty updates array', async () => {
    const user = await createTestUser({ phone_number: '+998900200007' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .put('/api/users/me/notification-preferences')
      .set(headers)
      .send({ updates: [] });

    expect(res.status).toBe(400);
  });
});
