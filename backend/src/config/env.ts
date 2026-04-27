import { z } from 'zod';

const isDev = (process.env['NODE_ENV'] ?? 'development') !== 'production';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z
    .string()
    .default('postgresql://sahovat:sahovat@localhost:5433/sahovat'),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: isDev
    ? z.string().min(32).default('dev-jwt-secret-min-32-characters-long!!')
    : z.string().min(32),

  JWT_REFRESH_SECRET: isDev
    ? z.string().min(32).default('dev-jwt-refresh-secret-32-chars-long!!')
    : z.string().min(32),

  ENCRYPTION_KEY: isDev
    ? z
        .string()
        .regex(/^[0-9a-fA-F]{64}$/, 'Must be exactly 64 hex characters')
        .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
    : z.string().regex(/^[0-9a-fA-F]{64}$/, 'Must be exactly 64 hex characters'),

  SMS_API_URL: z.string().default('https://notify.eskiz.uz'),
  SMS_API_EMAIL: z.string().optional().default(''),
  SMS_API_PASSWORD: z.string().optional().default(''),
  // When 'true', EskizSmsService sends the literal pre-approved test
  // template ("This is test from Eskiz") for ALL messages. Required while
  // the account is unverified (no PINFL / business registration); custom
  // templates are rejected by Eskiz. OTP codes are still generated and
  // logged server-side — read them from `docker logs sahovat_backend`
  // or the API response in DevTools during demo. Flip to 'false' once
  // Eskiz template moderation is approved.
  SMS_ESKIZ_TEST_MODE: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((v) => v === 'true' || v === '1'),

  PAYME_MERCHANT_ID: z.string().optional().default(''),
  PAYME_KEY: z.string().optional().default(''),
  PAYME_SANDBOX: z
    .enum(['true', 'false', '1', '0'])
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  PAYME_SUBSCRIBE_URL: z.string().default('https://checkout.test.paycom.uz/api'),

  CLICK_SERVICE_ID: z.string().optional().default(''),
  CLICK_MERCHANT_ID: z.string().optional().default(''),
  CLICK_SECRET_KEY: z.string().optional().default(''),
  CLICK_MERCHANT_USER_ID: z.string().optional().default(''),
  CLICK_CHECKOUT_URL: z.string().default('https://my.click.uz/services/pay'),
  PAYMENT_PROVIDER_CLICK: z
    .enum(['mock', 'real'])
    .default('mock'),

  PUBLIC_STORAGE_PATH: z.string().default('./storage/public'),
  PRIVATE_STORAGE_PATH: z.string().default('./storage/private'),
  PUBLIC_STORAGE_URL: z.string().default('http://localhost:3001/storage'),

  FRONTEND_URL: z.string().default('http://localhost:3000'),

  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_LOCKOUT_SECONDS: z.coerce.number().int().positive().default(900),

  ONEID_CLIENT_ID: z.string().default('mock_client_id'),
  ONEID_CLIENT_SECRET: z.string().default('mock_client_secret'),
  ONEID_REDIRECT_URI: z.string().default('http://localhost:3001/api/users/oneid/callback'),
  ONEID_ENABLED: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((v) => v === 'true' || v === '1'),

  // ============================================================
  // Telegram Login Widget + Bot
  // ============================================================
  // Token issued by @BotFather. Required for HMAC verification of
  // Login Widget payloads. Empty string in dev = Telegram path disabled.
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  // Public username (without @) — used by frontend widget config too.
  TELEGRAM_BOT_USERNAME: z.string().optional().default('SahovatTechBot'),
  // Bot notifications: 'real' uses api.telegram.org/sendMessage; 'mock' logs only.
  TELEGRAM_PROVIDER: z.enum(['real', 'mock']).default('mock'),
  TELEGRAM_API_BASE: z.string().default('https://api.telegram.org'),
  // Optional admin chat/group id — when set, admin alerts are pushed there.
  TELEGRAM_ADMIN_CHAT_ID: z.string().optional().default(''),
  // Shared secret for incoming /api/telegram/webhook requests.
  TELEGRAM_WEBHOOK_SECRET: z.string().optional().default(''),

  // ============================================================
  // Email (Resend)
  // ============================================================
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM_ADDRESS: z.string().default('notifications@sahovat.tech'),
  EMAIL_FROM_NAME: z.string().default('Sahovat'),
  EMAIL_REPLY_TO: z.string().default('support@sahovat.tech'),
  EMAIL_PROVIDER: z.enum(['resend', 'mock']).default('mock'),
  APP_BASE_URL: z.string().default('http://localhost:3000'),

  // ============================================================
  // Notification dispatcher
  // ============================================================
  NOTIFICATION_QUEUE_TICK_MS: z.coerce.number().int().positive().default(10000),
  NOTIFICATION_RETRY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),

  // ============================================================
  // Demo Notifications Console (Week 5 task 5.10)
  // ============================================================
  // When 'true', enables:
  //   - Mock SMS/Telegram/Email services to publish a redacted preview
  //     to the Redis pub/sub channel `notifications:demo-stream`.
  //   - GET /api/dev/notifications-stream (SSE) to subscribe to that channel.
  // Production-safe: defaults to 'false'; the dev route 404s when this is
  // not 'true', and the mock-service publish is a no-op.
  DEMO_CONSOLE_ENABLED: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
}).refine(
  (data) => {
    // In production, if OneID is enabled, ONEID_CLIENT_SECRET must be explicitly set
    if (data.NODE_ENV === 'production' && data.ONEID_ENABLED) {
      return data.ONEID_CLIENT_SECRET !== 'mock_client_secret' && data.ONEID_CLIENT_SECRET.length > 0;
    }
    return true;
  },
  { message: 'ONEID_CLIENT_SECRET must be set when ONEID_ENABLED is true in production', path: ['ONEID_CLIENT_SECRET'] },
).refine(
  (data) => {
    // In production, if EMAIL_PROVIDER=resend, RESEND_API_KEY must be set.
    if (data.NODE_ENV === 'production' && data.EMAIL_PROVIDER === 'resend') {
      return data.RESEND_API_KEY.length > 0;
    }
    return true;
  },
  { message: 'RESEND_API_KEY must be set when EMAIL_PROVIDER=resend in production', path: ['RESEND_API_KEY'] },
).refine(
  (data) => {
    // In production, if PAYMENT_PROVIDER_CLICK=real, Click credentials must be set.
    if (data.NODE_ENV === 'production' && data.PAYMENT_PROVIDER_CLICK === 'real') {
      return (
        data.CLICK_SECRET_KEY.length > 0 &&
        data.CLICK_SERVICE_ID.length > 0 &&
        data.CLICK_MERCHANT_ID.length > 0
      );
    }
    return true;
  },
  { message: 'CLICK_SECRET_KEY, CLICK_SERVICE_ID, and CLICK_MERCHANT_ID must be set when PAYMENT_PROVIDER_CLICK=real in production', path: ['CLICK_SECRET_KEY'] },
).refine(
  (data) => {
    // In production, if TELEGRAM_PROVIDER=real, TELEGRAM_BOT_TOKEN must be set.
    if (data.NODE_ENV === 'production' && data.TELEGRAM_PROVIDER === 'real') {
      return data.TELEGRAM_BOT_TOKEN.length > 0;
    }
    return true;
  },
  { message: 'TELEGRAM_BOT_TOKEN must be set when TELEGRAM_PROVIDER=real in production', path: ['TELEGRAM_BOT_TOKEN'] },
);

export type Env = z.infer<typeof envSchema>;

export const env: Env = (() => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('[Sahovat] Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
})();
