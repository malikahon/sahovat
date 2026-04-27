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

const DONOR_NAMES = [
  'Aziz Karimov',
  'Dilnoza Rahimova',
  'Bobur Aliyev',
  'Malika Toshmatova',
  'Rustam Qodirov',
  'Sadir Mamatov',
  'Gulnora Isaeva',
  'Temur Rustamov',
  'Nodira Abdullayeva',
  'Jamshid Karimov',
];

const PAYMENT_PROVIDERS = ['payme', 'click', 'uzum'] as const;
const WITHDRAWAL_PROVIDERS = ['payme', 'uzcard', 'humo'] as const;

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('[Sahovat] FATAL: Cannot run seed in production! Use --force to override.');
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

    log('Creating admin user...');
    const adminPasswordHash = await bcrypt.hash('admin123456', 12);
    const adminResult = await client.query(
      `INSERT INTO users (phone_number, display_name, password_hash, is_verified, is_admin, verification_status, language_preference)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['+998901234567', 'Admin', adminPasswordHash, true, true, 'approved', 'uz'],
    );
    const adminId: string = adminResult.rows[0].id;

    log('Creating test users (12 total)...');
    const userPasswordHash = await bcrypt.hash('password123', 12);

    const usersData = [
      { phone: '+998901111111', name: 'Aziz Karimov', dob: '1995-03-15', gender: 'male', cats: '{medical,education}', verified: true, vStatus: 'approved', bio: 'Bolalar salomatligi uchun kurashuvchi shifokor. Toshkent tibbiyot universitetini tamomlagan.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80' },
      { phone: '+998902222222', name: 'Dilnoza Rahimova', dob: '1998-07-22', gender: 'female', cats: '{community,emergency}', verified: true, vStatus: 'approved', bio: 'Ijtimoiy ish mutaxassisi. Qishloqlarda oilalarga yordam berish bilan shug\'ullanaman.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80' },
      { phone: '+998903333333', name: 'Bobur Aliyev', dob: '2000-11-08', gender: 'male', cats: '{creative,business}', verified: true, vStatus: 'approved', bio: 'Yosh tadbirkor va ijodkor. San\'at va biznes sohasida tajriba.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80' },
      { phone: '+998904444444', name: 'Malika Toshmatova', dob: '1992-05-10', gender: 'female', cats: '{medical,community}', verified: true, vStatus: 'approved', bio: 'Hamshira va ijtimoiy faol. Qishloq aholisiga tibbiy yordam ko\'rsatish.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80' },
      { phone: '+998905555555', name: 'Rustam Qodirov', dob: '1988-09-25', gender: 'male', cats: '{education,business}', verified: true, vStatus: 'approved', bio: 'O\'qituvchi va ta\'lim sohasida faol. Yoshlar uchun dasturlar rivojlantirish.', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80' },
      { phone: '+998906666666', name: 'Sadir Mamatov', dob: '1985-12-03', gender: 'male', cats: '{medical,emergency}', verified: true, vStatus: 'approved', bio: 'Tibbiyot xodimi. Favqulodda vaziyatlarda yordam ko\'rsatish tajribasi.', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&q=80' },
      { phone: '+998907777777', name: 'Gulnora Isaeva', dob: '1993-08-17', gender: 'female', cats: '{community,education}', verified: true, vStatus: 'approved', bio: 'Maktab o\'qituvchisi. Bolalar ta\'limi va rivojlanishiga hissa qo\'shaman.', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80' },
      { phone: '+998908888888', name: 'Temur Rustamov', dob: '1997-02-28', gender: 'male', cats: '{creative,business}', verified: true, vStatus: 'approved', bio: 'Dizayner va ijodkor. Grafik dizayn va brending sohasida ishlayman.', avatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150&q=80' },
      { phone: '+998909999999', name: 'Nodira Abdullayeva', dob: '1991-06-12', gender: 'female', cats: '{medical,community}', verified: false, vStatus: 'pending', bio: 'Hamshira. Kasalxonalarda ishlash tajribasiga ega.', avatar: 'https://images.unsplash.com/photo-1554151228-14d9def656ec?w=150&q=80' },
      { phone: '+998910000000', name: 'Jamshid Karimov', dob: '1994-10-05', gender: 'male', cats: '{business,education}', verified: true, vStatus: 'approved', bio: 'Biznes konsultant. Kichik biznes rivoji bo\'yicha maslahat beraman.', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&q=80' },
      { phone: '+998911111111', name: 'Farruh Tursunov', dob: '1989-04-22', gender: 'male', cats: '{emergency,community}', verified: true, vStatus: 'approved', bio: 'IHM xodimi. Tabiiy ofatlar qurbonlariga yordam berishda faol ishtirok etaman.', avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&q=80' },
      { phone: '+998912222222', name: 'Madina Yusupova', dob: '1996-09-08', gender: 'female', cats: '{creative,education}', verified: false, vStatus: 'none', bio: 'Talaba. San\'at va madaniyat sohasida faolman.', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&q=80' },
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

    log('Creating admin actions (user verifications)...');
    const userVerificationActions = [
      { action: 'user_verified', targetType: 'user', targetId: userIds[0], details: { status: 'approved' } },
      { action: 'user_verified', targetType: 'user', targetId: userIds[1], details: { status: 'approved' } },
      { action: 'user_verified', targetType: 'user', targetId: userIds[2], details: { status: 'approved' } },
      { action: 'user_verified', targetType: 'user', targetId: userIds[3], details: { status: 'approved' } },
      { action: 'user_verified', targetType: 'user', targetId: userIds[4], details: { status: 'approved' } },
      { action: 'user_verified', targetType: 'user', targetId: userIds[5], details: { status: 'approved' } },
      { action: 'user_verified', targetType: 'user', targetId: userIds[6], details: { status: 'approved' } },
      { action: 'user_verified', targetType: 'user', targetId: userIds[7], details: { status: 'approved' } },
      { action: 'user_pending', targetType: 'user', targetId: userIds[8], details: { status: 'pending' } },
      { action: 'user_verified', targetType: 'user', targetId: userIds[9], details: { status: 'approved' } },
      { action: 'user_verified', targetType: 'user', targetId: userIds[10], details: { status: 'approved' } },
    ];

    for (const a of userVerificationActions) {
      await client.query(
        `INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 90) + 1} days')`,
        [adminId, a.action, a.targetType, a.targetId, JSON.stringify(a.details)],
      );
    }

    log('Creating 15 campaigns with varied statuses...');
    const campaigns = [
      {
        creator: 0, title: 'Bolalar shifoxonasiga zamonaviy tibbiy uskunalar',
        description: `Toshkent shahridagi bolalar shifoxonasiga zamonaviy tibbiy uskunalar sotib olish uchun mablag' yig'moqdamiz.\n\nHozirgi kunda shifoxonada eskirgan uskunalar tufayli ko'p bolalar kerakli davolashni olmaydilar. Yangi EKG apparatlari, ultratovush qurilmalari va jarrohlik asbob-uskunalari zarur.\n\nSizning yordamingiz bilan biz kam ta'minlangan oilalar bolalarini sog'aytirishimiz mumkin. Har bir summa muhim!`,
        category: 'medical', goal: 50000000, region: 'tashkent', endDate: '2026-06-30', cover: COVER_IMAGES.medical_1, status: 'active',
      },
      {
        creator: 4, title: 'Qishloq maktabi kutubxonasini yangilash',
        description: `Farg'ona viloyatidagi qishloq maktabi kutubxonasini zamonaviy kitoblar va o'quv materiallari bilan to'ldirish.\n\nBu qishloq maktabida 300 dan ortiq o'quvchi ta'lim oladi, ammo kutubxona 20 yildan buyon yangilanmagan. Bolalar zamonaviy adabiyot, fan kitoblari va internet resurslaridan mahrum.\n\n500+ yangi kitob sotib olamiz, kompyuter va internet ulanishi o'rnatamiz.`,
        category: 'education', goal: 15000000, region: 'fergana', endDate: '2026-05-15', cover: COVER_IMAGES.education_1, status: 'completed',
      },
      {
        creator: 1, title: 'Sel ofatidan zarar ko\'rgan oilalarga yordam',
        description: `Surxondaryo viloyatida kuchli sel oqibatida minglab oilalar uylarini yo'qotdi.\n\nBizning tashkilot orqali siz quyidagilarga yordam berishingiz mumkin: oziq-ovqat paketlari, kiyim va poyabzal, bolalar uchun o'quv qurollari, dori-darmon va birlamchi tibbiy yordam.\n\nHozirgacha 45 oilaga yordam ko'rsatildi. Yana 100 oilaga yordam berish uchun mablag' kerak.`,
        category: 'emergency', goal: 100000000, region: 'surkhandarya', endDate: '2026-04-30', cover: COVER_IMAGES.emergency_1, status: 'active',
      },
      {
        creator: 2, title: 'Yosh rassomlar uchun birinchi ko\'rgazma',
        description: `Yosh rassomlar uchun birinchi shaxsiy ko'rgazma tashkil etish — bu ularning ijodiy yo'lini boshlashiga yordam beradi.\n\n15 ta yosh rassom (18-25 yosh) ishtirok etadi. Ko'rgazma Toshkent markazidagi galereyada o'tkaziladi. Har bir rassomga o'z asarlarini sotish imkoniyati beriladi.\n\nSizning yordamingiz bilan kelajakdagi buyuk rassomlar kashf etiladi!`,
        category: 'creative', goal: 8000000, region: 'tashkent', endDate: '2026-05-20', cover: COVER_IMAGES.creative_1, status: 'completed',
      },
      {
        creator: 0, title: 'Karakalpakiston qishloqlariga toza ichimlik suvi',
        description: `Karakalpakiston — suv muammosi eng og'ir bo'lgan mintaqa. Minglab odamlar iflos suv ichadi, bu kasalliklar sababi.\n\n5 ta qishloqqa toza ichimlik suvi tizimini o'rnatish, har bir qishloqda 200+ oila foydalanadi. Suv tozalash qurilmalari va saqlash tanklari o'rnatiladi.\n\nToza suv — asosiy insoniyat huquqi.`,
        category: 'community', goal: 80000000, region: 'karakalpakstan', endDate: '2026-08-15', cover: COVER_IMAGES.community_1, status: 'active',
      },
      {
        creator: 3, title: 'Bolalar shifoxonasi uchun jarrohlik uskunalari',
        description: `Samarqand viloyatidagi bolalar shifoxonasida zamonaviy jarrohlik uskunalari yo'qligi sababli ko'p murakkab operatsiyalar olib borilmaydi.\n\nNeonatal jarrohlik asboblar, laringoskop va bronxoskop, yurak monitorlari, artroskopiya qurilmasi sotib olishni rejalashtirmoqdamiz.\n\nBu uskunalar yordamida yiliga 500+ bolaning hayotini saqlab qolish mumkin.`,
        category: 'medical', goal: 120000000, region: 'samarkand', endDate: '2026-07-01', cover: COVER_IMAGES.medical_2, status: 'active',
      },
      {
        creator: 4, title: 'Zilziladan zararlangan maktabni qayta qurish',
        description: `Jizzax viloyatida zilzila tufayli mahalliy maktabning asosiy binosi vayron bo'ldi. 400 dan ortiq o'quvchi vaqtinchalik binolarda ta'lim olmoqda.\n\nYangi 3 qavatli maktab binosi qurish, zamonaviy kompyuter xonasi, sport va o'yingohlar, kutubxona va laboratoriyalar yaratishni maqsad qilganmiz.\n\nBolaning xavfsiz muhitda ta'lim olishi — ularning kelajagi uchun muhim.`,
        category: 'emergency', goal: 200000000, region: 'jizzakh', endDate: '2026-09-30', cover: COVER_IMAGES.emergency_2, status: 'active',
      },
      {
        creator: 2, title: 'Ayollar uchun bepul IT ta\'lim markazi',
        description: `Toshkentda ayollar va qizlar uchun bepul IT ta'lim markazi ochish.\n\nDasturlash (Python, JavaScript), web dizayn va UX, ma'lumotlar tahlili, raqamli marketing o'rgatiladi.\n\nO'zbekistonda ayollar IT sohasida kam vakillangan. Bu markaz 1000+ ayolga bepul ta'lim beradi va ish topishga yordam qiladi.`,
        category: 'education', goal: 45000000, region: 'tashkent', endDate: '2026-06-15', cover: COVER_IMAGES.education_2, status: 'paused',
      },
      {
        creator: 1, title: 'Buxoro shahrida yoshlar sport majmuasi',
        description: `Buxoro shahrida yoshlar uchun zamonaviy sport majmuasi qurish.\n\nFutzal va basketbol maydonchasi, sport zali va trenajor xonasi, bolalar uchun o'yin maydonchasi quriladi.\n\nBu majmua yiliga 2000+ yoshga xizmat ko'rsatadi. Sog'lom avlod — kuchli davlat!`,
        category: 'community', goal: 150000000, region: 'bukhara', endDate: '2026-10-31', cover: COVER_IMAGES.community_2, status: 'active',
      },
      {
        creator: 3, title: 'Qishloq fermerlar kooperativi',
        description: `Qashqadaryo viloyatidagi kichik fermerlar birlashib kuchli kooperativ tashkil etmoqda.\n\nQishloq xo'jaligi texnikasini ijaraga berish, o'g'it va urug'likni ulgurji xarid, mahsulotlarni sotish uchun kanallar va maslahat xizmati tashkil etiladi.\n\n200+ fermer oilasi bu kooperativdan foydalanadi.`,
        category: 'business', goal: 35000000, region: 'kashkadarya', endDate: '2026-05-31', cover: COVER_IMAGES.business_1, status: 'cancelled',
      },
      {
        creator: 4, title: 'An\'anaviy hunarmandchilik ustaxonalarini tiklash',
        description: `Xorazm — an'anaviy hunarmandchilik avlodlar davomida uzatiladi. Ammo ko'p ustaxonalar yopilish arafasida.\n\n10 ta an'anaviy ustaxonani qayta tiklash, yosh usta va shogirdlarni o'qitish, xalq amaliy san'ati muzeyi tashkil etish rejada.\n\nSo'na, g'isht, kashtado'zlik, zargarlik — bularning barchasi sizning yordamingiz bilan yashaydi!`,
        category: 'creative', goal: 25000000, region: 'khorezm', endDate: '2026-07-31', cover: COVER_IMAGES.creative_2, status: 'completed',
      },
      {
        creator: 0, title: 'Yetimlar uyi uchun zamonaviy isitish tizimi',
        description: `Navoiy shahridagi yetimlar uyi eskirgan isitish tizimiga ega. Qish kunlarida bolalar sovuqda yashaydilar.\n\nYangi markaziy isitish tizimi o'rnatish, har bir xonada radiatorlar, suv isitish qurilmasi va energiya tejash tizimi o'rnatiladi.\n\nBu yetimlar uyida 80+ bola yashaydi. Ularning iliq muhitda bo'lishi bizning burchimiz.`,
        category: 'community', goal: 60000000, region: 'navoi', endDate: '2026-04-15', cover: COVER_IMAGES.community_3, status: 'active',
      },
      {
        creator: 1, title: 'Qishloqlar uchun mobil tibbiyot klinikasi',
        description: `Andijon viloyatining uzoq qishloqlarida shifokorlar kam. Minglab odamlar kerakli tibbiy yordam olmaydilar.\n\nFull jihozlangan medical bus, umumiy shifokor, pediatr, ginekolog, EKG, ultratovush, laboratoriya va bepul dorilar taqdim etiladi.\n\nBu mobil klinika yiliga 10,000+ qishloq aholisiga xizmat ko'rsatadi.`,
        category: 'medical', goal: 90000000, region: 'andijan', endDate: '2026-08-31', cover: COVER_IMAGES.medical_3, status: 'active',
      },
      {
        creator: 3, title: 'Qurg\'oqchilikdan zarar ko\'rgan fermerlarga yordam',
        description: `Sirdaryo viloyatida qurg'oqchilik tufayli minglab gektar ekinlar nobud bo'ldi. Fermerlar ishsiz qolib, oilalar och qoldi.\n\nUrug'lik va o'g'it taqsimoti, qishloq xo'jaligi texnikasini ijaraga berish, suv tejash texnologiyalari o'rgatish, yangi ekin ekish uchun subsidiyalar ajratiladi.\n\n500+ fermer oilasi bu yordamdan foydalanadi.`,
        category: 'emergency', goal: 75000000, region: 'syrdarya', endDate: '2026-04-30', cover: COVER_IMAGES.other_1, status: 'active',
      },
      {
        creator: 2, title: 'Yoshlar tadbirkorlik dasturi',
        description: `Toshkent viloyatida yosh tadbirkorlarni qo'llab-quvvatlash dasturi.\n\nBiznes trening va mentorlik, boshlang'ich kapital (grant), marketing va reklama yordami, biznes inkubator xizmatlari taqdim etiladi.\n\n18-35 yoshdagi yoshlar uchun mo'ljallangan. 50+ yosh tadbirkor bu dasturdan foydalanadi.`,
        category: 'business', goal: 40000000, region: 'tashkent_region', endDate: '2026-06-30', cover: COVER_IMAGES.business_2, status: 'active',
      },
    ];

    const campaignIds: string[] = [];
    for (let i = 0; i < campaigns.length; i++) {
      const c = campaigns[i]!;
      const result = await client.query(
        `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, current_amount, status, region, is_verified, end_date, cover_image_url)
         VALUES ($1, $2, $3, $4, $5, 0, $6, $7, true, $8, $9) RETURNING id`,
        [userIds[c.creator], c.title, c.description, c.category, c.goal, c.status, c.region, c.endDate, c.cover],
      );
      campaignIds.push(result.rows[0].id);
      log(`  Campaign ${i + 1}: ${c.title.substring(0, 40)}... [${c.status}]`);
    }

    log('Creating admin actions (campaign verifications)...');
    for (let i = 0; i < campaignIds.length; i++) {
      const campaign = campaigns[i]!;
      await client.query(
        `INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 60) + 1} days')`,
        [adminId, 'campaign_approved', 'campaign', campaignIds[i], JSON.stringify({ status: 'active', category: campaign.category })],
      );
    }

    log('Creating campaign documents...');
    const documentTypes = ['medical_report', 'id_document', 'proof_of_residence', 'photo', 'financial_statement'];
    const documentUrls = [
      'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&q=80',
      'https://images.unsplash.com/photo-1576091160550-2187d80a16f3?w=400&q=80',
      'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&q=80',
    ];

    for (let i = 0; i < campaignIds.length; i++) {
      const docCount = 2 + (i % 3);
      for (let d = 0; d < docCount; d++) {
        const docType = documentTypes[d % documentTypes.length]!;
        await client.query(
          `INSERT INTO campaign_documents (campaign_id, document_type, file_url, file_name, file_size, mime_type, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            campaignIds[i],
            docType,
            documentUrls[d % documentUrls.length]!,
            `${docType}_${i + 1}.pdf`,
            Math.floor(Math.random() * 500000) + 50000,
            'application/pdf',
            docType === 'medical_report' ? 'Shifokor ma\'lumotnomasi' : docType === 'id_document' ? 'Pasport nusxasi' : null,
          ],
        );
      }
    }
    log(`  ${campaignIds.length * 2} campaign documents created`);

    log('Creating withdrawal accounts for campaign organizers...');
    const organizerUserIds = [...new Set(campaigns.map(c => c.creator))];
    const withdrawalAccountIds: string[] = [];

    for (const userIdx of organizerUserIds) {
      const provider = WITHDRAWAL_PROVIDERS[userIdx % WITHDRAWAL_PROVIDERS.length]!;
      const encryptedCard = encrypt(`8600${Math.floor(1000000000 + Math.random() * 9000000000)}`);
      const result = await client.query(
        `INSERT INTO withdrawal_accounts (user_id, provider, account_number_encrypted, account_holder_name, is_primary, is_verified)
         VALUES ($1, $2, $3, $4, true, true) RETURNING id`,
        [userIds[userIdx], provider, encryptedCard, usersData[userIdx]!.name],
      );
      withdrawalAccountIds.push(result.rows[0].id);
    }
    log(`  ${withdrawalAccountIds.length} withdrawal accounts created`);

    log('Creating donations (25-35 per campaign)...');
    const amountTiers = [
      10000, 15000, 20000, 25000, 50000, 75000,
      100000, 150000, 200000, 250000, 300000, 500000,
      750000, 1000000, 1500000, 2000000, 2500000, 3000000,
      5000000, 7500000, 10000000,
    ];

    const donationNotes = [
      'Omad tilaymiz!',
      'Barchaga salomatlik tilayman',
      'Yaxshi ish qilayotganingiz uchun rahmat!',
      'Bola salomat bo\'lsin',
      'Yordam uchun tashakkur',
      'Siz bilan birgamiz',
      'Duo qilam sizga',
      null, null, null, null,
    ];

    let totalDonations = 0;
    let totalFees = 0;
    let totalReceipts = 0;

    for (let ci = 0; ci < campaignIds.length; ci++) {
      const campaignId = campaignIds[ci]!;
      const campaignGoal = campaigns[ci]!.goal;
      const campaignStatus = campaigns[ci]!.status;

      const donationCount = 25 + (ci % 11);
      let campaignTotal = 0;

      for (let di = 0; di < donationCount; di++) {
        let donorIdx = (di + ci * 2) % userIds.length;
        if (donorIdx === campaigns[ci]!.creator) {
          donorIdx = (donorIdx + 1) % userIds.length;
        }
        const donorId = userIds[donorIdx]!;
        const donorName = DONOR_NAMES[donorIdx % DONOR_NAMES.length]!;

        const tierIdx = (di * 3 + ci * 7) % amountTiers.length;
        const amount = amountTiers[tierIdx]!;

        const isAnonymous = di % 7 === 0;
        const fee = Math.round(amount * 0.01);
        const netAmount = amount - fee;

        const provider = PAYMENT_PROVIDERS[(di + ci) % PAYMENT_PROVIDERS.length]!;
        
        let status: 'completed' | 'pending' | 'failed' | 'refunded' = 'completed';
        if (di % 15 === 0) status = 'pending';
        else if (di % 20 === 0) status = 'failed';
        else if (di % 25 === 0) status = 'refunded';

        const daysAgo = Math.floor((di * 90) / donationCount);
        const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const completedAt = status === 'completed' ? createdAt : null;

        await client.query(
          `INSERT INTO donations (campaign_id, donor_id, amount, platform_fee, net_amount, payment_provider, payment_transaction_id, status, is_anonymous, donor_display_name, note, created_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            campaignId,
            donorId,
            amount,
            fee,
            netAmount,
            provider,
            `${provider}_txn_${Date.now()}_${di}`,
            status,
            isAnonymous,
            isAnonymous ? null : donorName,
            donationNotes[di % donationNotes.length],
            createdAt,
            completedAt,
          ],
        );

        const donationResult = await client.query(
          `SELECT id FROM donations WHERE campaign_id = $1 AND donor_id = $2 AND amount = $3 ORDER BY created_at DESC LIMIT 1`,
          [campaignId, donorId, amount],
        );

        if (status === 'completed') {
          await client.query(
            `INSERT INTO platform_fees (donation_id, fee_type, amount) VALUES ($1, 'donation', $2)`,
            [donationResult.rows[0].id, fee],
          );
          
          if (di % 3 === 0) {
            await client.query(
              `INSERT INTO donation_receipts (donation_id, file_url) VALUES ($1, $2)`,
              [donationResult.rows[0].id, `https://sahovat.tech/receipts/${donationResult.rows[0].id}.pdf`],
            );
            totalReceipts++;
          }
          
          campaignTotal += netAmount;
          totalFees += fee;
        }
        totalDonations++;
      }

      let finalAmount = campaignTotal;
      if (campaignStatus === 'completed') {
        finalAmount = Math.min(campaignTotal, campaignGoal);
      } else if (campaignStatus === 'active') {
        finalAmount = Math.min(campaignTotal, Math.round(campaignGoal * 0.85));
      }
      
      await client.query(`UPDATE campaigns SET current_amount = $1 WHERE id = $2`, [finalAmount, campaignId]);
    }

    log(`  ${totalDonations} donations created`);
    log(`  ${Math.floor(totalFees > 0 ? totalFees / 1 : 0)} platform fee records created`);
    log(`  ${totalReceipts} donation receipts created`);

    log('Creating withdrawals for successful campaigns...');
    const withdrawalsCreated: { campaignIdx: number; accountIdx: number; amount: number }[] = [];
    
    for (let i = 0; i < campaignIds.length; i++) {
      const campaign = campaigns[i]!;
      if (campaign.status !== 'active' && campaign.status !== 'completed') continue;
      
      const campaignResult = await client.query(`SELECT current_amount FROM campaigns WHERE id = $1`, [campaignIds[i]]);
      const currentAmount = campaignResult.rows[0]?.current_amount || 0;
      if (currentAmount < 1000000) continue;

      const accountIdx = organizerUserIds.indexOf(campaign.creator);
      if (accountIdx === -1) continue;

      const withdrawAmount = Math.floor(currentAmount * (0.3 + Math.random() * 0.4));
      const withdrawFee = Math.round(withdrawAmount * 0.01);
      const netWithdraw = withdrawAmount - withdrawFee;

      const statuses: ('pending' | 'approved' | 'completed')[] = ['completed', 'completed', 'approved', 'pending'];
      const status = statuses[Math.floor(Math.random() * statuses.length)]!;

      const maskedCard = `8600****${String(Math.floor(1000 + Math.random() * 9000))}`;

      const createdAt = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      const reviewedAt = status === 'approved' || status === 'completed' ? new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) : null;
      const completedAt = status === 'completed' ? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) : null;

      await client.query(
        `INSERT INTO withdrawals (campaign_id, organizer_id, withdrawal_account_id, amount, platform_fee, net_amount, status, card_number_masked, cardholder_name, created_at, reviewed_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          campaignIds[i],
          userIds[campaign.creator],
          withdrawalAccountIds[accountIdx],
          withdrawAmount,
          withdrawFee,
          netWithdraw,
          status,
          maskedCard,
          usersData[campaign.creator]!.name,
          createdAt,
          reviewedAt,
          completedAt,
        ],
      );
      
      withdrawalsCreated.push({ campaignIdx: i, accountIdx, amount: withdrawAmount });

      await client.query(
        `INSERT INTO platform_fees (withdrawal_id, fee_type, amount)
         VALUES ((SELECT id FROM withdrawals WHERE campaign_id = $1 ORDER BY created_at DESC LIMIT 1), 'withdrawal', $2)`,
        [campaignIds[i], withdrawFee],
      );
    }
    log(`  ${withdrawalsCreated.length} withdrawals created`);

    log('Creating recurring donations...');
    const recurringDonations = [
      { donorId: userIds[0], campaignId: campaignIds[0], amount: 100000, frequency: 'monthly' },
      { donorId: userIds[1], campaignId: campaignIds[2], amount: 150000, frequency: 'monthly' },
      { donorId: userIds[3], campaignId: campaignIds[5], amount: 200000, frequency: 'monthly' },
      { donorId: userIds[4], campaignId: campaignIds[8], amount: 250000, frequency: 'monthly' },
      { donorId: userIds[2], campaignId: campaignIds[11], amount: 100000, frequency: 'weekly' },
      { donorId: userIds[5], campaignId: campaignIds[0], amount: 50000, frequency: 'monthly' },
      { donorId: userIds[6], campaignId: campaignIds[1], amount: 75000, frequency: 'weekly' },
      { donorId: userIds[7], campaignId: campaignIds[3], amount: 100000, frequency: 'monthly' },
    ];

    for (const rd of recurringDonations) {
      const statuses: ('active' | 'paused')[] = ['active', 'active', 'active', 'paused'];
      const status = statuses[Math.floor(Math.random() * statuses.length)]!;
      
      await client.query(
        `INSERT INTO recurring_donations (donor_id, campaign_id, amount, frequency, status, next_charge_date, last_charge_date)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '1 month', CURRENT_DATE - INTERVAL '1 month')`,
        [rd.donorId, rd.campaignId, rd.amount, rd.frequency, status],
      );
    }
    log(`  ${recurringDonations.length} recurring donations created`);

    log('Creating admin settings...');
    const encryptedCardNumber = encrypt('8600123456789012');
    await client.query(
      `INSERT INTO admin_settings (master_card_number_encrypted, master_card_holder_name, platform_fee_percentage, updated_by)
       VALUES ($1, $2, $3, $4)`,
      [encryptedCardNumber, 'SAHOVAT ADMIN', 1.0, adminId],
    );

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
      { userId: userIds[5], category: 'medical', score: 4.5 },
      { userId: userIds[5], category: 'emergency', score: 3.5 },
      { userId: userIds[6], category: 'community', score: 4.0 },
      { userId: userIds[6], category: 'education', score: 3.5 },
      { userId: userIds[7], category: 'creative', score: 5.0 },
      { userId: userIds[7], category: 'business', score: 2.5 },
      { userId: userIds[8], category: 'medical', score: 3.0 },
      { userId: userIds[8], category: 'community', score: 2.0 },
      { userId: userIds[9], category: 'business', score: 4.5 },
      { userId: userIds[9], category: 'education', score: 3.0 },
      { userId: userIds[10], category: 'emergency', score: 4.5 },
      { userId: userIds[10], category: 'community', score: 3.5 },
      { userId: userIds[11], category: 'creative', score: 3.0 },
      { userId: userIds[11], category: 'education', score: 2.0 },
    ];

    for (const cs of categoryScores) {
      await client.query(
        `INSERT INTO user_category_scores (user_id, category, score, last_interaction_at) VALUES ($1, $2, $3, NOW())`,
        [cs.userId, cs.category, cs.score],
      );
    }
    log(`  ${categoryScores.length} user category scores created`);

    log('Creating user events (views, shares, donations)...');
    const eventTypes = ['campaign_viewed', 'campaign_viewed', 'campaign_viewed', 'campaign_shared', 'donation_initiated', 'donation_completed'] as const;
    const eventSources = ['feed', 'search', 'homepage', 'category', 'recommended'];
    
    let eventsCreated = 0;
    for (let i = 0; i < campaignIds.length; i++) {
      const eventCount = 8 + Math.floor(Math.random() * 10);
      
      for (let e = 0; e < eventCount; e++) {
        const userIdx = Math.floor(Math.random() * userIds.length);
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]!;
        
        const meta: Record<string, unknown> = {};
        if (eventType === 'campaign_viewed') {
          meta.source = eventSources[Math.floor(Math.random() * eventSources.length)]!;
        } else if (eventType === 'donation_completed' || eventType === 'donation_initiated') {
          meta.amount = amountTiers[Math.floor(Math.random() * 10)]!;
          meta.payment_provider = PAYMENT_PROVIDERS[Math.floor(Math.random() * PAYMENT_PROVIDERS.length)]!;
        } else if (eventType === 'campaign_shared') {
          meta.platform = ['telegram', 'facebook', 'whatsapp', 'twitter'][Math.floor(Math.random() * 4)]!;
        }

        await client.query(
          `INSERT INTO user_events (user_id, session_id, event_type, campaign_id, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 60) + 1} hours')`,
          [
            userIds[userIdx],
            `session-${Math.random().toString(36).substring(2, 11)}`,
            eventType,
            campaignIds[i],
            JSON.stringify(meta),
          ],
        );
        eventsCreated++;
      }
    }
    log(`  ${eventsCreated} user events created`);

    await client.query('COMMIT');

    log('========================================');
    log('Seed completed successfully!');
    log(`  Users:             13 (1 admin + 12 regular)`);
    log(`  Campaigns:         ${campaigns.length}`);
    log(`  Donations:         ${totalDonations}`);
    log(`  Platform fees:     ${totalFees}`);
    log(`  Donation receipts: ${totalReceipts}`);
    log(`  Withdrawals:       ${withdrawalsCreated.length}`);
    log(`  Withdrawal accts:  ${withdrawalAccountIds.length}`);
    log(`  Recurring:         ${recurringDonations.length}`);
    log(`  Category scores:  ${categoryScores.length}`);
    log(`  User events:      ${eventsCreated}`);
    log(`  Admin actions:     ${userVerificationActions.length + campaigns.length}`);
    log(`  Campaign docs:     ${campaignIds.length * 2}`);
    log(`  Admin settings:    1`);
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
