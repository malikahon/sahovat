import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'sahovat',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // OTP
  otp: {
    expiresIn: parseInt(process.env.OTP_EXPIRES_IN || '300', 10), // 5 minutes
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
  },

  // File upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    maxFiles: parseInt(process.env.MAX_FILES || '15', 10),
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },

  // Platform
  platform: {
    feePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '1'), // 1%
    kycThreshold: parseInt(process.env.KYC_THRESHOLD || '3000000', 10), // 3,000,000 UZS
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'sahovat-encryption-key-change-in-production-32c',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
};
