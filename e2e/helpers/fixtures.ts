/**
 * E2E test fixtures.
 * Creates seed data for E2E tests via direct API calls.
 */
import pg from 'pg';
import bcrypt from 'bcrypt';

const TEST_DB_URL = 'postgresql://sahovat:sahovat@localhost:5433/sahovat_test';

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: TEST_DB_URL });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Creates the E2E test admin user if it doesn't exist.
 */
export async function ensureAdminUser(): Promise<{
  phone: string;
  password: string;
}> {
  const db = getPool();
  const phone = '+998900000001';
  const password = 'Admin123!';
  const passwordHash = await bcrypt.hash(password, 10);

  await db.query(`
    INSERT INTO users (phone_number, display_name, is_admin, is_verified, verification_status, password_hash)
    VALUES ($1, 'E2E Admin', TRUE, TRUE, 'approved', $2)
    ON CONFLICT (phone_number) DO UPDATE
      SET is_admin = TRUE,
          password_hash = $2,
          is_verified = TRUE,
          verification_status = 'approved'
  `, [phone, passwordHash]);

  return { phone, password };
}

/**
 * Creates a test campaign that is active (for donor flow tests).
 */
export async function ensureActiveCampaign(): Promise<{
  id: string;
  title: string;
  creatorPhone: string;
}> {
  const db = getPool();
  const creatorPhone = '+998900000002';

  // Ensure creator user exists
  let creatorResult = await db.query(
    'SELECT id FROM users WHERE phone_number = $1',
    [creatorPhone],
  );

  if (creatorResult.rows.length === 0) {
    creatorResult = await db.query(
      `INSERT INTO users (phone_number, display_name, is_verified, verification_status)
       VALUES ($1, 'E2E Campaign Creator', TRUE, 'approved')
       RETURNING id`,
      [creatorPhone],
    );
  }

  const creatorId = (creatorResult.rows[0] as { id: string }).id;

  // Check if an active campaign already exists
  const existing = await db.query(
    `SELECT id, title FROM campaigns WHERE creator_id = $1 AND status = 'active' LIMIT 1`,
    [creatorId],
  );

  if (existing.rows.length > 0) {
    return {
      id: (existing.rows[0] as { id: string }).id,
      title: (existing.rows[0] as { title: string }).title,
      creatorPhone,
    };
  }

  // Create the campaign
  const title = 'E2E Test Medical Campaign';
  const result = await db.query(
    `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, status, region)
     VALUES ($1, $2, $3, 'medical', 1000000, 'active', 'tashkent')
     RETURNING id`,
    [creatorId, title, 'A test campaign for end-to-end testing of the donation flow.'],
  );

  return {
    id: (result.rows[0] as { id: string }).id,
    title,
    creatorPhone,
  };
}

/**
 * Creates a pending campaign for admin review tests.
 */
export async function ensurePendingCampaign(): Promise<{
  id: string;
  title: string;
  organizerPhone: string;
}> {
  const db = getPool();
  const organizerPhone = '+998900000003';

  // Ensure organizer exists
  let organizerResult = await db.query(
    'SELECT id FROM users WHERE phone_number = $1',
    [organizerPhone],
  );

  if (organizerResult.rows.length === 0) {
    organizerResult = await db.query(
      `INSERT INTO users (phone_number, display_name, is_verified, verification_status)
       VALUES ($1, 'E2E Organizer', TRUE, 'approved')
       RETURNING id`,
      [organizerPhone],
    );
  }

  const organizerId = (organizerResult.rows[0] as { id: string }).id;

  // Check if pending campaign exists
  const existing = await db.query(
    `SELECT id, title FROM campaigns WHERE creator_id = $1 AND status = 'pending_review' LIMIT 1`,
    [organizerId],
  );

  if (existing.rows.length > 0) {
    return {
      id: (existing.rows[0] as { id: string }).id,
      title: (existing.rows[0] as { title: string }).title,
      organizerPhone,
    };
  }

  const title = 'E2E Pending Campaign For Admin Review';
  const result = await db.query(
    `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, status, region)
     VALUES ($1, $2, $3, 'education', 500000, 'pending_review', 'samarkand')
     RETURNING id`,
    [organizerId, title, 'A pending campaign that needs admin verification.'],
  );

  return {
    id: (result.rows[0] as { id: string }).id,
    title,
    organizerPhone,
  };
}

/**
 * Creates a pending withdrawal for admin approval tests.
 */
export async function ensurePendingWithdrawal(): Promise<{
  id: string;
  campaignId: string;
  organizerPhone: string;
}> {
  const db = getPool();

  // Reuse the organizer from ensurePendingCampaign
  const organizerPhone = '+998900000003';

  const organizerResult = await db.query(
    'SELECT id FROM users WHERE phone_number = $1',
    [organizerPhone],
  );

  if (organizerResult.rows.length === 0) {
    throw new Error('Organizer user not found — call ensurePendingCampaign first');
  }

  const organizerId = (organizerResult.rows[0] as { id: string }).id;

  // Ensure there's an active campaign with funds
  let campaignResult = await db.query(
    `SELECT id FROM campaigns WHERE creator_id = $1 AND status = 'active' LIMIT 1`,
    [organizerId],
  );

  if (campaignResult.rows.length === 0) {
    campaignResult = await db.query(
      `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, current_amount, status, region)
       VALUES ($1, 'E2E Withdrawal Test Campaign', 'Campaign with funds for withdrawal test', 'medical', 1000000, 500000, 'active', 'tashkent')
       RETURNING id`,
      [organizerId],
    );
  }

  const campaignId = (campaignResult.rows[0] as { id: string }).id;

  // Check existing pending withdrawal
  const existing = await db.query(
    `SELECT id FROM withdrawals WHERE organizer_id = $1 AND status = 'pending' LIMIT 1`,
    [organizerId],
  );

  if (existing.rows.length > 0) {
    return {
      id: (existing.rows[0] as { id: string }).id,
      campaignId,
      organizerPhone,
    };
  }

  // Create withdrawal account
  const accountResult = await db.query(
    `INSERT INTO withdrawal_accounts (user_id, provider, account_number_encrypted, account_holder_name, is_primary)
     VALUES ($1, 'payme', 'aabbcc:ddeeff:001122', 'E2E Organizer', TRUE)
     RETURNING id`,
    [organizerId],
  );

  const accountId = (accountResult.rows[0] as { id: string }).id;

  // Create pending withdrawal
  const withdrawalResult = await db.query(
    `INSERT INTO withdrawals (campaign_id, organizer_id, withdrawal_account_id, amount, platform_fee, net_amount, status, card_number_masked, cardholder_name)
     VALUES ($1, $2, $3, 200000, 2000, 198000, 'pending', '8600 **** **** 1234', 'E2E Organizer')
     RETURNING id`,
    [campaignId, organizerId, accountId],
  );

  return {
    id: (withdrawalResult.rows[0] as { id: string }).id,
    campaignId,
    organizerPhone,
  };
}
