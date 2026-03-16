import bcrypt from 'bcrypt';
import { pool } from '../../config/database.js';
import { encrypt } from '../../lib/encryption.js';

const log = (message: string) => console.log(`[Seed] ${message}`);

const COVER_IMAGES: Record<string, string> = {
  medical_1: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
  medical_2: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80',
  medical_3: 'https://images.unsplash.com/photo-1551190822-a9ce113d0d78?w=800&q=80',
  education_1: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80',
  education_2: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
  emergency_1: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80',
  emergency_2: 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?w=800&q=80',
  community_1: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80',
  community_2: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
  community_3: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80',
  creative_1: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80',
  creative_2: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80',
  business_1: 'https://images.unsplash.com/photo-1553484771-371a605b060b?w=800&q=80',
  business_2: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80',
  other_1: 'https://images.unsplash.com/photo-1531206715517-5c0ba140840e?w=800&q=80',
};

// Donor names for generating donations
const DONOR_NAMES = [
  'Aziz Karimov',
  'Dilnoza Rahimova',
  'Bobur Aliyev',
  'Malika Toshmatova',
  'Rustam Qodirov',
];

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Sahovat] FATAL: Cannot run seed in production!');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

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
    // Users
    // --------------------------------------------------------
    log('Creating admin user...');
    const adminPasswordHash = await bcrypt.hash('admin123456', 12);
    const adminResult = await client.query(
      `INSERT INTO users (phone_number, display_name, password_hash, is_verified, is_admin, verification_status, language_preference)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['+998901234567', 'Admin', adminPasswordHash, true, true, 'approved', 'uz'],
    );
    const adminId: string = adminResult.rows[0].id;

    log('Creating test users...');
    const userPasswordHash = await bcrypt.hash('password123', 12);

    const usersData = [
      { phone: '+998901111111', name: 'Aziz Karimov', dob: '1995-03-15', gender: 'male', cats: '{medical,education}', verified: true, vStatus: 'approved', bio: 'Bolalar salomatligi uchun kurashuvchi shifokor. Toshkent tibbiyot universitetini tamomlagan.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80' },
      { phone: '+998902222222', name: 'Dilnoza Rahimova', dob: '1998-07-22', gender: 'female', cats: '{community,emergency}', verified: true, vStatus: 'approved', bio: 'Ijtimoiy ish mutaxassisi. Qishloqlarda oilalarga yordam berish bilan shug\'ullanaman.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80' },
      { phone: '+998903333333', name: 'Bobur Aliyev', dob: '2000-11-08', gender: 'male', cats: '{creative,business}', verified: true, vStatus: 'approved', bio: 'Yosh tadbirkor va ijodkor. San\'at va biznes sohasida tajriba.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80' },
      { phone: '+998904444444', name: 'Malika Toshmatova', dob: '1992-05-10', gender: 'female', cats: '{medical,community}', verified: true, vStatus: 'approved', bio: 'Hamshira va ijtimoiy faol. Qishloq aholisiga tibbiy yordam ko\'rsatish.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80' },
      { phone: '+998905555555', name: 'Rustam Qodirov', dob: '1988-09-25', gender: 'male', cats: '{education,business}', verified: true, vStatus: 'approved', bio: 'O\'qituvchi va ta\'lim sohasida faol. Yoshlar uchun dasturlar rivojlantirish.', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80' },
    ];

    const userIds: string[] = [];
    for (const u of usersData) {
      const result = await client.query(
        `INSERT INTO users (phone_number, display_name, password_hash, date_of_birth, gender, preferred_categories, is_verified, verification_status, bio, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [u.phone, u.name, userPasswordHash, u.dob, u.gender, u.cats, u.verified, u.vStatus, u.bio, u.avatar],
      );
      userIds.push(result.rows[0].id);
      log(`  User ${u.name} created`);
    }

    // --------------------------------------------------------
    // Campaigns (15 total)
    // --------------------------------------------------------
    log('Creating 15 campaigns...');

    const campaigns = [
      // 1. Medical / Tashkent
      {
        creator: 0, title: 'Bolalar shifoxonasiga zamonaviy tibbiy uskunalar',
        description: `Toshkent shahridagi bolalar shifoxonasiga zamonaviy tibbiy uskunalar sotib olish uchun mablag' yig'moqdamiz.\n\nHozirgi kunda shifoxonada eskirgan uskunalar tufayli ko'p bolalar kerakli davolashni olmaydilar. Yangi EKG apparatlari, ultratovush qurilmalari va jarrohlik asbob-uskunalari zarur.\n\nSizning yordamingiz bilan biz kam ta'minlangan oilalar bolalarini sog'aytirishimiz mumkin. Har bir summa muhim!`,
        category: 'medical', goal: 50000000, region: 'tashkent', endDate: '2026-06-30', cover: COVER_IMAGES.medical_1,
      },
      // 2. Education / Fergana
      {
        creator: 4, title: 'Qishloq maktabi kutubxonasini yangilash',
        description: `Farg'ona viloyatidagi qishloq maktabi kutubxonasini zamonaviy kitoblar va o'quv materiallari bilan to'ldirish.\n\nBu qishloq maktabida 300 dan ortiq o'quvchi ta'lim oladi, ammo kutubxona 20 yildan buyon yangilanmagan. Bolalar zamonaviy adabiyot, fan kitoblari va internet resurslaridan mahrum.\n\n500+ yangi kitob sotib olamiz, kompyuter va internet ulanishi o'rnatamiz.`,
        category: 'education', goal: 15000000, region: 'fergana', endDate: '2026-05-15', cover: COVER_IMAGES.education_1,
      },
      // 3. Emergency / Surkhandarya
      {
        creator: 1, title: 'Sel ofatidan zarar ko\'rgan oilalarga yordam',
        description: `Surxondaryo viloyatida kuchli sel oqibatida minglab oilalar uylarini yo'qotdi.\n\nBizning tashkilot orqali siz quyidagilarga yordam berishingiz mumkin: oziq-ovqat paketlari, kiyim va poyabzal, bolalar uchun o'quv qurollari, dori-darmon va birlamchi tibbiy yordam.\n\nHozirgacha 45 oilaga yordam ko'rsatildi. Yana 100 oilaga yordam berish uchun mablag' kerak.`,
        category: 'emergency', goal: 100000000, region: 'surkhandarya', endDate: '2026-04-30', cover: COVER_IMAGES.emergency_1,
      },
      // 4. Creative / Tashkent
      {
        creator: 2, title: 'Yosh rassomlar uchun birinchi ko\'rgazma',
        description: `Yosh rassomlar uchun birinchi shaxsiy ko'rgazma tashkil etish — bu ularning ijodiy yo'lini boshlashiga yordam beradi.\n\n15 ta yosh rassom (18-25 yosh) ishtirok etadi. Ko'rgazma Toshkent markazidagi galereyada o'tkaziladi. Har bir rassomga o'z asarlarini sotish imkoniyati beriladi.\n\nSizning yordamingiz bilan kelajakdagi buyuk rassomlar kashf etiladi!`,
        category: 'creative', goal: 8000000, region: 'tashkent', endDate: '2026-05-20', cover: COVER_IMAGES.creative_1,
      },
      // 5. Community / Karakalpakstan
      {
        creator: 0, title: 'Karakalpakiston qishloqlariga toza ichimlik suvi',
        description: `Karakalpakiston — suv muammosi eng og'ir bo'lgan mintaqa. Minglab odamlar iflos suv ichadi, bu kasalliklar sababi.\n\n5 ta qishloqqa toza ichimlik suvi tizimini o'rnatish, har bir qishloqda 200+ oila foydalanadi. Suv tozalash qurilmalari va saqlash tanklari o'rnatiladi.\n\nToza suv — asosiy insoniyat huquqi.`,
        category: 'community', goal: 80000000, region: 'karakalpakstan', endDate: '2026-08-15', cover: COVER_IMAGES.community_1,
      },
      // 6. Medical / Samarkand
      {
        creator: 3, title: 'Bolalar shifoxonasi uchun jarrohlik uskunalari',
        description: `Samarqand viloyatidagi bolalar shifoxonasida zamonaviy jarrohlik uskunalari yo'qligi sababli ko'p murakkab operatsiyalar olib borilmaydi.\n\nNeonatal jarrohlik asboblar, laringoskop va bronxoskop, yurak monitorlari, artroskopiya qurilmasi sotib olishni rejalashtirmoqdamiz.\n\nBu uskunalar yordamida yiliga 500+ bolaning hayotini saqlab qolish mumkin.`,
        category: 'medical', goal: 120000000, region: 'samarkand', endDate: '2026-07-01', cover: COVER_IMAGES.medical_2,
      },
      // 7. Emergency / Jizzakh
      {
        creator: 4, title: 'Zilziladan zararlangan maktabni qayta qurish',
        description: `Jizzax viloyatida zilzila tufayli mahalliy maktabning asosiy binosi vayron bo'ldi. 400 dan ortiq o'quvchi vaqtinchalik binolarda ta'lim olmoqda.\n\nYangi 3 qavatli maktab binosi qurish, zamonaviy kompyuter xonasi, sport va o'yingohlar, kutubxona va laboratoriyalar yaratishni maqsad qilganmiz.\n\nBolaning xavfsiz muhitda ta'lim olishi — ularning kelajagi uchun muhim.`,
        category: 'emergency', goal: 200000000, region: 'jizzakh', endDate: '2026-09-30', cover: COVER_IMAGES.emergency_2,
      },
      // 8. Education / Tashkent
      {
        creator: 2, title: 'Ayollar uchun bepul IT ta\'lim markazi',
        description: `Toshkentda ayollar va qizlar uchun bepul IT ta'lim markazi ochish.\n\nDasturlash (Python, JavaScript), web dizayn va UX, ma'lumotlar tahlili, raqamli marketing o'rgatiladi.\n\nO'zbekistonda ayollar IT sohasida kam vakillangan. Bu markaz 1000+ ayolga bepul ta'lim beradi va ish topishga yordam qiladi.`,
        category: 'education', goal: 45000000, region: 'tashkent', endDate: '2026-06-15', cover: COVER_IMAGES.education_2,
      },
      // 9. Community / Bukhara
      {
        creator: 1, title: 'Buxoro shahrida yoshlar sport majmuasi',
        description: `Buxoro shahrida yoshlar uchun zamonaviy sport majmuasi qurish.\n\nFutzal va basketbol maydonchasi, sport zali va trenajor xonasi, bolalar uchun o'yin maydonchasi quriladi.\n\nBu majmua yiliga 2000+ yoshga xizmat ko'rsatadi. Sog'lom avlod — kuchli davlat!`,
        category: 'community', goal: 150000000, region: 'bukhara', endDate: '2026-10-31', cover: COVER_IMAGES.community_2,
      },
      // 10. Business / Kashkadarya
      {
        creator: 3, title: 'Qishloq fermerlar kooperativi',
        description: `Qashqadaryo viloyatidagi kichik fermerlar birlashib kuchli kooperativ tashkil etmoqda.\n\nQishloq xo'jaligi texnikasini ijaraga berish, o'g'it va urug'likni ulgurji xarid, mahsulotlarni sotish uchun kanallar va maslahat xizmati tashkil etiladi.\n\n200+ fermer oilasi bu kooperativdan foydalanadi.`,
        category: 'business', goal: 35000000, region: 'kashkadarya', endDate: '2026-05-31', cover: COVER_IMAGES.business_1,
      },
      // 11. Creative / Khorezm
      {
        creator: 4, title: 'An\'anaviy hunarmandchilik ustaxonalarini tiklash',
        description: `Xorazm — an'anaviy hunarmandchilik avlodlar davomida uzatiladi. Ammo ko'p ustaxonalar yopilish arafasida.\n\n10 ta an'anaviy ustaxonani qayta tiklash, yosh usta va shogirdlarni o'qitish, xalq amaliy san'ati muzeyi tashkil etish rejada.\n\nSo'na, g'isht, kashtado'zlik, zargarlik — bularning barchasi sizning yordamingiz bilan yashaydi!`,
        category: 'creative', goal: 25000000, region: 'khorezm', endDate: '2026-07-31', cover: COVER_IMAGES.creative_2,
      },
      // 12. Community / Navoi
      {
        creator: 0, title: 'Yetimlar uyi uchun zamonaviy isitish tizimi',
        description: `Navoiy shahridagi yetimlar uyi eskirgan isitish tizimiga ega. Qish kunlarida bolalar sovuqda yashaydilar.\n\nYangi markaziy isitish tizimi o'rnatish, har bir xonada radiatorlar, suv isitish qurilmasi va energiya tejash tizimi o'rnatiladi.\n\nBu yetimlar uyida 80+ bola yashaydi. Ularning iliq muhitda bo'lishi bizning burchimiz.`,
        category: 'community', goal: 60000000, region: 'navoi', endDate: '2026-04-15', cover: COVER_IMAGES.community_3,
      },
      // 13. Medical / Andijan
      {
        creator: 1, title: 'Qishloqlar uchun mobil tibbiyot klinikasi',
        description: `Andijon viloyatining uzoq qishloqlarida shifokorlar kam. Minglab odamlar kerakli tibbiy yordam olmaydilar.\n\nFull jihozlangan medical bus, umumiy shifokor, pediatr, ginekolog, EKG, ultratovush, laboratoriya va bepul dorilar taqdim etiladi.\n\nBu mobil klinika yiliga 10,000+ qishloq aholisiga xizmat ko'rsatadi.`,
        category: 'medical', goal: 90000000, region: 'andijan', endDate: '2026-08-31', cover: COVER_IMAGES.medical_3,
      },
      // 14. Emergency / Syrdarya
      {
        creator: 3, title: 'Qurg\'oqchilikdan zarar ko\'rgan fermerlarga yordam',
        description: `Sirdaryo viloyatida qurg'oqchilik tufayli minglab gektar ekinlar nobud bo'ldi. Fermerlar ishsiz qolib, oilalar och qoldi.\n\nUrug'lik va o'g'it taqsimoti, qishloq xo'jaligi texnikasini ijaraga berish, suv tejash texnologiyalari o'rgatish, yangi ekin ekish uchun subsidiyalar ajratiladi.\n\n500+ fermer oilasi bu yordamdan foydalanadi.`,
        category: 'emergency', goal: 75000000, region: 'syrdarya', endDate: '2026-04-30', cover: COVER_IMAGES.other_1,
      },
      // 15. Business / Tashkent Region
      {
        creator: 2, title: 'Yoshlar tadbirkorlik dasturi',
        description: `Toshkent viloyatida yosh tadbirkorlarni qo'llab-quvvatlash dasturi.\n\nBiznes trening va mentorlik, boshlang'ich kapital (grant), marketing va reklama yordami, biznes inkubator xizmatlari taqdim etiladi.\n\n18-35 yoshdagi yoshlar uchun mo'ljallangan. 50+ yosh tadbirkor bu dasturdan foydalanadi.`,
        category: 'business', goal: 40000000, region: 'tashkent_region', endDate: '2026-06-30', cover: COVER_IMAGES.business_2,
      },
    ];

    const campaignIds: string[] = [];

    for (let i = 0; i < campaigns.length; i++) {
      const c = campaigns[i]!;
      const result = await client.query(
        `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, current_amount, status, region, is_verified, end_date, cover_image_url)
         VALUES ($1, $2, $3, $4, $5, 0, 'active', $6, true, $7, $8) RETURNING id`,
        [userIds[c.creator], c.title, c.description, c.category, c.goal, c.region, c.endDate, c.cover],
      );
      campaignIds.push(result.rows[0].id);
      log(`  Campaign ${i + 1}: ${c.title.substring(0, 40)}...`);
    }

    // --------------------------------------------------------
    // Donations (15-20 per campaign, ~270 total)
    // --------------------------------------------------------
    log('Creating donations (15-20 per campaign)...');

    // Preset donation amount tiers (in UZS tiyin)
    const amountTiers = [
      10000, 15000, 20000, 25000, 50000, 75000,
      100000, 150000, 200000, 250000, 300000, 500000,
      750000, 1000000, 1500000, 2000000, 2500000, 3000000,
      5000000, 7500000, 10000000,
    ];

    let totalDonations = 0;
    let totalFees = 0;

    for (let ci = 0; ci < campaignIds.length; ci++) {
      const campaignId = campaignIds[ci]!;
      const campaignGoal = campaigns[ci]!.goal;

      // Each campaign gets 15-20 donations
      const donationCount = 15 + (ci % 6); // 15,16,17,18,19,20 rotating
      let campaignTotal = 0;

      for (let di = 0; di < donationCount; di++) {
        // Pick a donor (cycle through all 5 users, skip if it's the campaign creator)
        let donorIdx = (di + ci) % 5;
        if (donorIdx === campaigns[ci]!.creator) {
          donorIdx = (donorIdx + 1) % 5;
        }
        const donorId = userIds[donorIdx]!;
        const donorName = DONOR_NAMES[donorIdx]!;

        // Pick an amount — weighted to fill campaigns to 20-70% of goal
        const tierIdx = (di * 3 + ci * 7) % amountTiers.length;
        const amount = amountTiers[tierIdx]!;

        const isAnonymous = di % 5 === 0; // every 5th donation is anonymous
        const fee = Math.round(amount * 0.01);
        const netAmount = amount - fee;

        // Stagger completed_at over last 60 days
        const daysAgo = Math.floor((di * 60) / donationCount);

        await client.query(
          `INSERT INTO donations (campaign_id, donor_id, amount, platform_fee, net_amount, payment_provider, status, is_anonymous, donor_display_name, note, completed_at)
           VALUES ($1, $2, $3, $4, $5, 'payme', 'completed', $6, $7, $8, NOW() - INTERVAL '${daysAgo} days')`,
          [
            campaignId,
            donorId,
            amount,
            fee,
            netAmount,
            isAnonymous,
            isAnonymous ? null : donorName,
            di % 3 === 0 ? 'Omad tilaymiz!' : null, // every 3rd has a note
          ],
        );

        // Create matching platform fee record
        await client.query(
          `INSERT INTO platform_fees (donation_id, fee_type, amount)
           VALUES ((SELECT id FROM donations WHERE campaign_id = $1 AND donor_id = $2 AND amount = $3 ORDER BY created_at DESC LIMIT 1), 'donation', $4)`,
          [campaignId, donorId, amount, fee],
        );

        campaignTotal += netAmount;
        totalFees += fee;
        totalDonations++;
      }

      // Update campaign current_amount to match sum of net donations
      // Cap at goal amount for realism (most shouldn't exceed goal)
      const finalAmount = Math.min(campaignTotal, Math.round(campaignGoal * 0.85));
      await client.query(
        `UPDATE campaigns SET current_amount = $1 WHERE id = $2`,
        [finalAmount, campaignId],
      );
    }

    log(`  ${totalDonations} donations created`);
    log(`  ${totalDonations} platform fee records created`);

    // --------------------------------------------------------
    // Recurring donations
    // --------------------------------------------------------
    log('Creating recurring donations...');
    const recurringDonations = [
      { donorId: userIds[0], campaignId: campaignIds[0], amount: 100000 },
      { donorId: userIds[1], campaignId: campaignIds[2], amount: 150000 },
      { donorId: userIds[3], campaignId: campaignIds[5], amount: 200000 },
      { donorId: userIds[4], campaignId: campaignIds[8], amount: 250000 },
      { donorId: userIds[2], campaignId: campaignIds[11], amount: 100000 },
    ];

    for (const rd of recurringDonations) {
      await client.query(
        `INSERT INTO recurring_donations (donor_id, campaign_id, amount, frequency, status, next_charge_date)
         VALUES ($1, $2, $3, 'monthly', 'active', CURRENT_DATE + INTERVAL '1 month')`,
        [rd.donorId, rd.campaignId, rd.amount],
      );
    }
    log(`  ${recurringDonations.length} recurring donations created`);

    // --------------------------------------------------------
    // Admin settings
    // --------------------------------------------------------
    log('Creating admin settings...');
    const encryptedCardNumber = encrypt('8600123456789012');
    await client.query(
      `INSERT INTO admin_settings (master_card_number_encrypted, master_card_holder_name, platform_fee_percentage, updated_by)
       VALUES ($1, $2, $3, $4)`,
      [encryptedCardNumber, 'SAHOVAT ADMIN', 1.0, adminId],
    );

    // --------------------------------------------------------
    // User category scores
    // --------------------------------------------------------
    log('Creating user category scores...');
    const categoryScores = [
      { userId: userIds[0], category: 'medical', score: 5.0 },
      { userId: userIds[0], category: 'education', score: 3.0 },
      { userId: userIds[0], category: 'community', score: 2.0 },
      { userId: userIds[1], category: 'emergency', score: 5.0 },
      { userId: userIds[1], category: 'community', score: 4.0 },
      { userId: userIds[1], category: 'medical', score: 2.0 },
      { userId: userIds[2], category: 'creative', score: 4.0 },
      { userId: userIds[2], category: 'business', score: 3.0 },
      { userId: userIds[3], category: 'medical', score: 5.0 },
      { userId: userIds[3], category: 'community', score: 4.0 },
      { userId: userIds[4], category: 'education', score: 5.0 },
      { userId: userIds[4], category: 'business', score: 3.0 },
    ];

    for (const cs of categoryScores) {
      await client.query(
        `INSERT INTO user_category_scores (user_id, category, score, last_interaction_at) VALUES ($1, $2, $3, NOW())`,
        [cs.userId, cs.category, cs.score],
      );
    }
    log(`  ${categoryScores.length} user category scores created`);

    // --------------------------------------------------------
    // User events
    // --------------------------------------------------------
    log('Creating user events...');
    const events = [
      { userId: userIds[0], campaignId: campaignIds[2], eventType: 'campaign_viewed', meta: { source: 'feed' } },
      { userId: userIds[1], campaignId: campaignIds[0], eventType: 'campaign_viewed', meta: { source: 'feed' } },
      { userId: userIds[1], campaignId: campaignIds[1], eventType: 'campaign_viewed', meta: { source: 'search' } },
      { userId: userIds[1], campaignId: campaignIds[0], eventType: 'donation_completed', meta: { amount: 5000000, payment_provider: 'payme' } },
      { userId: userIds[2], campaignId: campaignIds[5], eventType: 'campaign_viewed', meta: { source: 'feed' } },
      { userId: userIds[2], campaignId: campaignIds[5], eventType: 'donation_completed', meta: { amount: 3000000, payment_provider: 'payme' } },
      { userId: userIds[3], campaignId: campaignIds[8], eventType: 'campaign_viewed', meta: { source: 'search' } },
      { userId: userIds[4], campaignId: campaignIds[13], eventType: 'campaign_viewed', meta: { source: 'feed' } },
    ];

    for (const e of events) {
      await client.query(
        `INSERT INTO user_events (user_id, session_id, event_type, campaign_id, metadata) VALUES ($1, $2, $3, $4, $5)`,
        [e.userId, `session-${Math.random().toString(36).substring(2, 11)}`, e.eventType, e.campaignId, JSON.stringify(e.meta)],
      );
    }
    log(`  ${events.length} user events created`);

    await client.query('COMMIT');

    log('========================================');
    log('Seed completed successfully!');
    log(`  Users:           6 (1 admin + 5 regular)`);
    log(`  Campaigns:       ${campaigns.length}`);
    log(`  Donations:       ${totalDonations}`);
    log(`  Platform fees:   ${totalDonations}`);
    log(`  Recurring:       ${recurringDonations.length}`);
    log(`  Category scores: ${categoryScores.length}`);
    log(`  User events:     ${events.length}`);
    log(`  Admin settings:  1`);
    log('========================================');
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
