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
  SMS_API_EMAIL: isDev ? z.string().optional().default('') : z.string().min(1),
  SMS_API_PASSWORD: isDev ? z.string().optional().default('') : z.string().min(1),

  PAYME_MERCHANT_ID: isDev ? z.string().optional().default('') : z.string().min(1),
  PAYME_KEY: isDev ? z.string().optional().default('') : z.string().min(1),
  PAYME_SANDBOX: z
    .enum(['true', 'false', '1', '0'])
    .default('true')
    .transform((v) => v === 'true' || v === '1'),

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
  ONEID_ENABLED: z.coerce.boolean().default(false),
});

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
