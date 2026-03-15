import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  cleanDatabase,
  createTestUser,
  createTestCampaign,
  closeTestPool,
} from '../helpers/db.js';
import { getTestAuth } from '../helpers/auth.js';

const app = createApp();

beforeAll(async () => {
  await cleanDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await closeTestPool();
});

describe('GET /api/feed', () => {
  it('returns active campaigns for guest (unauthenticated)', async () => {
    const creator = await createTestUser({ phone_number: '+998901270001' });
    await createTestCampaign(creator.id, { status: 'active', title: 'Feed Campaign 1' });
    await createTestCampaign(creator.id, { status: 'active', title: 'Feed Campaign 2' });

    const res = await request(app).get('/api/feed');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const data = res.body.data as Array<{ status: string }>;
    // All returned campaigns should be active
    expect(data.every((c) => c.status === 'active')).toBe(true);
  });

  it('returns campaigns for authenticated user', async () => {
    const user = await createTestUser({ phone_number: '+998901270002' });
    const creator = await createTestUser({ phone_number: '+998901270003' });
    await createTestCampaign(creator.id, { status: 'active' });

    const { headers } = getTestAuth(user.id);
    const res = await request(app).get('/api/feed').set(headers);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('supports pagination', async () => {
    const creator = await createTestUser({ phone_number: '+998901270004' });
    for (let i = 0; i < 5; i++) {
      await createTestCampaign(creator.id, { status: 'active', title: `Paginated Feed ${i}` });
    }

    const res = await request(app).get('/api/feed').query({ limit: 3, page: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(3);
    expect(res.body.pagination).toBeDefined();
  });

  it('does not include draft or cancelled campaigns', async () => {
    const creator = await createTestUser({ phone_number: '+998901270005' });
    await createTestCampaign(creator.id, { status: 'draft', title: 'Draft Should Not Appear' });
    await createTestCampaign(creator.id, { status: 'cancelled', title: 'Cancelled Should Not Appear' });

    const res = await request(app).get('/api/feed');

    expect(res.status).toBe(200);
    const data = res.body.data as Array<{ title: string }>;
    expect(data.some((c) => c.title === 'Draft Should Not Appear')).toBe(false);
    expect(data.some((c) => c.title === 'Cancelled Should Not Appear')).toBe(false);
  });
});
