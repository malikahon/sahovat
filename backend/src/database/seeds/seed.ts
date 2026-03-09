import bcrypt from 'bcrypt';
import { pool } from '../../config/database.js';
import { encrypt } from '../../lib/encryption.js';

const log = (message: string) => console.log(`[Seed] ${message}`);

async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // --------------------------------------------------------
    // 1. Clear existing data (reverse dependency order)
    // --------------------------------------------------------
    log('Truncating existing data...');
    await client.query(`
      TRUNCATE TABLE
        donation_receipts,
        recurring_donations,
        user_events,
        user_category_scores,
        admin_actions,
        admin_settings,
        platform_fees,
        withdrawals,
        withdrawal_accounts,
        donations,
        campaign_documents,
        campaigns,
        users
      CASCADE
    `);

    // --------------------------------------------------------
    // 2. Admin user
    // --------------------------------------------------------
    log('Creating admin user...');
    const adminPasswordHash = await bcrypt.hash('admin123456', 12);

    const adminResult = await client.query(
      `INSERT INTO users (phone_number, display_name, password_hash, is_verified, is_admin, verification_status, language_preference)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      ['+998901234567', 'Admin', adminPasswordHash, true, true, 'approved', 'uz'],
    );
    const adminId: string = adminResult.rows[0].id;
    log(`  Admin created: ${adminId}`);

    // --------------------------------------------------------
    // 3. Test regular users
    // --------------------------------------------------------
    log('Creating test users...');

    const userPasswordHash = await bcrypt.hash('password123', 12);

    const user1Result = await client.query(
      `INSERT INTO users (phone_number, display_name, password_hash, date_of_birth, gender, preferred_categories, is_verified, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        '+998901111111',
        'Aziz Karimov',
        userPasswordHash,
        '1995-03-15',
        'male',
        '{medical,education}',
        true,
        'approved',
      ],
    );
    const user1Id: string = user1Result.rows[0].id;
    log(`  User 1 (Aziz Karimov) created: ${user1Id}`);

    const user2Result = await client.query(
      `INSERT INTO users (phone_number, display_name, password_hash, date_of_birth, gender, preferred_categories, is_verified, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        '+998902222222',
        'Dilnoza Rahimova',
        userPasswordHash,
        '1998-07-22',
        'female',
        '{community,emergency}',
        true,
        'approved',
      ],
    );
    const user2Id: string = user2Result.rows[0].id;
    log(`  User 2 (Dilnoza Rahimova) created: ${user2Id}`);

    const user3Result = await client.query(
      `INSERT INTO users (phone_number, display_name, password_hash, date_of_birth, gender, preferred_categories, is_verified, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        '+998903333333',
        'Bobur Aliyev',
        userPasswordHash,
        '2000-11-08',
        'male',
        '{creative,business}',
        false,
        'none',
      ],
    );
    const user3Id: string = user3Result.rows[0].id;
    log(`  User 3 (Bobur Aliyev) created: ${user3Id}`);

    // --------------------------------------------------------
    // 4. Sample campaigns
    // --------------------------------------------------------
    log('Creating campaigns...');

    const campaign1Result = await client.query(
      `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, current_amount, status, region, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        user1Id,
        'Bolalar shifoxonasiga yordam',
        "Toshkent shahridagi bolalar shifoxonasiga zamonaviy tibbiy uskunalar sotib olish uchun mablag' yig'moqdamiz.",
        'medical',
        50000000,
        12500000,
        'active',
        'tashkent',
        true,
      ],
    );
    const campaign1Id: string = campaign1Result.rows[0].id;
    log(`  Campaign 1 (medical) created: ${campaign1Id}`);

    const campaign2Result = await client.query(
      `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, current_amount, status, region, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        user1Id,
        'Qishloq maktabiga kitoblar',
        "Farg'ona viloyatidagi qishloq maktabi kutubxonasini yangi kitoblar bilan to'ldirish.",
        'education',
        15000000,
        3000000,
        'active',
        'fergana',
        true,
      ],
    );
    const campaign2Id: string = campaign2Result.rows[0].id;
    log(`  Campaign 2 (education) created: ${campaign2Id}`);

    const campaign3Result = await client.query(
      `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, current_amount, status, region, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        user2Id,
        "Sel ofatidan zarar ko'rgan oilalarga yordam",
        "Surxondaryo viloyatida sel ofatidan zarar ko'rgan oilalarga oziq-ovqat va kiyim-kechak yetkazish.",
        'emergency',
        100000000,
        45000000,
        'active',
        'surkhandarya',
        true,
      ],
    );
    const campaign3Id: string = campaign3Result.rows[0].id;
    log(`  Campaign 3 (emergency) created: ${campaign3Id}`);

    const campaign4Result = await client.query(
      `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, current_amount, status, region, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        user2Id,
        "Yosh rassom ko'rgazmasi",
        "Yosh rassomlar uchun birinchi ko'rgazma tashkil etish.",
        'creative',
        8000000,
        0,
        'draft',
        'tashkent',
        false,
      ],
    );
    const campaign4Id: string = campaign4Result.rows[0].id;
    log(`  Campaign 4 (creative, draft) created: ${campaign4Id}`);

    // --------------------------------------------------------
    // 5. Sample donations
    // --------------------------------------------------------
    log('Creating donations...');

    const donation1Result = await client.query(
      `INSERT INTO donations (campaign_id, donor_id, amount, platform_fee, net_amount, payment_provider, status, is_anonymous, donor_display_name, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id`,
      [
        campaign1Id,
        user2Id,
        5000000,
        50000,
        4950000,
        'payme',
        'completed',
        false,
        'Dilnoza Rahimova',
      ],
    );
    const donation1Id: string = donation1Result.rows[0].id;
    log(`  Donation 1 (User 2 -> Campaign 1) created: ${donation1Id}`);

    const donation2Result = await client.query(
      `INSERT INTO donations (campaign_id, donor_id, amount, platform_fee, net_amount, payment_provider, status, is_anonymous, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [campaign1Id, user3Id, 7500000, 75000, 7425000, 'payme', 'completed', true],
    );
    const donation2Id: string = donation2Result.rows[0].id;
    log(`  Donation 2 (User 3 -> Campaign 1, anonymous) created: ${donation2Id}`);

    const donation3Result = await client.query(
      `INSERT INTO donations (campaign_id, donor_id, amount, platform_fee, net_amount, payment_provider, status, is_anonymous, donor_display_name, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id`,
      [
        campaign3Id,
        user1Id,
        3000000,
        30000,
        2970000,
        'payme',
        'completed',
        false,
        'Aziz Karimov',
      ],
    );
    const donation3Id: string = donation3Result.rows[0].id;
    log(`  Donation 3 (User 1 -> Campaign 3) created: ${donation3Id}`);

    // --------------------------------------------------------
    // 6. Platform fees (matching donations)
    // --------------------------------------------------------
    log('Creating platform fee records...');

    await client.query(
      `INSERT INTO platform_fees (donation_id, fee_type, amount) VALUES ($1, $2, $3)`,
      [donation1Id, 'donation', 50000],
    );
    await client.query(
      `INSERT INTO platform_fees (donation_id, fee_type, amount) VALUES ($1, $2, $3)`,
      [donation2Id, 'donation', 75000],
    );
    await client.query(
      `INSERT INTO platform_fees (donation_id, fee_type, amount) VALUES ($1, $2, $3)`,
      [donation3Id, 'donation', 30000],
    );
    log('  3 platform fee records created');

    // --------------------------------------------------------
    // 7. Admin settings
    // --------------------------------------------------------
    log('Creating admin settings...');

    const encryptedCardNumber = encrypt('8600123456789012');
    await client.query(
      `INSERT INTO admin_settings (master_card_number_encrypted, master_card_holder_name, platform_fee_percentage, updated_by)
       VALUES ($1, $2, $3, $4)`,
      [encryptedCardNumber, 'SAHOVAT ADMIN', 1.0, adminId],
    );
    log('  Admin settings created');

    // --------------------------------------------------------
    // 8. User category scores
    // --------------------------------------------------------
    log('Creating user category scores...');

    await client.query(
      `INSERT INTO user_category_scores (user_id, category, score, last_interaction_at) VALUES ($1, $2, $3, NOW())`,
      [user1Id, 'medical', 5.0],
    );
    await client.query(
      `INSERT INTO user_category_scores (user_id, category, score, last_interaction_at) VALUES ($1, $2, $3, NOW())`,
      [user1Id, 'education', 3.0],
    );
    await client.query(
      `INSERT INTO user_category_scores (user_id, category, score, last_interaction_at) VALUES ($1, $2, $3, NOW())`,
      [user2Id, 'emergency', 4.0],
    );
    await client.query(
      `INSERT INTO user_category_scores (user_id, category, score, last_interaction_at) VALUES ($1, $2, $3, NOW())`,
      [user2Id, 'community', 2.5],
    );
    await client.query(
      `INSERT INTO user_category_scores (user_id, category, score, last_interaction_at) VALUES ($1, $2, $3, NOW())`,
      [user2Id, 'medical', 1.0],
    );
    log('  5 user category scores created');

    // --------------------------------------------------------
    // 9. Sample user events
    // --------------------------------------------------------
    log('Creating user events...');

    const sessionId1 = 'seed-session-001';
    const sessionId2 = 'seed-session-002';

    await client.query(
      `INSERT INTO user_events (user_id, session_id, event_type, campaign_id, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [user1Id, sessionId1, 'campaign_viewed', campaign3Id, JSON.stringify({ source: 'feed' })],
    );
    await client.query(
      `INSERT INTO user_events (user_id, session_id, event_type, campaign_id, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [user2Id, sessionId2, 'campaign_viewed', campaign1Id, JSON.stringify({ source: 'feed' })],
    );
    await client.query(
      `INSERT INTO user_events (user_id, session_id, event_type, campaign_id, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [
        user2Id,
        sessionId2,
        'campaign_viewed',
        campaign2Id,
        JSON.stringify({ source: 'search' }),
      ],
    );
    await client.query(
      `INSERT INTO user_events (user_id, session_id, event_type, campaign_id, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [
        user2Id,
        sessionId2,
        'donation_completed',
        campaign1Id,
        JSON.stringify({ amount: 5000000, payment_provider: 'payme' }),
      ],
    );
    log('  4 user events created');

    // --------------------------------------------------------
    // Commit transaction
    // --------------------------------------------------------
    await client.query('COMMIT');

    // --------------------------------------------------------
    // Summary
    // --------------------------------------------------------
    log('----------------------------------------');
    log('Seed completed successfully!');
    log('  Users:           4 (1 admin + 3 regular)');
    log('  Campaigns:       4');
    log('  Donations:       3');
    log('  Platform fees:   3');
    log('  Category scores: 5');
    log('  User events:     4');
    log('  Admin settings:  1');
    log('----------------------------------------');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Seed] Error during seeding:', error);
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[Seed] Seed failed:', error);
    await pool.end();
    process.exit(1);
  });
