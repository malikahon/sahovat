import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationChannel } from '../../../../src/types/entities.js';

// Mock the database query function so we don't need real DB access here.
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

// Mock the channel adapters.
vi.mock('../../../../src/services/notifications/channels.js', () => ({
  sendSms: vi.fn(),
  sendTelegram: vi.fn(),
  sendEmail: vi.fn(),
}));

// Mock the queue.
vi.mock('../../../../src/services/notifications/queue.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../src/services/notifications/queue.js')
  >('../../../../src/services/notifications/queue.js');
  return {
    ...actual,
    enqueue: vi.fn().mockResolvedValue(undefined),
  };
});

import { query } from '../../../../src/config/database.js';
import {
  sendSms,
  sendTelegram,
  sendEmail,
} from '../../../../src/services/notifications/channels.js';
import { enqueue } from '../../../../src/services/notifications/queue.js';
import { dispatch } from '../../../../src/services/notifications/dispatcher.js';

const queryMock = query as unknown as ReturnType<typeof vi.fn>;
const smsMock = sendSms as unknown as ReturnType<typeof vi.fn>;
const tgMock = sendTelegram as unknown as ReturnType<typeof vi.fn>;
const emailMock = sendEmail as unknown as ReturnType<typeof vi.fn>;
const enqueueMock = enqueue as unknown as ReturnType<typeof vi.fn>;

interface MockUser {
  id: string;
  phone_number: string | null;
  telegram_id: string | null;
  email: string | null;
  email_verified_at: string | null;
  language_preference: string;
}

function setupQuery(user: MockUser | null, channels: NotificationChannel[]) {
  queryMock.mockReset();
  // Return user on first call, prefs on second.
  queryMock.mockImplementationOnce(async () => ({
    rows: user ? [user] : [],
  }));
  queryMock.mockImplementationOnce(async () => ({
    rows: channels.map((c) => ({ channel: c })),
  }));
}

const baseUser: MockUser = {
  id: 'u1',
  phone_number: '+998900000099',
  telegram_id: '123456789',
  email: 'alice@example.com',
  email_verified_at: '2026-01-01T00:00:00Z',
  language_preference: 'en',
};

const samplePayload = {
  donationId: 'd1',
  campaignId: 'c1',
  campaignTitle: 'Test campaign',
  amount: 50_000,
  donorName: 'Alice',
};

