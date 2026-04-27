/**
 * Demo persona seed — used for demo rehearsals and demo day itself.
 *
 * Distinct from `seed.ts` (the generic dev seed). This file builds a
 * curated database tied to the presenter's REAL phone, Telegram, and
 * email identities so all 3 notification channels deliver to a real
 * device during a live demo.
 *
 * Inputs:
 *   - `.env.demo` at repo root (gitignored). Must contain:
 *     - TELEGRAM_DEMO_DONOR_ID  (numeric chat_id, captured via /getUpdates)
 *     - TELEGRAM_DEMO_ORG_ID    (numeric chat_id)
 *     - EMAIL_DEMO_DONOR        (real inbox accessible during demo)
 *     - EMAIL_DEMO_ORG          (real inbox accessible during demo)
 *
 * What it builds:
 *   1. Truncates same tables seed.ts truncates, plus notification_preferences.
 *   2. Creates an admin user, a curated DONOR persona (real Telegram + email),
 *      and a curated ORGANIZER persona (real Telegram + email, also is_admin).
 *   3. Creates 5 filler users (no telegram, no email) for donation history.
 *   4. Inserts realistic Uzbek-language campaigns across categories,
 *      including one campaign at ~90% funded (urgency demo) and one
 *      fully-funded (success state).
 *   5. Backfills notification_preferences:
 *      - Default (sms+telegram on, email auto-on for verified-email users)
 *        for filler users.
 *      - Curated per-event overrides for the two real personas matching
 *        roadmap section 11.
 *
 * Safety:
 *   - Refuses to run against NODE_ENV=production unless --force is passed.
 *   - Wraps everything in a transaction.
 *
 * Usage:
 *   npm run db:seed:demo
 */

import bcrypt from 'bcrypt';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pool } from '../../config/database.js';
import { encrypt } from '../../lib/encryption.js';

const log = (message: string) => console.log(`[DemoSeed] ${message}`);

// ============================================================
// .env.demo loader
// ============================================================

interface DemoEnv {
  TELEGRAM_DEMO_DONOR_ID: string;
  TELEGRAM_DEMO_ORG_ID: string;
  EMAIL_DEMO_DONOR: string;
  EMAIL_DEMO_ORG: string;
}

function loadDemoEnv(): DemoEnv {
  // Repo root is two levels up from backend/src/database/seeds/.
  const candidates = [
    resolve(process.cwd(), '.env.demo'),
    resolve(process.cwd(), '../.env.demo'),
    resolve(import.meta.dirname ?? '.', '../../../../.env.demo'),
  ];

  let raw: string | null = null;
  let usedPath = '';
  for (const p of candidates) {
    try {
      raw = readFileSync(p, 'utf8');
      usedPath = p;
      break;
    } catch {
      // try next
    }
  }
  if (!raw) {
    throw new Error(
      `[DemoSeed] FATAL: .env.demo not found in any of: ${candidates.join(', ')}`,
    );
  }
  log(`Loaded .env.demo from ${usedPath}`);

  const parsed: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    parsed[key] = value;
  }

  const missing: string[] = [];
  const required: (keyof DemoEnv)[] = [
    'TELEGRAM_DEMO_DONOR_ID',
    'TELEGRAM_DEMO_ORG_ID',
    'EMAIL_DEMO_DONOR',
    'EMAIL_DEMO_ORG',
  ];
  for (const key of required) {
    if (!parsed[key]) missing.push(key);
  }
  if (missing.length) {
    throw new Error(
      `[DemoSeed] FATAL: .env.demo is missing required keys: ${missing.join(', ')}`,
    );
  }

  if (!/^\d+$/.test(parsed['TELEGRAM_DEMO_DONOR_ID']!)) {
    throw new Error(
      `[DemoSeed] FATAL: TELEGRAM_DEMO_DONOR_ID must be numeric chat_id, got "${parsed['TELEGRAM_DEMO_DONOR_ID']}"`,
    );
  }
  if (!/^\d+$/.test(parsed['TELEGRAM_DEMO_ORG_ID']!)) {
    throw new Error(
      `[DemoSeed] FATAL: TELEGRAM_DEMO_ORG_ID must be numeric chat_id, got "${parsed['TELEGRAM_DEMO_ORG_ID']}"`,
    );
  }

  return {
    TELEGRAM_DEMO_DONOR_ID: parsed['TELEGRAM_DEMO_DONOR_ID']!,
    TELEGRAM_DEMO_ORG_ID: parsed['TELEGRAM_DEMO_ORG_ID']!,
    EMAIL_DEMO_DONOR: parsed['EMAIL_DEMO_DONOR']!,
    EMAIL_DEMO_ORG: parsed['EMAIL_DEMO_ORG']!,
  };
}

