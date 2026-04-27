import { randomUUID } from 'node:crypto';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { NotificationChannel, type NotificationEventType } from '../../types/entities.js';
import type { EventPayload } from './events.js';
import { sendSms, sendTelegram, sendEmail } from './channels.js';

/**
 * Redis ZSET-based notification retry queue.
 *
 * Schema:
 *   key:    notifications:retry-queue
 *   score:  unix-ms `runAt` (when this job becomes due)
 *   member: serialized job JSON (each job is unique because it includes a uuid)
 *
 * The dispatcher tries to send synchronously first. On failure (or for
 * higher-attempt retries), it enqueues a job with the appropriate delay.
 * `tick()` is called from scheduler.service.ts every NOTIFICATION_QUEUE_TICK_MS.
 *
 * Atomicity: a Lua script does ZRANGEBYSCORE + ZREM + ZADD-or-drop in one
 * round-trip so concurrent ticks (or a tick racing a manual fire) cannot
 * deliver the same job twice.
 */

const QUEUE_KEY = 'notifications:retry-queue';
const TICK_BATCH_SIZE = 50;

/**
 * Backoff schedule per attempt. attempt=2 means "first retry after
 * synchronous send failed". attempt=3 means "second retry", etc.
 *
 * Schedule:
 *   attempt 2: +30s
 *   attempt 3: +2m
 *   attempt 4: +10m  (only used when MAX_ATTEMPTS=4)
 *
 * Default MAX_ATTEMPTS=3 → after attempt 3 fails, we drop + warn-log.
 */
const BACKOFF_MS: Record<number, number> = {
  2: 30_000,
  3: 2 * 60_000,
  4: 10 * 60_000,
};

export function backoffMs(attempt: number): number {
  return BACKOFF_MS[attempt] ?? 10 * 60_000;
}

// ============================================================
// JOB SHAPE
// ============================================================

export interface NotificationJob {
  /** Unique id — guarantees ZSET members are unique even with same score+payload. */
  id: string;
  user_id: string;
  event_type: NotificationEventType;
  channel: NotificationChannel;
  /** Target endpoint per channel: phone number, telegram chat_id, or email address. */
  recipient: string;
  payload: EventPayload[NotificationEventType];
  locale: string;
  /** 1-indexed attempt count. Synchronous (in-band) attempts count as 1. */
  attempt: number;
  /** Total attempts allowed (synchronous + retries). */
  maxAttempts: number;
  /** Original enqueue timestamp — preserved across retries for telemetry. */
  enqueuedAt: number;
}

// ============================================================
// LUA SCRIPT — atomic pop
// ============================================================

/**
 * KEYS[1] = QUEUE_KEY
 * ARGV[1] = max score (unix-ms now)
 * ARGV[2] = batch limit
 *
 * Returns [member, member, ...] of due jobs that have been removed
 * from the ZSET. Caller is responsible for re-enqueueing on failure.
 */
const POP_DUE_LUA = `
local members = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, tonumber(ARGV[2]))
if #members == 0 then
  return members
end
for i = 1, #members do
  redis.call('ZREM', KEYS[1], members[i])
end
return members
`;

let popScriptSha: string | null = null;

