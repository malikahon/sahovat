import cron from 'node-cron';
import { getDueRecurringDonations, processRecurringCharge } from '../modules/recurring/recurring.service.js';
import { env } from '../config/env.js';
import { tick as notificationTick } from './notifications/queue.js';

let recurringTask: cron.ScheduledTask | null = null;
let notificationInterval: NodeJS.Timeout | null = null;
let notificationRunning = false;

// ============================================================
// PROCESS RECURRING DONATIONS
// ============================================================

/**
 * Fetch all due recurring donations and process each charge sequentially.
 * Runs as a daily cron job.
 */
export async function processRecurringDonations(): Promise<void> {
  console.log('[Sahovat] [Scheduler] Starting recurring donation processing...');

  try {
    const dueRecurrings = await getDueRecurringDonations();

    if (dueRecurrings.length === 0) {
      console.log('[Sahovat] [Scheduler] No recurring donations due today');
      return;
    }

    console.log(
      `[Sahovat] [Scheduler] Found ${dueRecurrings.length} recurring donation(s) to process`,
    );

    let successCount = 0;
    let failCount = 0;

    for (const recurring of dueRecurrings) {
      try {
        console.log(
          `[Sahovat] [Scheduler] Processing recurring ${recurring.id} — ${recurring.amount} UZS`,
        );

        const result = await processRecurringCharge(recurring.id);

        if (result.success) {
          successCount++;
          console.log(
            `[Sahovat] [Scheduler] Charge successful: ${recurring.id} → donation ${result.donationId}`,
          );
        } else {
          failCount++;
          console.log(
            `[Sahovat] [Scheduler] Charge skipped/failed: ${recurring.id} — ${result.error}`,
          );
        }
      } catch (err) {
        failCount++;
        console.error(
          `[Sahovat] [Scheduler] Unexpected error processing ${recurring.id}:`,
          err,
        );
      }
    }

    console.log(
      `[Sahovat] [Scheduler] Completed: ${successCount} successful, ${failCount} failed/skipped out of ${dueRecurrings.length} total`,
    );
  } catch (err) {
    console.error('[Sahovat] [Scheduler] Failed to process recurring donations:', err);
  }
}

// ============================================================
// START / STOP
// ============================================================

/**
 * Start the scheduler with all cron jobs.
 * - Recurring donations: runs daily at 06:00 UTC.
 * - Notification retry queue: ticked every NOTIFICATION_QUEUE_TICK_MS.
 */
export function startScheduler(): void {
  // Daily at 06:00 UTC
  recurringTask = cron.schedule('0 6 * * *', () => {
    void processRecurringDonations();
  });

  // Notification retry queue tick. Guarded against overlap.
  notificationInterval = setInterval(() => {
    if (notificationRunning) return;
    notificationRunning = true;
    void notificationTick()
      .catch((err) => {
        console.error('[Sahovat] [Scheduler] notification tick threw:', err);
      })
      .finally(() => {
        notificationRunning = false;
      });
  }, env.NOTIFICATION_QUEUE_TICK_MS);
  // Don't keep the event loop alive solely for the queue tick.
  notificationInterval.unref?.();

  console.log(
    `[Sahovat] [Scheduler] Started — recurring daily at 06:00 UTC, notification queue every ${env.NOTIFICATION_QUEUE_TICK_MS}ms`,
  );
}

/**
 * Stop all scheduled cron jobs. Called during graceful shutdown.
 */
export function stopScheduler(): void {
  if (recurringTask) {
    recurringTask.stop();
    recurringTask = null;
  }
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
  console.log('[Sahovat] [Scheduler] Stopped');
}