// ============================================================
// Static demo data
// ============================================================

const COVER_IMAGES = {
  medical_1: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
  medical_2: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80',
  medical_3: 'https://images.unsplash.com/photo-1551190822-a9ce113d0d78?w=800&q=80',
  education_1: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80',
  education_2: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
  emergency_1: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80',
  emergency_2: 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=800&q=80',
  community_1: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80',
  community_2: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
  creative_1: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80',
} as const;

const FILLER_DONOR_NAMES = [
  'Aziz Karimov',
  'Dilnoza Rahimova',
  'Bobur Aliyev',
  'Rustam Qodirov',
  'Gulnora Isaeva',
];

const FILLER_PHONES = [
  '+998901111111',
  '+998902222222',
  '+998903333333',
  '+998904444444',
  '+998905555555',
];

const FILLER_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80',
];

interface DemoCampaign {
  creator: 'donor' | 'organizer' | number; // number = filler index 0..4
  title: string;
  description: string;
  category: string;
  goal: number;
  region: string;
  endDate: string;
  cover: string;
  status: 'active' | 'completed';
  /** Target funded percentage 0..100 — drives donation volume */
  targetFundedPct: number;
}

const CAMPAIGNS: DemoCampaign[] = [
  {
    creator: 'organizer',
    title: 'Bolalar shifoxonasiga zamonaviy tibbiy uskunalar',
    description:
      `Toshkent shahridagi bolalar shifoxonasiga zamonaviy tibbiy uskunalar sotib olish uchun mablag' yig'moqdamiz.\n\n` +
      `Hozirgi kunda shifoxonada eskirgan uskunalar tufayli ko'p bolalar kerakli davolashni olmaydilar. Yangi EKG apparatlari, ultratovush qurilmalari va jarrohlik asbob-uskunalari zarur.\n\n` +
      `Sizning yordamingiz bilan biz kam ta'minlangan oilalar bolalarini sog'aytirishimiz mumkin. Har bir summa muhim!`,
    category: 'medical',
    goal: 50_000_000,
    region: 'tashkent',
    endDate: '2026-06-30',
    cover: COVER_IMAGES.medical_1,
    status: 'active',
    targetFundedPct: 90, // Urgency demo card
  },
  {
    creator: 0,
    title: 'Qishloq maktabi kutubxonasini yangilash',
    description:
      `Farg'ona viloyatidagi qishloq maktabi kutubxonasini zamonaviy kitoblar bilan to'ldirish.\n\n` +
      `Bu maktabda 300 dan ortiq o'quvchi ta'lim oladi, ammo kutubxona 20 yildan buyon yangilanmagan.\n\n` +
      `500+ yangi kitob sotib olamiz, kompyuter va internet ulanishi o'rnatamiz.`,
    category: 'education',
    goal: 15_000_000,
    region: 'fergana',
    endDate: '2026-05-15',
    cover: COVER_IMAGES.education_1,
    status: 'completed',
    targetFundedPct: 100, // Fully-funded success card
  },
  {
    creator: 'organizer',
    title: 'Sel ofatidan zarar ko\'rgan oilalarga yordam',
    description:
      `Surxondaryo viloyatida kuchli sel oqibatida minglab oilalar uylarini yo'qotdi.\n\n` +
      `Oziq-ovqat paketlari, kiyim-poyabzal, dori-darmon va birlamchi tibbiy yordam taqdim etamiz.\n\n` +
      `Hozirgacha 45 oilaga yordam ko'rsatildi. Yana 100 oilaga yordam berish uchun mablag' kerak.`,
    category: 'emergency',
    goal: 100_000_000,
    region: 'surkhandarya',
    endDate: '2026-04-30',
    cover: COVER_IMAGES.emergency_1,
    status: 'active',
    targetFundedPct: 55,
  },
  {
    creator: 1,
    title: 'Yosh rassomlar uchun birinchi ko\'rgazma',
    description:
      `15 ta yosh rassom (18-25 yosh) uchun shaxsiy ko'rgazma tashkil etamiz.\n\n` +
      `Toshkent markazidagi galereyada o'tkaziladi. Har bir rassomga o'z asarlarini sotish imkoniyati beriladi.\n\n` +
      `Sizning yordamingiz bilan kelajakdagi buyuk rassomlar kashf etiladi!`,
    category: 'creative',
    goal: 8_000_000,
    region: 'tashkent',
    endDate: '2026-05-20',
    cover: COVER_IMAGES.creative_1,
    status: 'active',
    targetFundedPct: 35,
  },
  {
    creator: 'organizer',
    title: 'Karakalpakiston qishloqlariga toza ichimlik suvi',
    description:
      `Karakalpakiston — suv muammosi eng og'ir bo'lgan mintaqa. Minglab odamlar iflos suv ichadi.\n\n` +
      `5 ta qishloqqa toza ichimlik suvi tizimini o'rnatish, har bir qishloqda 200+ oila foydalanadi.\n\n` +
      `Toza suv — asosiy insoniyat huquqi.`,
    category: 'community',
    goal: 80_000_000,
    region: 'karakalpakstan',
    endDate: '2026-08-15',
    cover: COVER_IMAGES.community_1,
    status: 'active',
    targetFundedPct: 18,
  },
  {
    creator: 2,
    title: 'Bolalar shifoxonasi uchun jarrohlik uskunalari',
    description:
      `Samarqand viloyatidagi bolalar shifoxonasida zamonaviy jarrohlik uskunalari yo'q.\n\n` +
      `Neonatal jarrohlik asboblar, laringoskop, yurak monitorlari sotib olishni rejalashtirmoqdamiz.\n\n` +
      `Bu uskunalar yiliga 500+ bolaning hayotini saqlab qolish imkonini beradi.`,
    category: 'medical',
    goal: 120_000_000,
    region: 'samarkand',
    endDate: '2026-07-01',
    cover: COVER_IMAGES.medical_2,
    status: 'active',
    targetFundedPct: 60,
  },
  {
    creator: 3,
    title: 'Zilziladan zararlangan maktabni qayta qurish',
    description:
      `Jizzax viloyatida zilzila tufayli mahalliy maktab vayron bo'ldi. 400 dan ortiq o'quvchi vaqtinchalik binolarda o'qiydi.\n\n` +
      `Yangi 3 qavatli maktab binosi qurish, kompyuter xonasi, sport va o'yingohlar yaratamiz.`,
    category: 'emergency',
    goal: 200_000_000,
    region: 'jizzakh',
    endDate: '2026-09-30',
    cover: COVER_IMAGES.emergency_2,
    status: 'active',
    targetFundedPct: 22,
  },
  {
    creator: 4,
    title: 'Ayollar uchun bepul IT ta\'lim markazi',
    description:
      `Toshkentda ayollar va qizlar uchun bepul IT ta'lim markazi.\n\n` +
      `Dasturlash (Python, JavaScript), web dizayn, ma'lumotlar tahlili, raqamli marketing o'rgatiladi.\n\n` +
      `Bu markaz 1000+ ayolga bepul ta'lim beradi va ish topishga yordam qiladi.`,
    category: 'education',
    goal: 45_000_000,
    region: 'tashkent',
    endDate: '2026-06-15',
    cover: COVER_IMAGES.education_2,
    status: 'active',
    targetFundedPct: 12,
  },
  {
    creator: 'organizer',
    title: 'Yetimlar uyi uchun zamonaviy isitish tizimi',
    description:
      `Navoiy shahridagi yetimlar uyi eskirgan isitish tizimi tufayli qish kunlarida sovuqda yashaydi.\n\n` +
      `Yangi markaziy isitish tizimi va energiya tejash qurilmalari o'rnatiladi.\n\n` +
      `80+ bola iliq muhitda yashashi uchun yordam bering.`,
    category: 'community',
    goal: 60_000_000,
    region: 'navoi',
    endDate: '2026-04-15',
    cover: COVER_IMAGES.community_2,
    status: 'active',
    targetFundedPct: 70,
  },
  {
    creator: 0,
    title: 'Qishloqlar uchun mobil tibbiyot klinikasi',
    description:
      `Andijon viloyatining uzoq qishloqlarida shifokorlar kam.\n\n` +
      `Full jihozlangan medical bus, umumiy shifokor, pediatr, EKG, ultratovush, bepul dorilar.\n\n` +
      `Yiliga 10,000+ qishloq aholisiga xizmat ko'rsatadi.`,
    category: 'medical',
    goal: 90_000_000,
    region: 'andijan',
    endDate: '2026-08-31',
    cover: COVER_IMAGES.medical_3,
    status: 'active',
    targetFundedPct: 5, // Early-stage card
  },
];

