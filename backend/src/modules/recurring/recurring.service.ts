import { query, getClient } from '../../config/database.js';
import { paymentService } from '../../services/payment.service.js';
import { smsService } from '../../services/sms.service.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../lib/errors.js';
import {
  CampaignStatus,
  DonationStatus,
  PaymentProvider,
  RecurringFrequency,
  RecurringStatus,
} from '../../types/entities.js';
import type { CreateRecurringDonationDto, UpdateRecurringDonationDto } from '../../types/api.js';
import type {
  RecurringDonationRow,
  RecurringDonationWithCampaign,
  ImpactStats,
} from './recurring.types.js';
import * as ledgerService from '../donations/ledger.service.js';

// ============================================================
// HELPERS
// ============================================================

/**
 * Casts numeric fields returned as strings from PostgreSQL back to JS numbers.
 */
function toRecurring(row: RecurringDonationRow): RecurringDonationRow {
  return {
    ...row,
    amount: Number(row.amount),
    failure_count: Number(row.failure_count),
  };
}

/**
 * Calculate the next charge date from today based on the frequency.
 */
function calculateNextChargeDate(frequency: RecurringFrequency): string {
  const now = new Date();
  if (frequency === RecurringFrequency.WEEKLY) {
    now.setDate(now.getDate() + 7);
  } else {
    now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString().split('T')[0]!;
}

/**
 * Advance the charge date forward from a given date.
 */
function advanceChargeDate(from: string, frequency: RecurringFrequency): string {
  const date = new Date(from);
  if (frequency === RecurringFrequency.WEEKLY) {
    date.setDate(date.getDate() + 7);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString().split('T')[0]!;
}

// ============================================================
// CREATE
// ============================================================

/**
 * Create a new recurring donation subscription.
 * Validates the campaign (if specified) is active, or that the category is valid.
 */
export async function createRecurringDonation(
  userId: string,
  data: CreateRecurringDonationDto,
): Promise<RecurringDonationRow> {
  // Validate campaign if provided
  if (data.campaign_id) {
    const campaignResult = await query(
      `SELECT id, status FROM campaigns WHERE id = $1`,
      [data.campaign_id],
    );

    if (campaignResult.rows.length === 0) {
      throw new NotFoundError('Campaign', data.campaign_id);
    }

    const campaign = campaignResult.rows[0] as { id: string; status: string };

    if (campaign.status === CampaignStatus.FROZEN) {
      throw new ValidationError('This campaign has been frozen by an administrator', 'CAMPAIGN_FROZEN');
    }

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new ValidationError('Campaign is not active', 'CAMPAIGN_NOT_ACTIVE');
    }
  }

  // Check for duplicate active subscription to the same campaign/category
  if (data.campaign_id) {
    const existingResult = await query(
      `SELECT id FROM recurring_donations
       WHERE donor_id = $1 AND campaign_id = $2 AND status IN ('active', 'paused')`,
      [userId, data.campaign_id],
    );

    if (existingResult.rows.length > 0) {
      throw new ValidationError('You already have an active recurring donation for this campaign', 'DUPLICATE_RECURRING');
    }
  }

  const nextChargeDate = calculateNextChargeDate(data.frequency);

  const result = await query(
    `INSERT INTO recurring_donations (
       donor_id, campaign_id, category, amount, frequency,
       payment_provider, status, next_charge_date
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      data.campaign_id ?? null,
      data.category ?? null,
      data.amount,
      data.frequency,
      data.payment_provider ?? PaymentProvider.PAYME,
      RecurringStatus.ACTIVE,
      nextChargeDate,
    ],
  );

  return toRecurring(result.rows[0] as RecurringDonationRow);
}

// ============================================================
// LIST MY RECURRING
// ============================================================

/**
 * List all recurring donations for the authenticated user with
 * optional status filter and pagination.
 */
export async function listMyRecurring(
  userId: string,
  filters: { page: number; limit: number; status?: RecurringStatus },
): Promise<{
  data: RecurringDonationWithCampaign[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = filters.page;
  const limit = filters.limit;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['r.donor_id = $1'];
  const params: unknown[] = [userId];
  let paramIndex = 2;

  if (filters.status) {
    conditions.push(`r.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Count total
  const countResult = await query(
    `SELECT COUNT(*) AS total FROM recurring_donations r WHERE ${whereClause}`,
    params,
  );

  const total = Number((countResult.rows[0] as { total: string }).total);
  const totalPages = Math.ceil(total / limit);

  // Fetch paginated rows with campaign data
  const dataResult = await query(
    `SELECT r.*, c.title AS campaign_title, c.cover_image_url AS campaign_cover_image_url
     FROM recurring_donations r
     LEFT JOIN campaigns c ON c.id = r.campaign_id
     WHERE ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset],
  );

  const data = (dataResult.rows as RecurringDonationWithCampaign[]).map((row) => ({
    ...toRecurring(row),
    campaign_title: row.campaign_title,
    campaign_cover_image_url: row.campaign_cover_image_url,
  })) as RecurringDonationWithCampaign[];

  return {
    data,
    pagination: { page, limit, total, totalPages },
  };
}

// ============================================================
// GET BY ID
// ============================================================

/**
 * Fetch a single recurring donation by ID. Verifies ownership.
 */
export async function getRecurringById(
  id: string,
  userId: string,
): Promise<RecurringDonationWithCampaign> {
  const result = await query(
    `SELECT r.*, c.title AS campaign_title, c.cover_image_url AS campaign_cover_image_url
     FROM recurring_donations r
     LEFT JOIN campaigns c ON c.id = r.campaign_id
     WHERE r.id = $1`,
    [id],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Recurring donation', id);
  }

  const row = result.rows[0] as RecurringDonationWithCampaign;

  if (row.donor_id !== userId) {
    throw new ForbiddenError('You do not have access to this recurring donation');
  }

  return {
    ...toRecurring(row),
    campaign_title: row.campaign_title,
    campaign_cover_image_url: row.campaign_cover_image_url,
  } as RecurringDonationWithCampaign;
}

// ============================================================
// UPDATE
// ============================================================

/**
 * Update a recurring donation (amount, frequency, status).
 * Handles resume logic: recalculates next_charge_date and resets failure_count.
 */
export async function updateRecurring(
  id: string,
  userId: string,
  data: UpdateRecurringDonationDto,
): Promise<RecurringDonationRow> {
  // Fetch current record
  const currentResult = await query(
    `SELECT * FROM recurring_donations WHERE id = $1`,
    [id],
  );

  if (currentResult.rows.length === 0) {
    throw new NotFoundError('Recurring donation', id);
  }

  const current = toRecurring(currentResult.rows[0] as RecurringDonationRow);

  if (current.donor_id !== userId) {
    throw new ForbiddenError('You do not have access to this recurring donation');
  }

  // Cannot update cancelled subscriptions (except re-activation handled below)
  if (current.status === RecurringStatus.CANCELLED && data.status !== RecurringStatus.ACTIVE) {
    throw new ValidationError('Cannot update a cancelled recurring donation');
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.amount !== undefined) {
    setClauses.push(`amount = $${paramIndex}`);
    params.push(data.amount);
    paramIndex++;
  }

  if (data.frequency !== undefined) {
    setClauses.push(`frequency = $${paramIndex}`);
    params.push(data.frequency);
    paramIndex++;
  }

  if (data.status !== undefined) {
    setClauses.push(`status = $${paramIndex}`);
    params.push(data.status);
    paramIndex++;

    // If resuming from paused/failed, recalculate next charge date and reset failures
    if (
      data.status === RecurringStatus.ACTIVE &&
      (current.status === RecurringStatus.PAUSED || current.status === RecurringStatus.FAILED)
    ) {
      const frequency = data.frequency ?? current.frequency;
      const nextChargeDate = calculateNextChargeDate(frequency);
      setClauses.push(`next_charge_date = $${paramIndex}`);
      params.push(nextChargeDate);
      paramIndex++;

      setClauses.push(`failure_count = 0`);
    }
  }

  if (setClauses.length === 0) {
    throw new ValidationError('No fields to update');
  }

  params.push(id);
  const idParam = paramIndex;

  const result = await query(
    `UPDATE recurring_donations
     SET ${setClauses.join(', ')}
     WHERE id = $${idParam}
     RETURNING *`,
    params,
  );

  return toRecurring(result.rows[0] as RecurringDonationRow);
}

// ============================================================
// DELETE
// ============================================================

/**
 * Delete a recurring donation. Only allowed if cancelled or paused.
 */
export async function deleteRecurring(
  id: string,
  userId: string,
): Promise<void> {
  const currentResult = await query(
    `SELECT * FROM recurring_donations WHERE id = $1`,
    [id],
  );

  if (currentResult.rows.length === 0) {
    throw new NotFoundError('Recurring donation', id);
  }

  const current = currentResult.rows[0] as RecurringDonationRow;

  if (current.donor_id !== userId) {
    throw new ForbiddenError('You do not have access to this recurring donation');
  }

  if (
    current.status !== RecurringStatus.CANCELLED &&
    current.status !== RecurringStatus.PAUSED &&
    current.status !== RecurringStatus.FAILED
  ) {
    throw new ValidationError(
      'Only cancelled, paused, or failed recurring donations can be deleted',
    );
  }

  await query(`DELETE FROM recurring_donations WHERE id = $1`, [id]);
}

// ============================================================
// GET DUE RECURRING DONATIONS (used by scheduler)
// ============================================================

/**
 * Fetch all active recurring donations whose next_charge_date is today or earlier.
 */
export async function getDueRecurringDonations(): Promise<RecurringDonationRow[]> {
  const result = await query(
    `SELECT * FROM recurring_donations
     WHERE status = $1 AND next_charge_date <= CURRENT_DATE
     ORDER BY next_charge_date ASC`,
    [RecurringStatus.ACTIVE],
  );

  return (result.rows as RecurringDonationRow[]).map(toRecurring);
}

// ============================================================
// PROCESS RECURRING CHARGE (used by scheduler)
// ============================================================

/**
 * Process a single recurring donation charge. Creates a donation record,
 * initiates a mock payment, confirms it, and advances the schedule.
 *
 * On failure: increments failure_count, auto-pauses after 3 failures,
 * sends SMS notification.
 */
export async function processRecurringCharge(
  recurringId: string,
): Promise<{ success: boolean; donationId?: string; error?: string }> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Lock the recurring record to prevent double-processing
    const recurringResult = await client.query(
      `SELECT r.*, u.phone_number
       FROM recurring_donations r
       JOIN users u ON u.id = r.donor_id
       WHERE r.id = $1
       FOR UPDATE`,
      [recurringId],
    );

    if (recurringResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Recurring donation not found' };
    }

    const recurring = recurringResult.rows[0] as RecurringDonationRow & {
      phone_number: string;
    };

    if (recurring.status !== RecurringStatus.ACTIVE) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Recurring donation is not active' };
    }

    // Determine target campaign
    let targetCampaignId = recurring.campaign_id;

    if (targetCampaignId) {
      // Verify campaign is still active
      const campaignResult = await client.query(
        `SELECT id, status, title FROM campaigns WHERE id = $1`,
        [targetCampaignId],
      );

      if (campaignResult.rows.length === 0) {
        // Campaign deleted — pause recurring
        await client.query(
          `UPDATE recurring_donations SET status = $1 WHERE id = $2`,
          [RecurringStatus.PAUSED, recurringId],
        );
        await client.query('COMMIT');

        await notifySafe(
          recurring.phone_number,
          'The campaign you were donating to no longer exists. Your recurring donation has been paused.',
        );

        return { success: false, error: 'Campaign no longer exists' };
      }

      const campaign = campaignResult.rows[0] as {
        id: string;
        status: string;
        title: string;
      };

      if (
        campaign.status !== CampaignStatus.ACTIVE
      ) {
        // Campaign is no longer active — pause recurring
        await client.query(
          `UPDATE recurring_donations SET status = $1 WHERE id = $2`,
          [RecurringStatus.PAUSED, recurringId],
        );
        await client.query('COMMIT');

        await notifySafe(
          recurring.phone_number,
          `The campaign "${campaign.title}" has ended. Your recurring donation has been paused.`,
        );

        return { success: false, error: 'Campaign is no longer active' };
      }
    } else if (recurring.category) {
      // Category-based: find the most underfunded verified active campaign
      const candidateResult = await client.query(
        `SELECT id FROM campaigns
         WHERE category = $1
           AND status = $2
           AND is_verified = true
         ORDER BY (current_amount::float / NULLIF(goal_amount, 0)) ASC, created_at ASC
         LIMIT 1`,
        [recurring.category, CampaignStatus.ACTIVE],
      );

      if (candidateResult.rows.length === 0) {
        // No eligible campaign — skip this cycle without counting as failure
        // Still advance next_charge_date so the scheduler doesn't retry every run
        const nextDate = advanceChargeDate(
          new Date().toISOString().split('T')[0]!,
          recurring.frequency,
        );
        await client.query(
          `UPDATE recurring_donations SET next_charge_date = $1, updated_at = NOW() WHERE id = $2`,
          [nextDate, recurringId],
        );
        await client.query('COMMIT');
        console.log(
          `[Sahovat] No active campaign for category "${recurring.category}" — skipping recurring ${recurringId}, next charge date advanced to ${nextDate}`,
        );
        return { success: false, error: 'No eligible campaign in category' };
      }

      targetCampaignId = (candidateResult.rows[0] as { id: string }).id;
    } else {
      await client.query('ROLLBACK');
      return { success: false, error: 'No campaign_id or category set' };
    }

    // Calculate fees
    const feePercentage = await ledgerService.getPlatformFeePercentage();
    const amount = Number(recurring.amount);
    const platformFee = Math.round((amount * feePercentage) / 100);
    const netAmount = amount - platformFee;

    // Create pending donation
    const donationResult = await client.query(
      `INSERT INTO donations (
         campaign_id, donor_id, amount, platform_fee, net_amount,
         payment_provider, status, is_anonymous, donor_display_name, note
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        targetCampaignId,
        recurring.donor_id,
        amount,
        platformFee,
        netAmount,
        recurring.payment_provider,
        DonationStatus.PENDING,
        false,
        null,
        'Recurring donation',
      ],
    );

    const donation = donationResult.rows[0] as { id: string; amount: number };

    // Look up the user's default saved card for charging
    const { getDefaultCard } = await import('../saved-cards/saved-cards.service.js');
    const defaultCard = await getDefaultCard(recurring.donor_id);

    let transactionId: string;

    if (defaultCard) {
      // Charge the saved card via PayMe Subscribe API
      const chargeResult = await paymentService.chargeCard({
        amount,
        donation_id: donation.id,
        card_token: defaultCard.card_token,
        payer_phone: recurring.phone_number,
      });

      if (!chargeResult.success) {
        // Card charge failed — mark donation as failed, increment failure count
        await client.query(
          `UPDATE donations SET status = $1 WHERE id = $2`,
          [DonationStatus.FAILED, donation.id],
        );
        await handleChargeFailure(client, recurringId, recurring.phone_number);
        await client.query('COMMIT');
        return {
          success: false,
          donationId: donation.id,
          error: `Card charge failed: ${chargeResult.error || 'Unknown error'}`,
        };
      }

      transactionId = chargeResult.transaction_id;
    } else {
      // No saved card — fall back to mock/redirect flow
      // In mock mode this auto-creates a transaction; in production the user
      // needs to have a saved card for recurring to work.
      let paymentResult;
      try {
        paymentResult = await paymentService.createPayment({
          amount,
          donation_id: donation.id,
          provider: recurring.payment_provider as PaymentProvider,
          return_url: undefined,
        });
      } catch (paymentErr) {
        await client.query(
          `UPDATE donations SET status = $1 WHERE id = $2`,
          [DonationStatus.FAILED, donation.id],
        );
        await handleChargeFailure(client, recurringId, recurring.phone_number);
        await client.query('COMMIT');
        return {
          success: false,
          donationId: donation.id,
          error: `Payment initiation failed: ${paymentErr}`,
        };
      }

      transactionId = paymentResult.transaction_id;
    }

    // Complete the donation
    await client.query(
      `UPDATE donations
       SET status = $1, payment_transaction_id = $2, completed_at = NOW()
       WHERE id = $3`,
      [DonationStatus.COMPLETED, transactionId, donation.id],
    );

    // Record platform fee
    await client.query(
      `INSERT INTO platform_fees (donation_id, fee_type, amount)
       VALUES ($1, $2, $3)`,
      [donation.id, 'donation', platformFee],
    );

    // Credit campaign balance
    await client.query(
      `UPDATE campaigns
       SET current_amount = current_amount + $1
       WHERE id = $2`,
      [netAmount, targetCampaignId],
    );

    // Advance recurring schedule
    const today = new Date().toISOString().split('T')[0]!;
    const nextDate = advanceChargeDate(today, recurring.frequency);

    await client.query(
      `UPDATE recurring_donations
       SET last_charge_date = $1,
           next_charge_date = $2,
           failure_count = 0
       WHERE id = $3`,
      [today, nextDate, recurringId],
    );

    await client.query('COMMIT');

    console.log(
      `[Sahovat] Recurring charge successful: ${recurringId} → donation ${donation.id} (${amount} UZS)`,
    );

    return { success: true, donationId: donation.id };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[Sahovat] Recurring charge failed for ${recurringId}:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  } finally {
    client.release();
  }
}

// ============================================================
// FAILURE HANDLING
// ============================================================

/**
 * Handle a charge failure: increment failure_count, auto-pause after 3,
 * send SMS notification.
 */
async function handleChargeFailure(
  client: import('pg').PoolClient,
  recurringId: string,
  phone: string,
): Promise<void> {
  // Increment failure count
  const updateResult = await client.query(
    `UPDATE recurring_donations
     SET failure_count = failure_count + 1
     WHERE id = $1
     RETURNING failure_count`,
    [recurringId],
  );

  const failureCount = Number(
    (updateResult.rows[0] as { failure_count: number }).failure_count,
  );

  if (failureCount >= 3) {
    // Auto-pause
    await client.query(
      `UPDATE recurring_donations SET status = $1 WHERE id = $2`,
      [RecurringStatus.FAILED, recurringId],
    );

    await notifySafe(
      phone,
      'Your recurring donation has been paused after 3 failed attempts. Please update your payment method and resume from your dashboard.',
    );
  } else if (failureCount === 2) {
    await notifySafe(
      phone,
      'Your recurring donation failed again. We will try once more.',
    );
  } else {
    await notifySafe(
      phone,
      'Your recurring donation could not be processed. We will retry tomorrow.',
    );
  }
}

/**
 * Send SMS notification without letting errors propagate.
 */
async function notifySafe(phone: string, message: string): Promise<void> {
  try {
    await smsService.sendNotification(phone, message);
  } catch (err) {
    console.error(`[Sahovat] Failed to send SMS notification to ${phone}:`, err);
  }
}

// ============================================================
// IMPACT STATS
// ============================================================

/**
 * Calculate impact statistics for a user: total donated, campaigns supported,
 * donation streak (consecutive weeks), and recurring donation totals.
 */
export async function getImpactStats(userId: string): Promise<ImpactStats> {
  // Total donated and campaigns supported
  const donationStatsResult = await query(
    `SELECT
       COALESCE(SUM(amount), 0) AS total_donated,
       COUNT(DISTINCT campaign_id) AS campaigns_supported,
       COUNT(*) AS total_donations_count
     FROM donations
     WHERE donor_id = $1 AND status = $2`,
    [userId, DonationStatus.COMPLETED],
  );

  const donationStats = donationStatsResult.rows[0] as {
    total_donated: string;
    campaigns_supported: string;
    total_donations_count: string;
  };

  // Recurring donation stats
  const recurringStatsResult = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = $2) AS recurring_active_count,
       COALESCE(
         SUM(amount) FILTER (WHERE status = $2 AND frequency = 'monthly'), 0
       ) + COALESCE(
         SUM(amount * 4) FILTER (WHERE status = $2 AND frequency = 'weekly'), 0
       ) AS recurring_total_monthly
     FROM recurring_donations
     WHERE donor_id = $1`,
    [userId, RecurringStatus.ACTIVE],
  );

  const recurringStats = recurringStatsResult.rows[0] as {
    recurring_active_count: string;
    recurring_total_monthly: string;
  };

  // Streak calculation: consecutive weeks with at least one donation
  const streakResult = await query(
    `SELECT DISTINCT DATE_TRUNC('week', completed_at)::date AS week_start
     FROM donations
     WHERE donor_id = $1 AND status = $2 AND completed_at IS NOT NULL
     ORDER BY week_start DESC`,
    [userId, DonationStatus.COMPLETED],
  );

  let streakWeeks = 0;
  const weeks = (streakResult.rows as { week_start: string }[]).map(
    (r) => new Date(r.week_start),
  );

  if (weeks.length > 0) {
    // Get the start of the current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - diffToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    // Check if most recent donation week is current or previous week
    const firstWeek = weeks[0]!;
    const diffMs = currentWeekStart.getTime() - firstWeek.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

    if (diffWeeks <= 1) {
      // Streak starts from the most recent week
      streakWeeks = 1;
      for (let i = 1; i < weeks.length; i++) {
        const prevWeek = weeks[i - 1]!;
        const thisWeek = weeks[i]!;
        const gap = Math.round(
          (prevWeek.getTime() - thisWeek.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        if (gap === 1) {
          streakWeeks++;
        } else {
          break;
        }
      }
    }
  }

  return {
    total_donated: Number(donationStats.total_donated),
    campaigns_supported: Number(donationStats.campaigns_supported),
    streak_weeks: streakWeeks,
    total_donations_count: Number(donationStats.total_donations_count),
    recurring_active_count: Number(recurringStats.recurring_active_count),
    recurring_total_monthly: Number(recurringStats.recurring_total_monthly),
  };
}
