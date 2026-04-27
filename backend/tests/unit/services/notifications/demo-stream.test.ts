import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock both the redis client and the env module before importing the
// system under test so the env flag and publish behavior are observable.
// vi.hoisted lets the mocks share state with the top-level scope while
// still being hoisted above the imports.

const hoisted = vi.hoisted(() => ({
  envState: { DEMO_CONSOLE_ENABLED: false },
  publishMock: vi.fn(async () => 1),
  quitMock: vi.fn(async () => 'OK'),
}));

vi.mock('../../../../src/config/redis.js', () => ({
  redis: {
    publish: hoisted.publishMock,
    quit: hoisted.quitMock,
  },
}));

vi.mock('../../../../src/config/env.js', () => ({
  env: hoisted.envState,
}));

import {
  DEMO_STREAM_CHANNEL,
  mask,
  publishMockNotification,
  truncatePreview,
} from '../../../../src/services/notifications/demo-stream.js';

describe('demo-stream', () => {
  beforeEach(() => {
    hoisted.publishMock.mockClear();
    hoisted.publishMock.mockImplementation(async () => 1);
    hoisted.envState.DEMO_CONSOLE_ENABLED = false;
  });

  describe('mask helpers', () => {
    it('masks a phone number to country prefix + last 4', () => {
      expect(mask.phone('+998947981800')).toBe('+998***1800');
      expect(mask.phone('+998900000010')).toBe('+998***0010');
    });

    it('returns *** for absent phone', () => {
      expect(mask.phone('')).toBe('***');
      expect(mask.phone('123')).toBe('***');
    });

    it('masks an email to first-letter + domain', () => {
      expect(mask.email('malika@example.com')).toBe('m***@example.com');
      expect(mask.email('a@b.c')).toBe('a***@b.c');
    });

    it('returns *** for invalid email', () => {
      expect(mask.email('not-an-email')).toBe('***');
      expect(mask.email('')).toBe('***');
    });

    it('masks an @username and a numeric chat_id distinctly', () => {
      expect(mask.telegram('@malikahon_v')).toBe('@mal***');
      expect(mask.telegram('1599285081')).toBe('chat_***5081');
    });
  });

  describe('truncatePreview', () => {
    it('returns the full string when under the limit', () => {
      expect(truncatePreview('hello world')).toBe('hello world');
    });

    it('collapses whitespace and truncates with ellipsis', () => {
      const long = 'a'.repeat(100);
      const out = truncatePreview(long, 20);
      expect(out).toHaveLength(20);
      expect(out.endsWith('…')).toBe(true);
    });

    it('flattens newlines into spaces', () => {
      expect(truncatePreview('line one\nline two')).toBe('line one line two');
    });
  });

  describe('publishMockNotification', () => {
    it('is a no-op when DEMO_CONSOLE_ENABLED is false', async () => {
      hoisted.envState.DEMO_CONSOLE_ENABLED = false;
      await publishMockNotification({
        channel: 'sms',
        recipient: '+998***1800',
        preview: 'test',
      });
      expect(hoisted.publishMock).not.toHaveBeenCalled();
    });

    it('publishes JSON payload to the demo stream channel when enabled', async () => {
      hoisted.envState.DEMO_CONSOLE_ENABLED = true;
      await publishMockNotification({
        channel: 'email',
        recipient: 'm***@example.com',
        subject: 'Your donation receipt',
        preview: 'Thanks for your donation',
      });
      expect(hoisted.publishMock).toHaveBeenCalledTimes(1);
      const [channel, body] = hoisted.publishMock.mock.calls[0]!;
      expect(channel).toBe(DEMO_STREAM_CHANNEL);
      const parsed = JSON.parse(body as string);
      expect(parsed.channel).toBe('email');
      expect(parsed.recipient).toBe('m***@example.com');
      expect(parsed.subject).toBe('Your donation receipt');
      expect(parsed.preview).toBe('Thanks for your donation');
      expect(typeof parsed.timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(parsed.timestamp))).toBe(false);
    });

    it('swallows publish errors', async () => {
      hoisted.envState.DEMO_CONSOLE_ENABLED = true;
      hoisted.publishMock.mockRejectedValueOnce(new Error('redis down'));
      await expect(
        publishMockNotification({
          channel: 'telegram',
          recipient: '@mal***',
          preview: 'oops',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
