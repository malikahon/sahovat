import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  cleanDatabase,
  createTestUser,
  createTestCampaign,
  createTestDonation,
  createTestWithdrawalAccount,
  createTestAdmin,
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

describe('POST /api/withdrawals', () => {
  it('creates a pending withdrawal when balance is sufficient', async () => {
    const organizer = await createTestUser({ phone_number: '+998901250001', is_verified: true, verification_status: 'approved' });
    const campaign = await createTestCampaign(organizer.id, { status: 'active', goal_amount: 1_000_000 });
    // Seed a completed donation so campaign has funds
    await createTestDonation(campaign.id, organizer.id, { amount: 200_000, status: 'completed' });
    const account = await createTestWithdrawalAccount(organizer.id);
    const { headers } = getTestAuth(organizer.id);

    const res = await request(app)
      .post('/api/withdrawals')
      .set(headers)
      .send({
        campaign_id: campaign.id,
        amount: 100_000,
        withdrawal_account_id: account.id,
      });

    expect(res.status).toBe(201);
    // requestWithdrawal returns { data: { withdrawal: { ... } } }
    expect(res.body.data.withdrawal.status).toBe('pending');
    expect(Number(res.body.data.withdrawal.amount)).toBe(100_000);
  });

  it('returns 400 when withdrawal amount exceeds available balance', async () => {
    const organizer = await createTestUser({ phone_number: '+998901250002', is_verified: true, verification_status: 'approved' });
    const campaign = await createTestCampaign(organizer.id, { status: 'active' });
    // No donations — balance is 0
    const account = await createTestWithdrawalAccount(organizer.id);
    const { headers } = getTestAuth(organizer.id);

    const res = await request(app)
      .post('/api/withdrawals')
      .set(headers)
      .send({
        campaign_id: campaign.id,
        amount: 500_000,
        withdrawal_account_id: account.id,
      });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/withdrawals')
      .send({ campaign_id: 'x', amount: 1000, withdrawal_account_id: 'x' });

    expect(res.status).toBe(401);
  });
});

describe('Admin withdrawal actions', () => {
  it('admin can approve a pending withdrawal', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901250003' });
    const organizer = await createTestUser({ phone_number: '+998901250004', is_verified: true, verification_status: 'approved' });
    const campaign = await createTestCampaign(organizer.id, { status: 'active' });
    await createTestDonation(campaign.id, organizer.id, { amount: 200_000, status: 'completed' });
    const account = await createTestWithdrawalAccount(organizer.id);

    // Create withdrawal
    const { headers: orgHeaders } = getTestAuth(organizer.id);
    const withdrawRes = await request(app)
      .post('/api/withdrawals')
      .set(orgHeaders)
      .send({ campaign_id: campaign.id, amount: 100_000, withdrawal_account_id: account.id });
    const withdrawalId = (withdrawRes.body.data.withdrawal as { id: string }).id;

    // Admin approves
    const { headers: adminHeaders } = getTestAuth(admin.id, true);
    const res = await request(app)
      .patch(`/api/admin/withdrawals/${withdrawalId}/review`)
      .set(adminHeaders)
      .send({ action: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('admin can complete an approved withdrawal', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901250005' });
    const organizer = await createTestUser({ phone_number: '+998901250006', is_verified: true, verification_status: 'approved' });
    const campaign = await createTestCampaign(organizer.id, { status: 'active' });
    await createTestDonation(campaign.id, organizer.id, { amount: 200_000, status: 'completed' });
    const account = await createTestWithdrawalAccount(organizer.id);

    const { headers: orgHeaders } = getTestAuth(organizer.id);
    const withdrawRes = await request(app)
      .post('/api/withdrawals')
      .set(orgHeaders)
      .send({ campaign_id: campaign.id, amount: 100_000, withdrawal_account_id: account.id });
    const withdrawalId = (withdrawRes.body.data.withdrawal as { id: string }).id;

    // First approve
    const { headers: adminHeaders } = getTestAuth(admin.id, true);
    await request(app)
      .patch(`/api/admin/withdrawals/${withdrawalId}/review`)
      .set(adminHeaders)
      .send({ action: 'approve' });

    // Then complete
    const res = await request(app)
      .patch(`/api/admin/withdrawals/${withdrawalId}/complete`)
      .set(adminHeaders)
      .send({ transaction_reference: 'TXN-BANK-001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('non-admin cannot access admin withdrawal routes', async () => {
    const user = await createTestUser({ phone_number: '+998901250007' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app)
      .put('/api/admin/withdrawals/00000000-0000-0000-0000-000000000001/review')
      .set(headers)
      .send({ action: 'approve' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/withdrawals/dashboard', () => {
  it('returns per-campaign withdrawal dashboard for organizer', async () => {
    const organizer = await createTestUser({ phone_number: '+998901250008', is_verified: true, verification_status: 'approved' });
    const campaign = await createTestCampaign(organizer.id, { status: 'active' });
    await createTestDonation(campaign.id, organizer.id, { amount: 100_000, status: 'completed' });

    const { headers } = getTestAuth(organizer.id);
    const res = await request(app).get('/api/withdrawals/dashboard').set(headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Dashboard returns { data: { campaigns: [...], totals: {...} } }
    expect(Array.isArray(res.body.data.campaigns)).toBe(true);
  });
});
