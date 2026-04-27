import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../../src/config/database.js', () => {
  const query = vi.fn();
  return {
    query,
    pool: {
      query: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
    },
    getClient: vi.fn(),
  };
});

vi.mock('../../../../src/config/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
  },
}));

vi.mock('../../../../src/modules/donations/ledger.service.js', () => ({
  getTotalEscrow: vi.fn(),
  getPlatformRevenue: vi.fn(),
}));

import { query } from '../../../../src/config/database.js';
import { redis } from '../../../../src/config/redis.js';
import {
  getTotalEscrow,
  getPlatformRevenue,
} from '../../../../src/modules/donations/ledger.service.js';
import {
  getPublicStats,
  invalidatePublicStatsCache,
} from '../../../../src/modules/public/public.service.js';

const queryMock = query as unknown as ReturnType<typeof vi.fn>;
const redisGet = redis.get as unknown as ReturnType<typeof vi.fn>;
const redisSet = redis.set as unknown as ReturnType<typeof vi.fn>;
const redisDel = redis.del as unknown as ReturnType<typeof vi.fn>;
const escrowMock = getTotalEscrow as unknown as ReturnType<typeof vi.fn>;
const feesMock = getPlatformRevenue as unknown as ReturnType<typeof vi.fn>;

describe('publicService.getPublicStats', () => {
  beforeEach(() => {
    queryMock.mockReset();
    redisGet.mockReset();
    redisSet.mockReset();
    redisDel.mockReset();
    escrowMock.mockReset();
    feesMock.mockReset();
  });

  it('returns cached stats and skips DB on cache hit', async () => {
    const cached = {
      active_campaigns: 7,
      total_campaigns: 10,
      completed_donations_count: 99,
      total_donated_amount: 1_000_000,
      total_withdrawn_amount: 500_000,
      verified_organizers: 4,
      recent_verifications_30d: 1,
      platform_fee_total: 20_000,
      generated_at: '2026-01-01T00:00:00Z',
    };
    redisGet.mockResolvedValue(JSON.stringify(cached));

    const result = await getPublicStats();

    expect(result).toEqual(cached);
    expect(queryMock).not.toHaveBeenCalled();
    expect(escrowMock).not.toHaveBeenCalled();
    expect(feesMock).not.toHaveBeenCalled();
  });

  it('computes fresh stats and writes them to cache on cache miss', async () => {
    redisGet.mockResolvedValue(null);
    queryMock.mockResolvedValue({
      rows: [
        {
          active_campaigns: 3,
          total_campaigns: 5,
          completed_donations_count: 12,
          verified_organizers: 2,
          recent_verifications_30d: 1,
        },
      ],
    });
    escrowMock.mockResolvedValue({
      total_escrow: 100,
      total_donated: 200,
      total_withdrawn: 100,
    });
    feesMock.mockResolvedValue({ total: 50, from_donations: 50, from_withdrawals: 0 });
    redisSet.mockResolvedValue('OK');

    const result = await getPublicStats();

    expect(result.active_campaigns).toBe(3);
    expect(result.total_donated_amount).toBe(200);
    expect(result.total_withdrawn_amount).toBe(100);
    expect(result.platform_fee_total).toBe(50);
    expect(redisSet).toHaveBeenCalledTimes(1);
    const [key, , mode, ttl] = redisSet.mock.calls[0] as [string, string, string, number];
    expect(key).toBe('public:stats:v1');
    expect(mode).toBe('EX');
    expect(ttl).toBe(300);
  });

  it('still computes fresh stats when Redis read throws', async () => {
    redisGet.mockRejectedValue(new Error('redis down'));
    queryMock.mockResolvedValue({
      rows: [
        {
          active_campaigns: 1,
          total_campaigns: 1,
          completed_donations_count: 0,
          verified_organizers: 0,
          recent_verifications_30d: 0,
        },
      ],
    });
    escrowMock.mockResolvedValue({ total_escrow: 0, total_donated: 0, total_withdrawn: 0 });
    feesMock.mockResolvedValue({ total: 0, from_donations: 0, from_withdrawals: 0 });
    redisSet.mockResolvedValue('OK');

    const result = await getPublicStats();
    expect(result.active_campaigns).toBe(1);
  });

  it('invalidatePublicStatsCache deletes the cache key', async () => {
    redisDel.mockResolvedValue(1);
    await invalidatePublicStatsCache();
    expect(redisDel).toHaveBeenCalledWith('public:stats:v1');
  });
});