describe('dispatcher', () => {
  beforeEach(() => {
    smsMock.mockReset();
    tgMock.mockReset();
    emailMock.mockReset();
    enqueueMock.mockReset();
    enqueueMock.mockResolvedValue(undefined);
  });

  it('returns immediately when user not found', async () => {
    setupQuery(null, []);
    const result = await dispatch({
      user_id: 'missing',
      event_type: 'donation_completed',
      payload: samplePayload,
    });
    expect(result.attempted).toEqual([]);
    expect(smsMock).not.toHaveBeenCalled();
  });

  it('dispatches to all enabled+deliverable channels in parallel', async () => {
    setupQuery(baseUser, [
      NotificationChannel.SMS,
      NotificationChannel.TELEGRAM,
      NotificationChannel.EMAIL,
    ]);
    smsMock.mockResolvedValue(undefined);
    tgMock.mockResolvedValue(undefined);
    emailMock.mockResolvedValue(undefined);

    const result = await dispatch({
      user_id: 'u1',
      event_type: 'donation_completed',
      payload: samplePayload,
    });

    expect(result.attempted).toEqual([
      NotificationChannel.SMS,
      NotificationChannel.TELEGRAM,
      NotificationChannel.EMAIL,
    ]);
    expect(result.skipped).toEqual([]);
    expect(result.enqueued).toEqual([]);
    expect(smsMock).toHaveBeenCalledTimes(1);
    expect(tgMock).toHaveBeenCalledTimes(1);
    expect(emailMock).toHaveBeenCalledTimes(1);
  });

  it('skips email when user has no email at all', async () => {
    setupQuery(
      { ...baseUser, email: null, email_verified_at: null },
      [NotificationChannel.SMS, NotificationChannel.EMAIL],
    );
    smsMock.mockResolvedValue(undefined);

    const result = await dispatch({
      user_id: 'u1',
      event_type: 'donation_completed',
      payload: samplePayload,
    });

    expect(result.attempted).toEqual([NotificationChannel.SMS]);
    expect(result.skipped).toEqual([NotificationChannel.EMAIL]);
    expect(emailMock).not.toHaveBeenCalled();
  });

  it('skips email when user has email but it is unverified', async () => {
    setupQuery(
      { ...baseUser, email_verified_at: null },
      [NotificationChannel.EMAIL],
    );

    const result = await dispatch({
      user_id: 'u1',
      event_type: 'donation_completed',
      payload: samplePayload,
    });

    expect(result.skipped).toContain(NotificationChannel.EMAIL);
    expect(emailMock).not.toHaveBeenCalled();
  });

  it('skips telegram when user has no telegram_id', async () => {
    setupQuery(
      { ...baseUser, telegram_id: null },
      [NotificationChannel.TELEGRAM],
    );

    const result = await dispatch({
      user_id: 'u1',
      event_type: 'donation_completed',
      payload: samplePayload,
    });

    expect(result.skipped).toContain(NotificationChannel.TELEGRAM);
    expect(tgMock).not.toHaveBeenCalled();
  });

  it('skips sms when user has no phone', async () => {
    setupQuery(
      { ...baseUser, phone_number: null },
      [NotificationChannel.SMS],
    );

    const result = await dispatch({
      user_id: 'u1',
      event_type: 'donation_completed',
      payload: samplePayload,
    });

    expect(result.skipped).toContain(NotificationChannel.SMS);
    expect(smsMock).not.toHaveBeenCalled();
  });

  it('returns early with warn when zero deliverable channels remain', async () => {
    setupQuery(
      { ...baseUser, phone_number: null, telegram_id: null, email_verified_at: null },
      [
        NotificationChannel.SMS,
        NotificationChannel.TELEGRAM,
        NotificationChannel.EMAIL,
      ],
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await dispatch({
      user_id: 'u1',
      event_type: 'donation_completed',
      payload: samplePayload,
    });

    expect(result.attempted).toEqual([]);
    expect(result.skipped.length).toBe(3);
    expect(warnSpy).toHaveBeenCalled();
    const message = warnSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(message).toContain('no_deliverable_channels');

    warnSpy.mockRestore();
  });

  it('one channel failing does not block others, and the failing channel is enqueued', async () => {
    setupQuery(baseUser, [
      NotificationChannel.SMS,
      NotificationChannel.TELEGRAM,
      NotificationChannel.EMAIL,
    ]);
    smsMock.mockRejectedValueOnce(new Error('eskiz down'));
    tgMock.mockResolvedValue(undefined);
    emailMock.mockResolvedValue(undefined);

    const result = await dispatch({
      user_id: 'u1',
      event_type: 'donation_completed',
      payload: samplePayload,
    });

    expect(result.attempted).toEqual([
      NotificationChannel.SMS,
      NotificationChannel.TELEGRAM,
      NotificationChannel.EMAIL,
    ]);
    expect(result.enqueued).toEqual([NotificationChannel.SMS]);
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const job = enqueueMock.mock.calls[0][0];
    expect(job.channel).toBe(NotificationChannel.SMS);
    expect(job.attempt).toBe(2);
    expect(tgMock).toHaveBeenCalledTimes(1);
    expect(emailMock).toHaveBeenCalledTimes(1);
  });

  it('only attempts channels listed in user preferences', async () => {
    setupQuery(baseUser, [NotificationChannel.TELEGRAM]);
    tgMock.mockResolvedValue(undefined);

    const result = await dispatch({
      user_id: 'u1',
      event_type: 'donation_completed',
      payload: samplePayload,
    });

    expect(result.attempted).toEqual([NotificationChannel.TELEGRAM]);
    expect(smsMock).not.toHaveBeenCalled();
    expect(emailMock).not.toHaveBeenCalled();
  });
});
