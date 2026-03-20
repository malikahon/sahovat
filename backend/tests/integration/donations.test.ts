import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  cleanDatabase,
  createTestUser,
  createTestCampaign,
  createTestDonation,
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

describe('POST /api/donations/initiate', () => {
  it('creates a pending donation and returns checkout_url', async () => {
    const user = await createTestUser({ phone_number: '+998901240001' });
    const creator = await createTestUser({ phone_number: '+998901240002' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({
        campaign_id: campaign.id,
        amount: 50_000,
        payment_provider: 'payme',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.donation.status).toBe('pending');
    expect(res.body.data.checkout_url).toBeDefined();
    expect(res.body.data.donation.amount).toBe(50_500);
  });

  it('returns 400 for inactive campaign', async () => {
    const user = await createTestUser({ phone_number: '+998901240003' });
    const creator = await createTestUser({ phone_number: '+998901240004' });
    const campaign = await createTestCampaign(creator.id, { status: 'draft' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({ campaign_id: campaign.id, amount: 10_000, payment_provider: 'payme' });

    expect(res.status).toBe(400);
  });

  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/donations/initiate')
      .send({ campaign_id: '00000000-0000-0000-0000-000000000001', amount: 10_000 });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/donations/webhook/payme', () => {
  it('marks donation as completed and updates campaign balance', async () => {
    const user = await createTestUser({ phone_number: '+998901240005' });
    const creator = await createTestUser({ phone_number: '+998901240006' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });
    const donation = await createTestDonation(campaign.id, user.id, { status: 'pending' });

    const balanceBefore = Number((await dbQuery(
      `SELECT current_amount FROM campaigns WHERE id = $1`,
      [campaign.id],
    )).rows[0].current_amount);

    const res = await request(app)
      .post('/api/donations/webhook/payme')
      .send({
        donation_id: donation.id,
        transaction_id: 'TXN-TEST-001',
        status: 'completed',
        amount: donation.amount,
      });

    expect(res.status).toBe(200);

    // Check donation status
    const donationRow = (await dbQuery(
      `SELECT status FROM donations WHERE id = $1`,
      [donation.id],
    )).rows[0] as { status: string };
    expect(donationRow.status).toBe('completed');

    // Check campaign balance increased
    const balanceAfter = Number((await dbQuery(
      `SELECT current_amount FROM campaigns WHERE id = $1`,
      [campaign.id],
    )).rows[0].current_amount);
    expect(balanceAfter).toBeGreaterThan(balanceBefore);
  });

  it('marks donation as failed without updating balance', async () => {
    const user = await createTestUser({ phone_number: '+998901240007' });
    const creator = await createTestUser({ phone_number: '+998901240008' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });
    const donation = await createTestDonation(campaign.id, user.id, { status: 'pending' });

    const balanceBefore = Number((await dbQuery(
      `SELECT current_amount FROM campaigns WHERE id = $1`,
      [campaign.id],
    )).rows[0].current_amount);

    await request(app)
      .post('/api/donations/webhook/payme')
      .send({
        donation_id: donation.id,
        transaction_id: 'TXN-FAIL-001',
        status: 'failed',
        amount: donation.amount,
      });

    const donationRow = (await dbQuery(
      `SELECT status FROM donations WHERE id = $1`,
      [donation.id],
    )).rows[0] as { status: string };
    expect(donationRow.status).toBe('failed');

    // Balance should NOT change
    const balanceAfter = Number((await dbQuery(
      `SELECT current_amount FROM campaigns WHERE id = $1`,
      [campaign.id],
    )).rows[0].current_amount);
    expect(balanceAfter).toBe(balanceBefore);
  });

  it('handles duplicate webhook idempotently for same status', async () => {
    const user = await createTestUser({ phone_number: '+998901240009' });
    const creator = await createTestUser({ phone_number: '+998901240010' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });
    const donation = await createTestDonation(campaign.id, user.id, { status: 'completed' });

    // same status as existing — idempotent, returns 200
    const res = await request(app)
      .post('/api/donations/webhook/payme')
      .send({
        donation_id: donation.id,
        transaction_id: 'TXN-DOUBLE',
        status: 'completed',
        amount: donation.amount,
      });

    expect(res.status).toBe(200);
  });

  it('rejects webhook with conflicting status for already-processed donation', async () => {
    const user = await createTestUser({ phone_number: '+998901240011' });
    const creator = await createTestUser({ phone_number: '+998901240012' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });
    const donation = await createTestDonation(campaign.id, user.id, { status: 'completed' });

    // conflicting status (failed vs completed) — should reject
    const res = await request(app)
      .post('/api/donations/webhook/payme')
      .send({
        donation_id: donation.id,
        transaction_id: 'TXN-CONFLICT',
        status: 'failed',
        amount: donation.amount,
      });

    expect(res.status).toBe(400);
  });
});

describe('Anonymous donation masking', () => {
  it('masks donor info in campaign donation list for anonymous donations', async () => {
    const donor = await createTestUser({ phone_number: '+998901240011' });
    const creator = await createTestUser({ phone_number: '+998901240012' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });
    await createTestDonation(campaign.id, donor.id, { status: 'completed', is_anonymous: true });

    const res = await request(app).get(`/api/donations/campaign/${campaign.id}`);

    expect(res.status).toBe(200);
    const donations = res.body.data as Array<{ donor_id: string; donor_display_name: string }>;
    const donation = donations[0];
    if (donation) {
      expect(donation.donor_id).toBe('anonymous');
    }
  });
});

describe('GET /api/donations/my', () => {
  it('returns only the authenticated user donations', async () => {
    const donor = await createTestUser({ phone_number: '+998901240013' });
    const other = await createTestUser({ phone_number: '+998901240014' });
    const creator = await createTestUser({ phone_number: '+998901240015' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    await createTestDonation(campaign.id, donor.id, { status: 'completed' });
    await createTestDonation(campaign.id, other.id, { status: 'completed' });

    const { headers } = getTestAuth(donor.id);
    const res = await request(app).get('/api/donations/my').set(headers);

    expect(res.status).toBe(200);
    const donations = res.body.data as Array<{ donor_id: string }>;
    // All returned donations belong to this donor
    expect(donations.every((d) => d.donor_id === donor.id)).toBe(true);
  });
});