async function popDue(now: number, limit: number): Promise<string[]> {
  if (!popScriptSha) {
    popScriptSha = await redis.script('LOAD', POP_DUE_LUA) as string;
  }
  try {
    const result = await redis.evalsha(
      popScriptSha,
      1,
      QUEUE_KEY,
      String(now),
      String(limit),
    );
    return Array.isArray(result) ? (result as string[]) : [];
  } catch (err) {
    // Script may have been flushed (e.g. Redis restart). Reload + retry once.
    if (err instanceof Error && err.message.includes('NOSCRIPT')) {
      popScriptSha = await redis.script('LOAD', POP_DUE_LUA) as string;
      const result = await redis.evalsha(
        popScriptSha,
        1,
        QUEUE_KEY,
        String(now),
        String(limit),
      );
      return Array.isArray(result) ? (result as string[]) : [];
    }
    throw err;
  }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Enqueue a notification job to be sent at `runAt` (unix-ms). If `runAt`
 * is omitted or in the past, the job is due immediately and will be picked
 * up by the next `tick()`.
 */
export async function enqueue(
  job: Omit<NotificationJob, 'id' | 'enqueuedAt'> & {
    id?: string;
    enqueuedAt?: number;
  },
  runAt?: number,
): Promise<void> {
  const fullJob: NotificationJob = {
    id: job.id ?? randomUUID(),
    enqueuedAt: job.enqueuedAt ?? Date.now(),
    user_id: job.user_id,
    event_type: job.event_type,
    channel: job.channel,
    recipient: job.recipient,
    payload: job.payload,
    locale: job.locale,
    attempt: job.attempt,
    maxAttempts: job.maxAttempts,
  };
  const score = runAt ?? Date.now();
  await redis.zadd(QUEUE_KEY, score, JSON.stringify(fullJob));
}

/**
 * Process all due jobs. Pops up to TICK_BATCH_SIZE jobs from the queue,
 * dispatches each via the matching channel adapter, and re-enqueues
 * with backoff on failure.
 *
 * Tolerant of malformed JSON in the queue (logs and skips). Never throws.
 *
 * @returns object with processing stats — useful for tests and telemetry.
 */
export async function tick(): Promise<{ processed: number; failed: number; dropped: number }> {
  const now = Date.now();
  let members: string[];
  try {
    members = await popDue(now, TICK_BATCH_SIZE);
  } catch (err) {
    console.error('[Sahovat] [notify-queue] popDue failed:', err);
    return { processed: 0, failed: 0, dropped: 0 };
  }

  if (members.length === 0) {
    return { processed: 0, failed: 0, dropped: 0 };
  }

  let processed = 0;
  let failed = 0;
  let dropped = 0;

  for (const raw of members) {
    let job: NotificationJob;
    try {
      job = JSON.parse(raw) as NotificationJob;
    } catch (err) {
      console.error('[Sahovat] [notify-queue] dropping malformed job:', err, raw.slice(0, 200));
      dropped++;
      continue;
    }

    try {
      await dispatchJob(job);
      processed++;
    } catch (err) {
      const nextAttempt = job.attempt + 1;
      if (nextAttempt > job.maxAttempts) {
        // Max attempts exceeded. Log structured warning + drop.
        dropped++;
        console.error(
          `[Sahovat] [notify-queue] DROP job=${job.id} event=${job.event_type} channel=${job.channel} user=${job.user_id} attempts=${job.attempt} error="${(err as Error).message}"`,
        );
        continue;
      }

      // Re-enqueue with backoff.
      failed++;
      const delay = backoffMs(nextAttempt);
      const runAt = Date.now() + delay;
      job.attempt = nextAttempt;
      try {
        await redis.zadd(QUEUE_KEY, runAt, JSON.stringify(job));
        console.warn(
          `[Sahovat] [notify-queue] retry ${job.id} attempt=${nextAttempt} delay=${delay}ms reason="${(err as Error).message}"`,
        );
      } catch (zaddErr) {
        console.error('[Sahovat] [notify-queue] failed to re-enqueue:', zaddErr);
      }
    }
  }

  console.log(
    `[Sahovat] [notify-queue] ticked processed=${processed} failed=${failed} dropped=${dropped}`,
  );
  return { processed, failed, dropped };
}

// ============================================================
// DISPATCH-A-JOB (used by tick + by direct retry from dispatcher)
// ============================================================

/**
 * Send a single job via its channel adapter. Throws on failure so the
 * caller can decide retry policy.
 */
export async function dispatchJob(job: NotificationJob): Promise<void> {
  switch (job.channel) {
    case NotificationChannel.SMS:
      await sendSms({
        phone: job.recipient,
        event: job.event_type,
        payload: job.payload,
        locale: job.locale,
      });
      return;
    case NotificationChannel.TELEGRAM:
      await sendTelegram({
        chatId: job.recipient,
        event: job.event_type,
        payload: job.payload,
        locale: job.locale,
      });
      return;
    case NotificationChannel.EMAIL:
      await sendEmail({
        to: job.recipient,
        event: job.event_type,
        payload: job.payload,
        locale: job.locale,
      });
      return;
    default: {
      const _exhaustive: never = job.channel;
      throw new Error(`Unhandled channel: ${String(_exhaustive)}`);
    }
  }
}

// ============================================================
// MAINTENANCE / TESTING HELPERS
// ============================================================

/** Number of jobs currently scheduled in the queue. */
export async function queueSize(): Promise<number> {
  return redis.zcard(QUEUE_KEY);
}

/** Clear the entire queue. Test-only. */
export async function clearQueue(): Promise<void> {
  await redis.del(QUEUE_KEY);
}

/** Configured max attempts (synchronous + retries). */
export function getMaxAttempts(): number {
  return env.NOTIFICATION_RETRY_MAX_ATTEMPTS;
}