// ============================================================
// Notification preference matrices (per roadmap §11)
// ============================================================

const ALL_EVENTS = [
  'donation_completed',
  'campaign_verified',
  'withdrawal_status_changed',
  'recurring_charge_succeeded',
  'recurring_charge_failed',
  'campaign_milestone_reached',
  'contact_message_received',
] as const;

type EventType = (typeof ALL_EVENTS)[number];
type Channel = 'sms' | 'telegram' | 'email';

const DONOR_PREFS: Record<EventType, Channel[]> = {
  donation_completed: ['telegram', 'email'],
  campaign_milestone_reached: ['telegram'],
  withdrawal_status_changed: ['email', 'sms'],
  recurring_charge_failed: ['email', 'telegram', 'sms'],
  recurring_charge_succeeded: ['email'],
  campaign_verified: ['telegram'],
  contact_message_received: [],
};

const ORG_PREFS: Record<EventType, Channel[]> = {
  campaign_verified: ['telegram', 'email'],
  withdrawal_status_changed: ['telegram', 'email'],
  donation_completed: ['telegram'],
  contact_message_received: ['email'],
  campaign_milestone_reached: ['telegram', 'email'],
  recurring_charge_succeeded: ['email'],
  recurring_charge_failed: ['email', 'sms'],
};

