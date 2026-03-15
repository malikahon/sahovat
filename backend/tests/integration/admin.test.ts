import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import {
  cleanDatabase,
  createTestUser,
  createTestCampaign,
  createTestAdmin,
  seedAdminSettings,
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

describe('GET /api/admin/stats', () => {
  it('returns dashboard stats for admin', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901260001' });
    const { headers } = getTestAuth(admin.id, true);

    const res = await request(app).get('/api/admin/stats').set(headers);

    expect(res.status).toBe(200);
    // Stats are returned directly in data
    expect(res.body.data).toBeDefined();
    expect(res.body.success).toBe(true);
    // At minimum should have some numeric stats
    const data = res.body.data as Record<string, unknown>;
    expect(data).toHaveProperty('total_users');
    expect(data).toHaveProperty('active_campaigns');
  });

  it('returns 403 for non-admin', async () => {
    const user = await createTestUser({ phone_number: '+998901260002' });
    const { headers } = getTestAuth(user.id);

    const res = await request(app).get('/api/admin/stats').set(headers);
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });
});

describe('Admin campaign verification', () => {
  it('admin can verify a pending campaign', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901260003' });
    const creator = await createTestUser({ phone_number: '+998901260004' });
    const campaign = await createTestCampaign(creator.id, { status: 'pending_review' });
    const { headers } = getTestAuth(admin.id, true);

    // API uses { verified: boolean } not { action: 'verify'|'reject' }
    const res = await request(app)
      .patch(`/api/admin/campaigns/${campaign.id}/verify`)
      .set(headers)
      .send({ verified: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('admin can reject a pending campaign with reason', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901260005' });
    const creator = await createTestUser({ phone_number: '+998901260006' });
    const campaign = await createTestCampaign(creator.id, { status: 'pending_review' });
    const { headers } = getTestAuth(admin.id, true);

    const res = await request(app)
      .patch(`/api/admin/campaigns/${campaign.id}/verify`)
      .set(headers)
      .send({ verified: false, admin_notes: 'Missing documentation' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('admin action is logged in audit trail', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901260007' });
    const creator = await createTestUser({ phone_number: '+998901260008' });
    const campaign = await createTestCampaign(creator.id, { status: 'pending_review' });
    const { headers } = getTestAuth(admin.id, true);

    await request(app)
      .patch(`/api/admin/campaigns/${campaign.id}/verify`)
      .set(headers)
      .send({ verified: true });

    const auditResult = await dbQuery(
      `SELECT * FROM admin_actions WHERE admin_id = $1 AND target_id = $2`,
      [admin.id, campaign.id],
    );
    expect(auditResult.rows.length).toBeGreaterThan(0);
    expect((auditResult.rows[0] as { action_type: string }).action_type).toContain('campaign');
  });
});

describe('Admin user management', () => {
  it('admin can list users', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901260009' });
    const { headers } = getTestAuth(admin.id, true);

    const res = await request(app).get('/api/admin/users').set(headers);

    expect(res.status).toBe(200);
    // listUsers returns { success: true, users: [...], pagination: {...} }
    expect(res.body.success).toBe(true);
    // Users are in res.body.users
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it('admin can ban a user', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901260010' });
    const user = await createTestUser({ phone_number: '+998901260011' });
    const { headers } = getTestAuth(admin.id, true);

    const res = await request(app)
      .patch(`/api/admin/users/${user.id}/ban`)
      .set(headers)
      .send({ is_banned: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('banned');
  });
});

describe('Admin settings', () => {
  it('admin can view settings', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901260012' });
    await seedAdminSettings(admin.id);
    const { headers } = getTestAuth(admin.id, true);

    const res = await request(app).get('/api/admin/settings').set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.platform_fee_percentage).toBeDefined();
  });

  it('admin can update platform fee percentage', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901260013' });
    await seedAdminSettings(admin.id);
    const { headers } = getTestAuth(admin.id, true);

    const res = await request(app)
      .patch('/api/admin/settings')
      .set(headers)
      .send({ platform_fee_percentage: 2 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/admin/audit-log', () => {
  it('returns audit log entries for admin', async () => {
    const admin = await createTestAdmin({ phone_number: '+998901260014' });
    const creator = await createTestUser({ phone_number: '+998901260015' });
    const campaign = await createTestCampaign(creator.id, { status: 'pending_review' });
    const { headers } = getTestAuth(admin.id, true);

    // Create an action to see in log (ban a user)
    await request(app)
      .patch(`/api/admin/users/${creator.id}/ban`)
      .set(headers)
      .send({ is_banned: true });

    const res = await request(app).get('/api/admin/audit-log').set(headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Audit log returns { success: true, actions: [...], pagination: {...} }
    expect(Array.isArray(res.body.actions)).toBe(true);
    // There should be at least the ban action we just created
    expect((res.body.actions as unknown[]).length).toBeGreaterThan(0);
  });
});
