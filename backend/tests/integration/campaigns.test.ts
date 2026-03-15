import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  cleanDatabase,
  createTestUser,
  createTestCampaign,
  createTestWithdrawalAccount,
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

describe('POST /api/campaigns', () => {
  it('creates a campaign in draft status', async () => {
    const user = await createTestUser({ phone_number: '+998901230001', is_verified: true, verification_status: 'approved' });
    // Campaign creation requires at least one withdrawal account
    await createTestWithdrawalAccount(user.id);
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .post('/api/campaigns')
      .set(headers)
      .send({
        title: 'Help for children',
        description: 'We need help for sick children in Tashkent.',
        category: 'medical',
        goal_amount: 1_000_000,
        region: 'tashkent',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Help for children');
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.creator_id).toBe(user.id);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .send({ title: 'Test', description: 'Test', category: 'medical', goal_amount: 100 });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing required fields', async () => {
    const user = await createTestUser({ phone_number: '+998901230002', is_verified: true, verification_status: 'approved' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .post('/api/campaigns')
      .set(headers)
      .send({ title: 'No category' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/campaigns/:id', () => {
  it('returns campaign details', async () => {
    const user = await createTestUser({ phone_number: '+998901230003' });
    const campaign = await createTestCampaign(user.id, { title: 'Specific Campaign' });

    const res = await request(app).get(`/api/campaigns/${campaign.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(campaign.id);
    expect(res.body.data.title).toBe('Specific Campaign');
  });

  it('returns 404 for non-existent campaign', async () => {
    const res = await request(app).get('/api/campaigns/00000000-0000-0000-0000-000000000099');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/campaigns', () => {
  it('lists active campaigns', async () => {
    const user = await createTestUser({ phone_number: '+998901230004' });
    await createTestCampaign(user.id, { title: 'Active Campaign 1', status: 'active' });
    await createTestCampaign(user.id, { title: 'Active Campaign 2', status: 'active' });

    const res = await request(app).get('/api/campaigns').query({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('filters by category', async () => {
    const user = await createTestUser({ phone_number: '+998901230005' });
    await createTestCampaign(user.id, { category: 'education', status: 'active' });
    await createTestCampaign(user.id, { category: 'medical', status: 'active' });

    const res = await request(app).get('/api/campaigns').query({ category: 'education', status: 'active' });

    expect(res.status).toBe(200);
    const campaigns = res.body.data as Array<{ category: string }>;
    expect(campaigns.every((c) => c.category === 'education')).toBe(true);
  });

  it('supports search query', async () => {
    const user = await createTestUser({ phone_number: '+998901230006' });
    await createTestCampaign(user.id, { title: 'Unique Samarkand Campaign', status: 'active' });

    const res = await request(app).get('/api/campaigns').query({ search: 'Unique Samarkand' });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect((res.body.data as Array<{ title: string }>)[0]?.title).toContain('Samarkand');
  });

  it('returns paginated results', async () => {
    const res = await request(app).get('/api/campaigns').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(Number(res.body.pagination.page)).toBe(1);
    expect(Number(res.body.pagination.limit)).toBe(5);
  });
});

describe('PUT /api/campaigns/:id', () => {
  it('allows creator to update their campaign', async () => {
    const user = await createTestUser({ phone_number: '+998901230007', is_verified: true, verification_status: 'approved' });
    await createTestWithdrawalAccount(user.id);
    const campaign = await createTestCampaign(user.id, { status: 'draft' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .put(`/api/campaigns/${campaign.id}`)
      .set(headers)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Title');
  });

  it('returns 403 for non-creator update', async () => {
    const owner = await createTestUser({ phone_number: '+998901230008' });
    const other = await createTestUser({ phone_number: '+998901230009' });
    const campaign = await createTestCampaign(owner.id);
    const { headers } = getTestAuth(other.id);

    const res = await request(app)
      .put(`/api/campaigns/${campaign.id}`)
      .set(headers)
      .send({ title: 'Steal Campaign' });

    expect(res.status).toBe(403);
  });
});

describe('Campaign status transitions', () => {
  it('allows creator to submit draft campaign for review', async () => {
    const user = await createTestUser({ phone_number: '+998901230010', is_verified: true, verification_status: 'approved' });
    await createTestWithdrawalAccount(user.id);
    const campaign = await createTestCampaign(user.id, { status: 'draft' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .put(`/api/campaigns/${campaign.id}/submit`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pending_review');
  });
});