const AMOUNT_TIERS = [
  20_000, 50_000, 75_000, 100_000, 150_000, 200_000, 300_000,
  500_000, 750_000, 1_000_000, 1_500_000, 2_000_000,
] as const;

const DONATION_NOTES = [
  'Omad tilaymiz!',
  'Barchaga salomatlik tilayman',
  'Yaxshi ish qilayotganingiz uchun rahmat!',
  'Bola salomat bo\'lsin',
  'Yordam uchun tashakkur',
  'Siz bilan birgamiz',
  null,
  null,
  null,
];

// ============================================================
// Seed runner
// ============================================================

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('[DemoSeed] FATAL: refusing to run in production. Pass --force if you really mean it.');
    process.exit(1);
  }

  const demoEnv = loadDemoEnv();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    log('Truncating existing data...');
    // notification_preferences was added in migration 011 — include it.
    await client.query(`
      TRUNCATE TABLE
        notification_preferences,
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
        contact_messages,
        click_transactions,
        users
      CASCADE
    `);

    // ---------------------------------------------------------
    // 1. Admin user (only used for verification audit trail)
    // ---------------------------------------------------------
    log('Creating root admin user...');
    const adminPasswordHash = await bcrypt.hash('admin123456', 12);
    const adminResult = await client.query(
      `INSERT INTO users (phone_number, display_name, password_hash, is_verified, is_admin, verification_status, language_preference)
       VALUES ($1, $2, $3, true, true, 'approved', 'uz') RETURNING id`,
      ['+998901234567', 'Sahovat Admin', adminPasswordHash],
    );
    const adminId: string = adminResult.rows[0].id;

    // ---------------------------------------------------------
    // 2. Demo donor persona — REAL phone + Telegram + email
    //    phone +998947981800, telegram @malikahon_v, email from .env.demo
    // ---------------------------------------------------------
    log('Creating donor persona (Malika)...');
    const userPasswordHash = await bcrypt.hash('password123', 12);
    const donorResult = await client.query(
      `INSERT INTO users (
         phone_number, display_name, password_hash, language_preference,
         is_verified, verification_status,
         telegram_id, telegram_username, telegram_linked_at,
         email, email_verified_at,
         preferred_otp_channel,
         bio, avatar_url
       )
       VALUES ($1, $2, $3, 'uz', true, 'approved', $4, $5, NOW(), $6, NOW(), 'telegram', $7, $8)
       RETURNING id`,
      [
        '+998947981800',
        'Malika',
        userPasswordHash,
        demoEnv.TELEGRAM_DEMO_DONOR_ID,
        'malikahon_v',
        demoEnv.EMAIL_DEMO_DONOR.toLowerCase(),
        'Demo donor persona — receives real SMS, Telegram, email.',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
      ],
    );
    const donorId: string = donorResult.rows[0].id;

    // ---------------------------------------------------------
    // 3. Demo organizer/admin persona — REAL Telegram + email
    // ---------------------------------------------------------
    log('Creating organizer/admin persona (Demo Organizer)...');
    const organizerResult = await client.query(
      `INSERT INTO users (
         phone_number, display_name, password_hash, language_preference,
         is_verified, is_admin, verification_status,
         telegram_id, telegram_username, telegram_linked_at,
         email, email_verified_at,
         preferred_otp_channel,
         bio, avatar_url
       )
       VALUES ($1, $2, $3, 'uz', true, true, 'approved', $4, $5, NOW(), $6, NOW(), 'telegram', $7, $8)
       RETURNING id`,
      [
        '+998900000010',
        'Demo Organizer',
        userPasswordHash,
        demoEnv.TELEGRAM_DEMO_ORG_ID,
        'malacled',
        demoEnv.EMAIL_DEMO_ORG.toLowerCase(),
        'Demo organizer + admin persona — receives real Telegram + email for admin/organizer flows.',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80',
      ],
    );
    const organizerId: string = organizerResult.rows[0].id;

    // ---------------------------------------------------------
    // 4. Filler users — for donation history / extra organizers
    // ---------------------------------------------------------
    log('Creating 5 filler users...');
    const fillerIds: string[] = [];
    for (let i = 0; i < FILLER_PHONES.length; i++) {
      const result = await client.query(
        `INSERT INTO users (phone_number, display_name, password_hash, language_preference,
                            is_verified, verification_status, avatar_url)
         VALUES ($1, $2, $3, 'uz', true, 'approved', $4) RETURNING id`,
        [FILLER_PHONES[i], FILLER_DONOR_NAMES[i], userPasswordHash, FILLER_AVATARS[i]],
      );
      fillerIds.push(result.rows[0].id);
    }
    log(`  ${fillerIds.length} filler users`);

    // ---------------------------------------------------------
    // 5. Withdrawal accounts (organizer + filler creators)
    // ---------------------------------------------------------
    log('Creating withdrawal accounts...');
    const withdrawalAccountByCreator = new Map<string, string>();

    for (const userId of [organizerId, ...fillerIds]) {
      const account = encrypt(`8600${Math.floor(1_000_000_000 + Math.random() * 9_000_000_000)}`);
      const result = await client.query(
        `INSERT INTO withdrawal_accounts (user_id, provider, account_number_encrypted, account_holder_name, is_primary, is_verified)
         VALUES ($1, 'uzcard', $2, 'Sahovat Demo', true, true) RETURNING id`,
        [userId, account],
      );
      withdrawalAccountByCreator.set(userId, result.rows[0].id);
    }

    // ---------------------------------------------------------
    // 6. Campaigns
    // ---------------------------------------------------------
    log(`Creating ${CAMPAIGNS.length} campaigns...`);
    const campaignIds: string[] = [];

    function resolveCreator(c: DemoCampaign): string {
      if (c.creator === 'donor') return donorId;
      if (c.creator === 'organizer') return organizerId;
      return fillerIds[c.creator]!;
    }

    for (const c of CAMPAIGNS) {
      const creatorId = resolveCreator(c);
      const result = await client.query(
        `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, current_amount,
                                 status, region, is_verified, end_date, cover_image_url)
         VALUES ($1, $2, $3, $4, $5, 0, $6, $7, true, $8, $9) RETURNING id`,
        [creatorId, c.title, c.description, c.category, c.goal, c.status, c.region, c.endDate, c.cover],
      );
      campaignIds.push(result.rows[0].id);

      await client.query(
        `INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details, created_at)
         VALUES ($1, 'campaign_approved', 'campaign', $2, $3, NOW() - INTERVAL '${Math.floor(Math.random() * 30) + 1} days')`,
        [adminId, result.rows[0].id, JSON.stringify({ status: 'active', category: c.category })],
      );
    }

    // ---------------------------------------------------------
    // 7. Donations — drive each campaign toward its targetFundedPct
    // ---------------------------------------------------------
    log('Creating donations to drive funding levels...');
    let totalDonations = 0;
    for (let ci = 0; ci < CAMPAIGNS.length; ci++) {
      const c = CAMPAIGNS[ci]!;
      const campaignId = campaignIds[ci]!;
      const targetTotal = Math.round((c.goal * c.targetFundedPct) / 100);

      let runningTotal = 0;
      let donationCount = 0;
      // Pool of potential donors: donor persona + filler users (skip the campaign creator).
      const creatorId = resolveCreator(c);
      const donorPool = [donorId, ...fillerIds].filter((id) => id !== creatorId);

      while (runningTotal < targetTotal && donationCount < 80) {
        const remaining = targetTotal - runningTotal;
        // Pick a tier that doesn't massively overshoot the target.
        const candidateTiers = AMOUNT_TIERS.filter((t) => t <= Math.max(remaining, AMOUNT_TIERS[0]!));
        const amount = candidateTiers[
          Math.floor(Math.random() * candidateTiers.length)
        ] ?? AMOUNT_TIERS[0]!;
        const fee = Math.round(amount * 0.01);
        const netAmount = amount - fee;

        const donorIdForRow = donorPool[donationCount % donorPool.length]!;
        const isAnonymous = donationCount % 6 === 0;
        const provider = donationCount % 2 === 0 ? 'payme' : 'click';
        const daysAgo = Math.max(0, Math.floor((donationCount * 60) / 30));
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        const donationRes = await client.query(
          `INSERT INTO donations (campaign_id, donor_id, amount, platform_fee, net_amount,
                                   payment_provider, payment_transaction_id, status,
                                   is_anonymous, donor_display_name, note, created_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, $9, $10, $11, $11)
           RETURNING id`,
          [
            campaignId,
            donorIdForRow,
            amount,
            fee,
            netAmount,
            provider,
            `${provider}_demo_${campaignId.slice(0, 8)}_${donationCount}`,
            isAnonymous,
            isAnonymous ? null : 'Anonymous',
            DONATION_NOTES[donationCount % DONATION_NOTES.length] ?? null,
            createdAt,
          ],
        );

        await client.query(
          `INSERT INTO platform_fees (donation_id, fee_type, amount) VALUES ($1, 'donation', $2)`,
          [donationRes.rows[0].id, fee],
        );

        runningTotal += netAmount;
        donationCount++;
        totalDonations++;
      }

      await client.query(`UPDATE campaigns SET current_amount = $1 WHERE id = $2`, [runningTotal, campaignId]);
    }
    log(`  ${totalDonations} donations across ${CAMPAIGNS.length} campaigns`);

    // ---------------------------------------------------------
    // 8. Notification preferences
    //
    // Strategy: insert a fresh per-user × per-event × per-channel
    // matrix. Default rule: sms+telegram=enabled, email=enabled when
    // verified. Then override the donor + organizer rows with curated
    // sets from roadmap §11.
    // ---------------------------------------------------------
    log('Inserting notification preferences...');

    // 8a. Default backfill for everyone.
    await client.query(
      `INSERT INTO notification_preferences (user_id, event_type, channel, enabled)
       SELECT
         u.id,
         e.event_type,
         c.channel,
         CASE
           WHEN c.channel = 'email' AND u.email_verified_at IS NULL THEN FALSE
           ELSE TRUE
         END
       FROM users u
       CROSS JOIN (
         VALUES ${ALL_EVENTS.map((e) => `('${e}')`).join(', ')}
       ) AS e(event_type)
       CROSS JOIN (
         VALUES ('sms'), ('telegram'), ('email')
       ) AS c(channel)`,
    );

    // 8b. Override curated prefs for donor.
    for (const event of ALL_EVENTS) {
      const enabledChannels = new Set<Channel>(DONOR_PREFS[event]);
      for (const ch of ['sms', 'telegram', 'email'] as const) {
        await client.query(
          `UPDATE notification_preferences
           SET enabled = $1, updated_at = NOW()
           WHERE user_id = $2 AND event_type = $3 AND channel = $4`,
          [enabledChannels.has(ch), donorId, event, ch],
        );
      }
    }

    // 8c. Override curated prefs for organizer.
    for (const event of ALL_EVENTS) {
      const enabledChannels = new Set<Channel>(ORG_PREFS[event]);
      for (const ch of ['sms', 'telegram', 'email'] as const) {
        await client.query(
          `UPDATE notification_preferences
           SET enabled = $1, updated_at = NOW()
           WHERE user_id = $2 AND event_type = $3 AND channel = $4`,
          [enabledChannels.has(ch), organizerId, event, ch],
        );
      }
    }

    // ---------------------------------------------------------
    // 9. Admin settings (platform fee defaults)
    // ---------------------------------------------------------
    await client.query(
      `INSERT INTO admin_settings (master_card_number_encrypted, master_card_holder_name,
                                    platform_fee_percentage, updated_by)
       VALUES ($1, 'Sahovat Master', 1.00, $2)`,
      [encrypt('8600999988887777'), adminId],
    );

    await client.query('COMMIT');

    log('────────────────────────────────────────────');
    log('Demo seed complete.');
    log(`  Admin:     +998901234567 / admin123456`);
    log(`  Donor:     +998947981800 (@malikahon_v, ${demoEnv.EMAIL_DEMO_DONOR})`);
    log(`  Organizer: +998900000010 (@malacled, ${demoEnv.EMAIL_DEMO_ORG})`);
    log(`  Campaigns: ${CAMPAIGNS.length}`);
    log(`  Donations: ${totalDonations}`);
    log('────────────────────────────────────────────');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DemoSeed] FAILED:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('[DemoSeed] Unhandled error:', err);
  process.exit(1);
});
