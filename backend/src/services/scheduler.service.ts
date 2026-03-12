import cron from 'node-cron';
import { getDueRecurringDonations, processRecurringCharge } from '../modules/recurring/recurring.service.js';

let recurringTask: cron.ScheduledTask | null = null;

// ============================================================
// PROCESS RECURRING DONATIONS
// ============================================================

/**
 * Fetch all due recurring donations and process each charge sequentially.
 * Runs as a daily cron job.
 */
async function processRecurringDonations(): Promise<void> {
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
 */
export function startScheduler(): void {
  // Daily at 06:00 UTC
  recurringTask = cron.schedule('0 6 * * *', () => {
    void processRecurringDonations();
  });

  console.log('[Sahovat] [Scheduler] Started — recurring donations checked daily at 06:00 UTC');
}

/**
 * Stop all scheduled cron jobs. Called during graceful shutdown.
 */
export function stopScheduler(): void {
  if (recurringTask) {
    recurringTask.stop();
    recurringTask = null;
    console.log('[Sahovat] [Scheduler] Stopped');
  }
}
