import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  cleanDatabase,
  createTestUser,
  createTestCampaign,
  closeTestPool,
  dbQuery,
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

describe('POST /api/events', () => {
  it('tracks a campaign_viewed event for authenticated user', async () => {
    const user = await createTestUser({ phone_number: '+998901280001' });
    const creator = await createTestUser({ phone_number: '+998901280002' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .post('/api/events')
      .set(headers)
      .send({
        event_type: 'campaign_viewed',
        campaign_id: campaign.id,
        session_id: 'test-session-001',
        metadata: { time_spent_ms: 5000 },
      });

    expect(res.status).toBe(201);

    // Verify event was stored
    const eventResult = await dbQuery(
      `SELECT * FROM user_events WHERE user_id = $1 AND campaign_id = $2`,
      [user.id, campaign.id],
    );
    expect(eventResult.rows.length).toBe(1);
    expect((eventResult.rows[0] as { event_type: string }).event_type).toBe('campaign_viewed');
  });

  it('tracks event for guest (no auth required)', async () => {
    const creator = await createTestUser({ phone_number: '+998901280003' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    const res = await request(app)
      .post('/api/events')
      .send({
        event_type: 'campaign_viewed',
        campaign_id: campaign.id,
        session_id: 'guest-session-001',
      });

    expect(res.status).toBe(201);
  });

  it('returns 400 for invalid event type', async () => {
    const creator = await createTestUser({ phone_number: '+998901280004' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    const res = await request(app)
      .post('/api/events')
      .send({
        event_type: 'invalid_event_type',
        campaign_id: campaign.id,
        session_id: 'test-session-002',
      });

    expect(res.status).toBe(400);
  });

  it('increments category score when user views a medical campaign', async () => {
    const user = await createTestUser({ phone_number: '+998901280005' });
    const creator = await createTestUser({ phone_number: '+998901280006' });
    const campaign = await createTestCampaign(creator.id, { status: 'active', category: 'medical' });
    const { headers } = getTestAuth(user.id);

    await request(app)
      .post('/api/events')
      .set(headers)
      .send({
        event_type: 'campaign_viewed',
        campaign_id: campaign.id,
        session_id: 'test-session-003',
      });

    // Category score should be created/updated
    const scoreResult = await dbQuery(
      `SELECT score FROM user_category_scores WHERE user_id = $1 AND category = 'medical'`,
      [user.id],
    );
    expect(scoreResult.rows.length).toBe(1);
    expect(Number((scoreResult.rows[0] as { score: string }).score)).toBeGreaterThan(0);
  });
});
