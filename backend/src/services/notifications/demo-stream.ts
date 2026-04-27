/**
 * Demo Notifications Console — Redis pub/sub bridge.
 *
 * The Mock SMS, Telegram, and Email services publish a small redacted
 * payload to this channel whenever they would have sent a real message.
 * The dev SSE route subscribes and forwards events to the floating
 * frontend console. All gated by env.DEMO_CONSOLE_ENABLED — when off,
 * `publishMockNotification` is a no-op.
 *
 * Spec: roadmap_short.md §10 task 5.10 + Appendix C.
 */

import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';

export const DEMO_STREAM_CHANNEL = 'notifications:demo-stream';

export type DemoChannel = 'sms' | 'telegram' | 'email';

export interface DemoStreamPayload {
  channel: DemoChannel;
  /** Masked recipient: `+998***1800`, `@user_xyz`, `m***@example.com` */
  recipient: string;
  /** Email-only: subject line. Omitted for sms/telegram. */
  subject?: string;
  /** First ~80 chars of body (or full text for short SMS). */
  preview: string;
  /** ISO 8601 server-side timestamp. */
  timestamp: string;
}

/**
 * Mask a phone number to `+998***1800` form (preserve country + last 4).
 */
function maskPhone(phone: string): string {
  if (!phone) return '***';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '***';
  const tail = digits.slice(-4);
  // Keep up to the first 3 digits ("998" for UZ) for visual reference.
  const head = digits.length > 7 ? digits.slice(0, 3) : '';
  return head ? `+${head}***${tail}` : `***${tail}`;
}

/**
 * Mask an email address to `m***@example.com`.
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const lead = local.slice(0, 1) || '*';
  return `${lead}***@${domain}`;
}

/**
 * Mask a Telegram chat_id or @username — chat_ids are numeric and not PII
 * but we still trim them for a clean console row.
 */
function maskTelegram(chatIdOrUsername: string): string {
  if (!chatIdOrUsername) return '***';
  if (chatIdOrUsername.startsWith('@')) {
    const handle = chatIdOrUsername.slice(1);
    if (handle.length <= 4) return chatIdOrUsername;
    return `@${handle.slice(0, 3)}***`;
  }
  // Numeric chat_id — show last 4 digits only.
  const tail = chatIdOrUsername.slice(-4);
  return `chat_***${tail}`;
}

export const mask = { phone: maskPhone, email: maskEmail, telegram: maskTelegram };

/**
 * Publish a redacted notification preview to the Redis pub/sub channel.
 * No-op when the demo console is disabled. Failures are logged but never
 * propagate — instrumentation must not break production sends.
 */
export async function publishMockNotification(
  payload: Omit<DemoStreamPayload, 'timestamp'>,
): Promise<void> {
  if (!env.DEMO_CONSOLE_ENABLED) return;

  const enriched: DemoStreamPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
  };

  try {
    await redis.publish(DEMO_STREAM_CHANNEL, JSON.stringify(enriched));
  } catch (err) {
    console.warn(
      `[Sahovat] [demo-stream] failed to publish to ${DEMO_STREAM_CHANNEL}:`,
      (err as Error).message,
    );
  }
}

/**
 * Truncate a body to the first 80 characters for the preview row, with
 * newlines collapsed to spaces.
 */
export function truncatePreview(body: string, max = 80): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
