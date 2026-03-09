import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new Redis.default(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  lazyConnect: false,
});

redis.on('connect', () => {
  console.log('[Sahovat] Redis connected');
});

redis.on('error', (err: Error) => {
  console.error('[Sahovat] Redis connection error:', err.message);
});

redis.on('close', () => {
  console.log('[Sahovat] Redis connection closed');
});
