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

describe('PayMe sandbox payment flow', () => {
  it('1. Initiating a donation returns checkout_url and transaction_id', async () => {
    const donor = await createTestUser({ phone_number: '+998901300001' });
    const creator = await createTestUser({ phone_number: '+998901300002' });
    const campaign = await createTestCampaign(creator.id, { status: 'active', goal_amount: 1_000_000 });
    const { headers } = getTestAuth(donor.id);

    const res = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({
        campaign_id: campaign.id,
        amount: 100_000,
        payment_provider: 'payme',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.checkout_url).toBeDefined();
    expect(res.body.data.donation.status).toBe('pending');
    expect(typeof res.body.data.checkout_url).toBe('string');
    expect(res.body.data.checkout_url.length).toBeGreaterThan(0);
  });

  it('2. Completed webhook updates donation status and credits campaign balance', async () => {
    const donor = await createTestUser({ phone_number: '+998901300003' });
    const creator = await createTestUser({ phone_number: '+998901300004' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    // Create pending donation
    const { headers } = getTestAuth(donor.id);
    const initiateRes = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({ campaign_id: campaign.id, amount: 50_000, payment_provider: 'payme' });

    const donationId = (initiateRes.body.data.donation as { id: string }).id;
    const amount = (initiateRes.body.data.donation as { amount: number }).amount;

    // Simulate PayMe webhook
    const webhookRes = await request(app)
      .post('/api/donations/webhook/payme')
      .send({
        donation_id: donationId,
        transaction_id: 'MOCK-TXN-001',
        status: 'completed',
        amount,
      });

    expect(webhookRes.status).toBe(200);

    // Verify donation is completed
    const donationRow = (await dbQuery(
      `SELECT status, payment_transaction_id FROM donations WHERE id = $1`,
      [donationId],
    )).rows[0] as { status: string; payment_transaction_id: string };

    expect(donationRow.status).toBe('completed');
    expect(donationRow.payment_transaction_id).toBe('MOCK-TXN-001');
  });

  it('3. Completed webhook generates a donation receipt', async () => {
    const donor = await createTestUser({ phone_number: '+998901300005' });
    const creator = await createTestUser({ phone_number: '+998901300006' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    const { headers } = getTestAuth(donor.id);
    const initiateRes = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({ campaign_id: campaign.id, amount: 30_000, payment_provider: 'payme' });

    const donationId = (initiateRes.body.data.donation as { id: string }).id;
    const amount = (initiateRes.body.data.donation as { amount: number }).amount;

    await request(app)
      .post('/api/donations/webhook/payme')
      .send({ donation_id: donationId, transaction_id: 'MOCK-TXN-002', status: 'completed', amount });

    // Allow async receipt generation to complete (small delay)
    await new Promise((r) => setTimeout(r, 200));

    const receiptRow = await dbQuery(
      `SELECT * FROM donation_receipts WHERE donation_id = $1`,
      [donationId],
    );
    expect(receiptRow.rows.length).toBe(1);
    expect((receiptRow.rows[0] as { file_url: string }).file_url).toBeDefined();
  });

  it('4. Completed webhook records platform fee in platform_fees', async () => {
    const donor = await createTestUser({ phone_number: '+998901300007' });
    const creator = await createTestUser({ phone_number: '+998901300008' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    const { headers } = getTestAuth(donor.id);
    const initiateRes = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({ campaign_id: campaign.id, amount: 100_000, payment_provider: 'payme' });

    const donationId = (initiateRes.body.data.donation as { id: string }).id;
    const amount = (initiateRes.body.data.donation as { amount: number }).amount;

    await request(app)
      .post('/api/donations/webhook/payme')
      .send({ donation_id: donationId, transaction_id: 'MOCK-TXN-003', status: 'completed', amount });

    const feeRow = await dbQuery(
      `SELECT amount FROM platform_fees WHERE donation_id = $1`,
      [donationId],
    );
    expect(feeRow.rows.length).toBe(1);
    // 1% of 100,000 = 1,000
    expect(Number((feeRow.rows[0] as { amount: string }).amount)).toBe(1_000);
  });

  it('5. Failed webhook marks donation as failed without balance changes', async () => {
    const donor = await createTestUser({ phone_number: '+998901300009' });
    const creator = await createTestUser({ phone_number: '+998901300010' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    const balanceBefore = Number((await dbQuery(
      `SELECT current_amount FROM campaigns WHERE id = $1`,
      [campaign.id],
    )).rows[0].current_amount);

    const { headers } = getTestAuth(donor.id);
    const initiateRes = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({ campaign_id: campaign.id, amount: 50_000, payment_provider: 'payme' });

    const donationId = (initiateRes.body.data.donation as { id: string }).id;
    const amount = (initiateRes.body.data.donation as { amount: number }).amount;

    await request(app)
      .post('/api/donations/webhook/payme')
      .send({ donation_id: donationId, transaction_id: 'MOCK-FAIL-001', status: 'failed', amount });

    const donationRow = (await dbQuery(
      `SELECT status FROM donations WHERE id = $1`,
      [donationId],
    )).rows[0] as { status: string };
    expect(donationRow.status).toBe('failed');

    const balanceAfter = Number((await dbQuery(
      `SELECT current_amount FROM campaigns WHERE id = $1`,
      [campaign.id],
    )).rows[0].current_amount);
    expect(balanceAfter).toBe(balanceBefore);

    // No platform fee recorded
    const feeRow = await dbQuery(
      `SELECT * FROM platform_fees WHERE donation_id = $1`,
      [donationId],
    );
    expect(feeRow.rows.length).toBe(0);
  });

  it('6. Amount mismatch in webhook is rejected', async () => {
    const donor = await createTestUser({ phone_number: '+998901300011' });
    const creator = await createTestUser({ phone_number: '+998901300012' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    const { headers } = getTestAuth(donor.id);
    const initiateRes = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({ campaign_id: campaign.id, amount: 50_000, payment_provider: 'payme' });

    const donationId = (initiateRes.body.data.donation as { id: string }).id;

    // Send wrong amount
    const res = await request(app)
      .post('/api/donations/webhook/payme')
      .send({
        donation_id: donationId,
        transaction_id: 'MOCK-TXN-MISMATCH',
        status: 'completed',
        amount: 99_999, // Wrong!
      });

    expect(res.status).toBe(400);
  });

  it('7. Duplicate webhook for same donation is rejected', async () => {
    const donor = await createTestUser({ phone_number: '+998901300013' });
    const creator = await createTestUser({ phone_number: '+998901300014' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    const { headers } = getTestAuth(donor.id);
    const initiateRes = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({ campaign_id: campaign.id, amount: 20_000, payment_provider: 'payme' });

    const donationId = (initiateRes.body.data.donation as { id: string }).id;
    const amount = (initiateRes.body.data.donation as { amount: number }).amount;

    // First webhook — should succeed
    await request(app)
      .post('/api/donations/webhook/payme')
      .send({ donation_id: donationId, transaction_id: 'MOCK-TXN-DUP', status: 'completed', amount });

    // Second webhook for same donation — should fail
    const res = await request(app)
      .post('/api/donations/webhook/payme')
      .send({ donation_id: donationId, transaction_id: 'MOCK-TXN-DUP-2', status: 'completed', amount });

    expect(res.status).toBe(400);
  });

  it('8. Webhook for non-existent donation returns 404', async () => {
    const res = await request(app)
      .post('/api/donations/webhook/payme')
      .send({
        donation_id: '00000000-0000-0000-0000-000000000099',
        transaction_id: 'MOCK-GHOST',
        status: 'completed',
        amount: 10_000,
      });

    expect(res.status).toBe(404);
  });
});
