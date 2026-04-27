/**
 * Database helpers for tests.
 * Provides table cleanup and test data seeding utilities.
 */
import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;

const TEST_DATABASE_URL = 'postgresql://sahovat:sahovat@localhost:5433/sahovat_test';

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({ connectionString: TEST_DATABASE_URL });
  }
  return pool;
}

/**
 * Truncates all application tables in dependency order.
 * Call this in beforeEach to ensure a clean state.
 */
export async function cleanDatabase(): Promise<void> {
  const db = getPool();
  await db.query(`
    TRUNCATE TABLE
      donation_receipts,
      platform_fees,
      admin_actions,
      user_category_scores,
      user_events,
      recurring_donations,
      withdrawals,
      withdrawal_accounts,
      click_transactions,
      donations,
      campaign_documents,
      campaigns,
      admin_settings,
      users
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Closes the test DB pool. Call in afterAll.
 */
export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Direct query to test DB (bypasses app pool).
 */
export async function dbQuery(text: string, params?: unknown[]): Promise<pg.QueryResult> {
  return getPool().query(text, params);
}

// ============================================================
// SEED HELPERS
// ============================================================

export interface TestUser {
  id: string;
  phone_number: string;
  display_name: string | null;
  is_admin: boolean;
  is_verified: boolean;
  verification_status: string;
}

export interface TestCampaign {
  id: string;
  creator_id: string;
  title: string;
  status: string;
  goal_amount: number;
  current_amount: number;
  category: string;
}

export interface TestDonation {
  id: string;
  campaign_id: string;
  donor_id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
}

/**
 * Creates a test user. Returns the user row.
 */
export async function createTestUser(overrides: {
  phone_number?: string;
  display_name?: string;
  is_admin?: boolean;
  is_verified?: boolean;
  verification_status?: string;
  password?: string;
} = {}): Promise<TestUser> {
  const db = getPool();
  const phone = overrides.phone_number ?? `+998${Date.now().toString().slice(-9)}`;
  const displayName = overrides.display_name ?? 'Test User';
  const isAdmin = overrides.is_admin ?? false;
  const isVerified = overrides.is_verified ?? false;
  const verificationStatus = overrides.verification_status ?? 'none';

  let passwordHash: string | null = null;
  if (overrides.password) {
    passwordHash = await bcrypt.hash(overrides.password, 10);
  } else if (isAdmin) {
    passwordHash = await bcrypt.hash('admin123', 10);
  }

  const result = await db.query(
    `INSERT INTO users (phone_number, display_name, is_admin, is_verified, verification_status, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, phone_number, display_name, is_admin, is_verified, verification_status`,
    [phone, displayName, isAdmin, isVerified, verificationStatus, passwordHash],
  );

  return result.rows[0] as TestUser;
}

/**
 * Creates an admin user with a known password.
 */
export async function createTestAdmin(overrides: {
  phone_number?: string;
  password?: string;
} = {}): Promise<TestUser & { password: string }> {
  const password = overrides.password ?? 'admin123';
  const user = await createTestUser({
    phone_number: overrides.phone_number ?? '+998900000001',
    display_name: 'Test Admin',
    is_admin: true,
    is_verified: true,
    verification_status: 'approved',
    password,
  });
  return { ...user, password };
}

/**
 * Creates an active test campaign.
 */
export async function createTestCampaign(
  creatorId: string,
  overrides: {
    title?: string;
    status?: string;
    goal_amount?: number;
    category?: string;
    region?: string;
  } = {},
): Promise<TestCampaign> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, status, region)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, creator_id, title, status, goal_amount, current_amount, category`,
    [
      creatorId,
      overrides.title ?? 'Test Campaign',
      'Test campaign description for testing purposes.',
      overrides.category ?? 'medical',
      overrides.goal_amount ?? 1_000_000,
      overrides.status ?? 'active',
      overrides.region ?? 'tashkent',
    ],
  );
  return result.rows[0] as TestCampaign;
}

/**
 * Creates a completed test donation.
 */
export async function createTestDonation(
  campaignId: string,
  donorId: string,
  overrides: {
    amount?: number;
    status?: string;
    is_anonymous?: boolean;
  } = {},
): Promise<TestDonation> {
  const db = getPool();
  const amount = overrides.amount ?? 50_000;
  const platformFee = Math.round(amount * 0.01);
  const netAmount = amount - platformFee;
  const status = overrides.status ?? 'completed';

  const result = await db.query(
    `INSERT INTO donations (campaign_id, donor_id, amount, platform_fee, net_amount, status, is_anonymous, payment_provider)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'payme')
     RETURNING id, campaign_id, donor_id, amount, platform_fee, net_amount, status`,
    [campaignId, donorId, amount, platformFee, netAmount, status, overrides.is_anonymous ?? false],
  );

  // Update campaign current_amount if completed
  if (status === 'completed') {
    await db.query(
      `UPDATE campaigns SET current_amount = current_amount + $1 WHERE id = $2`,
      [netAmount, campaignId],
    );
    // Record platform fee
    await db.query(
      `INSERT INTO platform_fees (donation_id, fee_type, amount) VALUES ($1, 'donation', $2)`,
      [result.rows[0].id, platformFee],
    );
  }

  const row = result.rows[0] as TestDonation;
  // Cast BigInt postgres fields back to JS numbers
  return {
    ...row,
    amount: Number(row.amount),
    platform_fee: Number(row.platform_fee),
    net_amount: Number(row.net_amount),
  };
}

/**
 * Creates a withdrawal account for a user.
 */
export async function createTestWithdrawalAccount(
  userId: string,
  overrides: {
    provider?: string;
    account_holder_name?: string;
    is_primary?: boolean;
  } = {},
): Promise<{ id: string; user_id: string; provider: string; account_holder_name: string; card_number_masked: string }> {
  const db = getPool();
  // Generate a properly encrypted card number using the test encryption key
  const { encrypt } = await import('../../src/lib/encryption.js');
  const encrypted = encrypt('8600123456781234');
  const masked = '8600 **** **** 1234';
  const result = await db.query(
    `INSERT INTO withdrawal_accounts (user_id, provider, account_number_encrypted, account_holder_name, is_primary)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, provider, account_holder_name`,
    [
      userId,
      overrides.provider ?? 'payme',
      encrypted,
      overrides.account_holder_name ?? 'Test User',
      overrides.is_primary ?? true,
    ],
  );
  return { ...result.rows[0], card_number_masked: masked };
}

/**
 * Inserts an admin_settings row.
 */
export async function seedAdminSettings(adminId: string): Promise<void> {
  const db = getPool();
  const { encrypt } = await import('../../src/lib/encryption.js');
  const encrypted = encrypt('4111111111111111');
  await db.query(
    `INSERT INTO admin_settings (master_card_number_encrypted, master_card_holder_name, platform_fee_percentage, updated_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [encrypted, 'Admin Holder', 1.00, adminId],
  );
}
