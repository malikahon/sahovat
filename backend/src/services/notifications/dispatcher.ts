import { query } from '../../config/database.js';
import { env } from '../../config/env.js';
import {
  NotificationChannel,
  type NotificationEventType,
} from '../../types/entities.js';
import type { EventPayload } from './events.js';
import { sendSms, sendTelegram, sendEmail } from './channels.js';
import { enqueue, backoffMs } from './queue.js';

/**
 * NotificationDispatcher — fans an event out to enabled channels per user.
 *
 * Flow:
 *   1. Load user's notification fields (phone, telegram_id, email, locale).
 *   2. Read enabled channels from notification_preferences for this event_type.
 *   3. Filter to *deliverable* channels (e.g. drop email when unverified).
 *   4. If 0 deliverable channels: structured warn + return.
 *   5. For each deliverable channel: try send synchronously; on failure
 *      enqueue a retry with backoff. One channel failing never blocks others.
 *
 * The dispatcher is fire-and-forget at every call site. It must never throw
 * upward; callers wrap in try/catch with a console.error fallback.
 */

interface UserNotifyRow {
  id: string;
  phone_number: string | null;
  telegram_id: string | null;
  email: string | null;
  email_verified_at: string | null;
  language_preference: string;
}

interface DispatchInput<E extends keyof EventPayload> {
  user_id: string;
  event_type: E;
  payload: EventPayload[E];
}

/**
 * Dispatch an event to all of a user's enabled, deliverable channels.
 *
 * Never throws. Returns a small summary for telemetry / tests. The summary's
 * `attempted` reflects channels we tried in-band; `enqueued` is channels
 * we sent to the retry queue after sync failure; `skipped` is channels the
 * user enabled but cannot receive (no email, no chat_id, etc.).
 */
export async function dispatch<E extends keyof EventPayload>(
  input: DispatchInput<E>,
): Promise<{
  attempted: NotificationChannel[];
  enqueued: NotificationChannel[];
  skipped: NotificationChannel[];
}> {
  const summary = {
    attempted: [] as NotificationChannel[],
    enqueued: [] as NotificationChannel[],
    skipped: [] as NotificationChannel[],
  };

  let user: UserNotifyRow | null;
  try {
    const result = await query(
      `SELECT id, phone_number, telegram_id, email, email_verified_at, language_preference
       FROM users WHERE id = $1`,
      [input.user_id],
    );
    user = (result.rows[0] as UserNotifyRow | undefined) ?? null;
  } catch (err) {
    console.error(
      `[Sahovat] [notify] failed to load user ${input.user_id} for event ${input.event_type}:`,
      err,
    );
    return summary;
  }

  if (!user) {
    console.warn(
      `[Sahovat] [notify] user ${input.user_id} not found, skipping event ${input.event_type}`,
    );
    return summary;
  }

  // Load enabled channels for this event.
  let enabledChannels: NotificationChannel[];
  try {
    const prefsResult = await query(
      `SELECT channel FROM notification_preferences
       WHERE user_id = $1 AND event_type = $2 AND enabled = TRUE`,
      [input.user_id, input.event_type],
    );
    enabledChannels = (prefsResult.rows as { channel: NotificationChannel }[]).map(
      (r) => r.channel,
    );
  } catch (err) {
    console.error(
      `[Sahovat] [notify] failed to load preferences for user ${input.user_id}:`,
      err,
    );
    return summary;
  }

  // Filter to deliverable.
  const deliverable: { channel: NotificationChannel; recipient: string }[] = [];
  for (const channel of enabledChannels) {
    if (channel === NotificationChannel.SMS) {
      if (user.phone_number) {
        deliverable.push({ channel, recipient: user.phone_number });
      } else {
        summary.skipped.push(channel);
        console.log(
          `[Sahovat] [notify] skip sms event=${input.event_type} user=${input.user_id} reason=no_phone`,
        );
      }
    } else if (channel === NotificationChannel.TELEGRAM) {
      if (user.telegram_id) {
        deliverable.push({ channel, recipient: user.telegram_id });
      } else {
        summary.skipped.push(channel);
        console.log(
          `[Sahovat] [notify] skip telegram event=${input.event_type} user=${input.user_id} reason=no_chat_id`,
        );
      }
    } else if (channel === NotificationChannel.EMAIL) {
      if (user.email && user.email_verified_at) {
        deliverable.push({ channel, recipient: user.email });
      } else {
        summary.skipped.push(channel);
        console.log(
          `[Sahovat] [notify] skip email event=${input.event_type} user=${input.user_id} reason=${user.email ? 'unverified' : 'no_email'}`,
        );
      }
    }
  }

  // No deliverable channels — log warn and return.
  if (deliverable.length === 0) {
    console.warn(
      `[Sahovat] [notify] WARN no_deliverable_channels event=${input.event_type} user=${input.user_id} enabled=[${enabledChannels.join(',')}] skipped=[${summary.skipped.join(',')}]`,
    );
    return summary;
  }

  console.log(
    `[Sahovat] [notify] dispatch event=${input.event_type} user=${input.user_id} channels=[${deliverable.map((d) => d.channel).join(',')}]`,
  );

  // Fan out — each channel attempt is independent.
  const maxAttempts = env.NOTIFICATION_RETRY_MAX_ATTEMPTS;
  for (const { channel, recipient } of deliverable) {
    summary.attempted.push(channel);
    try {
      await sendOnce(channel, recipient, input, user.language_preference);
    } catch (err) {
      // Synchronous attempt failed → enqueue retry.
      console.warn(
        `[Sahovat] [notify] sync send failed channel=${channel} event=${input.event_type} user=${input.user_id}: ${(err as Error).message}`,
      );
      try {
        await enqueue(
          {
            user_id: input.user_id,
            event_type: input.event_type as NotificationEventType,
            channel,
            recipient,
            payload: input.payload as EventPayload[NotificationEventType],
            locale: user.language_preference,
            attempt: 2,
            maxAttempts,
          },
          Date.now() + backoffMs(2),
        );
        summary.enqueued.push(channel);
      } catch (enqueueErr) {
        console.error(
          `[Sahovat] [notify] failed to enqueue retry channel=${channel} job_user=${input.user_id}:`,
          enqueueErr,
        );
      }
    }
  }

  return summary;
}

async function sendOnce<E extends keyof EventPayload>(
  channel: NotificationChannel,
  recipient: string,
  input: DispatchInput<E>,
  locale: string,
): Promise<void> {
  switch (channel) {
    case NotificationChannel.SMS:
      await sendSms({
        phone: recipient,
        event: input.event_type,
        payload: input.payload,
        locale,
      });
      return;
    case NotificationChannel.TELEGRAM:
      await sendTelegram({
        chatId: recipient,
        event: input.event_type,
        payload: input.payload,
        locale,
      });
      return;
    case NotificationChannel.EMAIL:
      await sendEmail({
        to: recipient,
        event: input.event_type,
        payload: input.payload,
        locale,
      });
      return;
    default: {
      const _exhaustive: never = channel;
      throw new Error(`Unhandled channel: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Convenience wrapper: dispatch + swallow any unexpected throw. Use this
 * at hot-path call sites (donation completion, withdrawal review, etc.)
 * so the post-COMMIT notify never breaks the request flow.
 */
export async function dispatchSafe<E extends keyof EventPayload>(
  input: DispatchInput<E>,
): Promise<void> {
  try {
    await dispatch(input);
  } catch (err) {
    console.error(
      `[Sahovat] [notify] dispatch threw unexpectedly for event ${input.event_type} user ${input.user_id}:`,
      err,
    );
  }
}
