import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { redis } from '../../../../src/config/redis.js';
import {
  enqueue,
  tick,
  queueSize,
  clearQueue,
  backoffMs,
  dispatchJob,
} from '../../../../src/services/notifications/queue.js';
import { NotificationChannel } from '../../../../src/types/entities.js';

// Mock the channel adapters so we can control success/failure precisely.
vi.mock('../../../../src/services/notifications/channels.js', () => {
  return {
    sendSms: vi.fn(),
    sendTelegram: vi.fn(),
    sendEmail: vi.fn(),
  };
});

import {
  sendSms,
  sendTelegram,
  sendEmail,
} from '../../../../src/services/notifications/channels.js';

const mockedSms = sendSms as unknown as ReturnType<typeof vi.fn>;
const mockedTelegram = sendTelegram as unknown as ReturnType<typeof vi.fn>;
const mockedEmail = sendEmail as unknown as ReturnType<typeof vi.fn>;

function makeJobInput() {
  return {
    user_id: '00000000-0000-0000-0000-000000000099',
    event_type: 'donation_completed' as const,
    channel: NotificationChannel.SMS,
    recipient: '+998900000099',
    payload: {
      donationId: 'd1',
      campaignId: 'c1',
      campaignTitle: 'Test',
      amount: 50_000,
      donorName: 'Alice',
    },
    locale: 'en',
    attempt: 2,
    maxAttempts: 3,
  };
}

describe('notification queue', () => {
  beforeEach(async () => {
    await clearQueue();
    mockedSms.mockReset();
    mockedTelegram.mockReset();
    mockedEmail.mockReset();
  });

  afterEach(async () => {
    await clearQueue();
  });

  describe('backoffMs', () => {
    it('30s for attempt 2', () => {
      expect(backoffMs(2)).toBe(30_000);
    });
    it('2m for attempt 3', () => {
      expect(backoffMs(3)).toBe(120_000);
    });
    it('10m for attempt 4 and beyond', () => {
      expect(backoffMs(4)).toBe(600_000);
      expect(backoffMs(99)).toBe(600_000);
    });
  });

  describe('enqueue + queueSize', () => {
    it('adds a job and increments size', async () => {
      await enqueue(makeJobInput(), Date.now());
      expect(await queueSize()).toBe(1);
    });

    it('two enqueues with same payload create two distinct jobs', async () => {
      const now = Date.now();
      await enqueue(makeJobInput(), now);
      await enqueue(makeJobInput(), now);
      expect(await queueSize()).toBe(2);
    });
  });

  describe('tick — happy path', () => {
    it('processes a due job and removes it from the queue', async () => {
      mockedSms.mockResolvedValueOnce(undefined);
      await enqueue(makeJobInput(), Date.now() - 1000);

      const result = await tick();

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.dropped).toBe(0);
      expect(await queueSize()).toBe(0);
      expect(mockedSms).toHaveBeenCalledTimes(1);
    });

    it('does not process jobs scheduled in the future', async () => {
      mockedSms.mockResolvedValue(undefined);
      await enqueue(makeJobInput(), Date.now() + 60_000);

      const result = await tick();

      expect(result.processed).toBe(0);
      expect(await queueSize()).toBe(1);
      expect(mockedSms).not.toHaveBeenCalled();
    });
  });

  describe('tick — retry on failure', () => {
    it('re-enqueues with backoff when send throws and attempts remain', async () => {
      mockedSms.mockRejectedValueOnce(new Error('transient'));
      await enqueue(makeJobInput(), Date.now() - 1000);

      const before = Date.now();
      const result = await tick();
      const after = Date.now();

      expect(result.failed).toBe(1);
      expect(result.dropped).toBe(0);
      expect(await queueSize()).toBe(1);

      // The new score should be roughly now + backoffMs(3) = 2m.
      const entries = await redis.zrange('notifications:retry-queue', 0, -1, 'WITHSCORES');
      expect(entries.length).toBe(2); // member + score
      const score = Number(entries[1]);
      expect(score).toBeGreaterThanOrEqual(before + 120_000 - 1000);
      expect(score).toBeLessThanOrEqual(after + 120_000 + 1000);
    });

    it('drops the job when max attempts is reached', async () => {
      mockedSms.mockRejectedValueOnce(new Error('persistent'));
      const job = makeJobInput();
      job.attempt = 3; // already at max — next failure drops
      job.maxAttempts = 3;
      await enqueue(job, Date.now() - 1000);

      const result = await tick();
      expect(result.dropped).toBe(1);
      expect(result.failed).toBe(0);
      expect(await queueSize()).toBe(0);
    });
  });

  describe('atomic pop', () => {
    it('two concurrent ticks do not process the same job twice', async () => {
      mockedSms.mockResolvedValue(undefined);
      const now = Date.now();
      // enqueue 5 due jobs
      for (let i = 0; i < 5; i++) {
        await enqueue(makeJobInput(), now - 1000);
      }
      const [a, b] = await Promise.all([tick(), tick()]);
      expect(a.processed + b.processed).toBe(5);
      expect(await queueSize()).toBe(0);
      expect(mockedSms).toHaveBeenCalledTimes(5);
    });
  });

  describe('dispatchJob', () => {
    it('routes SMS jobs to sendSms', async () => {
      mockedSms.mockResolvedValueOnce(undefined);
      await dispatchJob({
        ...makeJobInput(),
        id: 'jid',
        enqueuedAt: Date.now(),
      });
      expect(mockedSms).toHaveBeenCalledTimes(1);
      expect(mockedTelegram).not.toHaveBeenCalled();
      expect(mockedEmail).not.toHaveBeenCalled();
    });

    it('routes Telegram jobs to sendTelegram', async () => {
      mockedTelegram.mockResolvedValueOnce(undefined);
      await dispatchJob({
        ...makeJobInput(),
        id: 'jid',
        enqueuedAt: Date.now(),
        channel: NotificationChannel.TELEGRAM,
        recipient: '12345',
      });
      expect(mockedTelegram).toHaveBeenCalledTimes(1);
    });

    it('routes Email jobs to sendEmail', async () => {
      mockedEmail.mockResolvedValueOnce(undefined);
      await dispatchJob({
        ...makeJobInput(),
        id: 'jid',
        enqueuedAt: Date.now(),
        channel: NotificationChannel.EMAIL,
        recipient: 'a@b.com',
      });
      expect(mockedEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe('tick — malformed entries', () => {
    it('drops malformed JSON without throwing', async () => {
      await redis.zadd('notifications:retry-queue', Date.now() - 1000, 'not-json{');
      const result = await tick();
      expect(result.dropped).toBe(1);
      expect(await queueSize()).toBe(0);
    });
  });
});
