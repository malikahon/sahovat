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

  PAYME_MERCHANT_ID: z.string().optional().default(''),
  PAYME_KEY: z.string().optional().default(''),
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
  ONEID_ENABLED: z
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
