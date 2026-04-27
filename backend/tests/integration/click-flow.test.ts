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

describe('Click payment flow', () => {
  it('1. Initiating a donation with payment_provider=click returns checkout_url pointing to /mock-click/', async () => {
    const donor = await createTestUser({ phone_number: '+998901400001' });
    const creator = await createTestUser({ phone_number: '+998901400002' });
    const campaign = await createTestCampaign(creator.id, { status: 'active', goal_amount: 1_000_000 });
    const { headers } = getTestAuth(donor.id);

    const res = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({
        campaign_id: campaign.id,
        amount: 100_000,
        payment_provider: 'click',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.checkout_url).toBeDefined();
    expect(res.body.data.donation.payment_provider).toBe('click');
    expect(res.body.data.checkout_url).toContain('/mock-click/');
  });

  it('2. Click webhook marks donation as completed', async () => {
    const donor = await createTestUser({ phone_number: '+998901400003' });
    const creator = await createTestUser({ phone_number: '+998901400004' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    const { headers } = getTestAuth(donor.id);
    const initiateRes = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({ campaign_id: campaign.id, amount: 50_000, payment_provider: 'click' });

    const donationId = (initiateRes.body.data.donation as { id: string }).id;
    const amount = (initiateRes.body.data.donation as { amount: number }).amount;

    const webhookRes = await request(app)
      .post('/api/donations/webhook/click')
      .send({
        donation_id: donationId,
        transaction_id: 'CLICK-TXN-001',
        status: 'completed',
        amount,
      });

    expect(webhookRes.status).toBe(200);

    const donationRow = (await dbQuery(
      `SELECT status, payment_transaction_id FROM donations WHERE id = $1`,
      [donationId],
    )).rows[0] as { status: string; payment_transaction_id: string };

    expect(donationRow.status).toBe('completed');
    expect(donationRow.payment_transaction_id).toBe('CLICK-TXN-001');
  });

  it('3. Duplicate webhook for same donation is handled idempotently', async () => {
    const donor = await createTestUser({ phone_number: '+998901400005' });
    const creator = await createTestUser({ phone_number: '+998901400006' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    const { headers } = getTestAuth(donor.id);
    const initiateRes = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({ campaign_id: campaign.id, amount: 20_000, payment_provider: 'click' });

    const donationId = (initiateRes.body.data.donation as { id: string }).id;
    const amount = (initiateRes.body.data.donation as { amount: number }).amount;

    const res1 = await request(app)
      .post('/api/donations/webhook/click')
      .send({
        donation_id: donationId,
        transaction_id: 'CLICK-TXN-DUP',
        status: 'completed',
        amount,
      });
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .post('/api/donations/webhook/click')
      .send({
        donation_id: donationId,
        transaction_id: 'CLICK-TXN-DUP',
        status: 'completed',
        amount,
      });
    expect(res2.status).toBe(200);

    const fees = (await dbQuery(
      `SELECT COUNT(*) as count FROM platform_fees WHERE donation_id = $1`,
      [donationId],
    )).rows[0] as { count: string };
    expect(Number(fees.count)).toBe(1);
  });

  it('4. Click webhook with wrong amount is rejected', async () => {
    const donor = await createTestUser({ phone_number: '+998901400007' });
    const creator = await createTestUser({ phone_number: '+998901400008' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    const { headers } = getTestAuth(donor.id);
    const initiateRes = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({ campaign_id: campaign.id, amount: 50_000, payment_provider: 'click' });

    const donationId = (initiateRes.body.data.donation as { id: string }).id;

    const webhookRes = await request(app)
      .post('/api/donations/webhook/click')
      .send({
        donation_id: donationId,
        transaction_id: 'CLICK-TXN-BAD-AMT',
        status: 'completed',
        amount: 999,
      });

    expect(webhookRes.status).toBe(400);
  });

  it('5. Click webhook for non-existent donation returns 404', async () => {
    const webhookRes = await request(app)
      .post('/api/donations/webhook/click')
      .send({
        donation_id: '00000000-0000-0000-0000-000000000099',
        transaction_id: 'CLICK-TXN-GHOST',
        status: 'completed',
        amount: 10000,
      });

    expect(webhookRes.status).toBe(404);
  });

  it('6. Click payment rejects saved_card_id validation', async () => {
    const donor = await createTestUser({ phone_number: '+998901400009' });
    const creator = await createTestUser({ phone_number: '+998901400010' });
    const campaign = await createTestCampaign(creator.id, { status: 'active', goal_amount: 1_000_000 });
    const { headers } = getTestAuth(donor.id);

    const res = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({
        campaign_id: campaign.id,
        amount: 10_000,
        payment_provider: 'click',
        fee_included: true,
        saved_card_id: '00000000-0000-0000-0000-000000000001',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('CLICK_NO_SAVED_CARDS');
  });

  it('7. Click prepare webhook creates click_transactions row', async () => {
    const donor = await createTestUser({ phone_number: '+998901400011' });
    const creator = await createTestUser({ phone_number: '+998901400012' });
    const campaign = await createTestCampaign(creator.id, { status: 'active' });

    const { headers } = getTestAuth(donor.id);
    const initiateRes = await request(app)
      .post('/api/donations/initiate')
      .set(headers)
      .send({ campaign_id: campaign.id, amount: 30_000, payment_provider: 'click' });

    const donationId = (initiateRes.body.data.donation as { id: string }).id;
    const donationAmount = (initiateRes.body.data.donation as { amount: number }).amount;

    const prepareRes = await request(app)
      .post('/api/click/prepare')
      .send({
        click_trans_id: 99999,
        service_id: 'mock_service',
        merchant_trans_id: donationId,
        amount: donationAmount,
        action: 0,
        sign_time: '2026-04-27 12:00:00',
        sign_string: 'irrelevant-in-mock-mode',
      });

    expect(prepareRes.status).toBe(200);
    expect(prepareRes.body.error).toBe(0);
    expect(prepareRes.body.merchant_prepare_id).toBeDefined();

    const row = (await dbQuery(
      `SELECT * FROM click_transactions WHERE donation_id = $1`,
      [donationId],
    )).rows[0];

    expect(row).toBeDefined();
    expect(row.click_trans_id).toBe('99999');
    expect(row.donation_id).toBe(donationId);
    expect(Number(row.amount)).toBe(donationAmount);
  });
});