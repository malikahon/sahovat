import { query, getClient } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { paymentService } from '../../services/payment.service.js';
import { pdfService } from '../../services/pdf.service.js';
import { storageService } from '../../services/storage.service.js';
import { smsService } from '../../services/sms.service.js';
import { generateOtp, storeOtp, verifyOtp, isOtpLocked } from '../../lib/otp.js';
import { NotFoundError, ValidationError, ForbiddenError, RateLimitError } from '../../lib/errors.js';
import { CampaignStatus, DonationStatus } from '../../types/entities.js';
import type { InitiateDonationDto, DonationListQuery } from '../../types/api.js';
import type { DonationRow, DonationWithCampaignRow, DonationReceiptRow } from './donations.types.js';
import * as ledgerService from './ledger.service.js';

/** Redis key prefix for storing OTP verification state for large donations. */
const DONATION_OTP_VERIFIED_PREFIX = 'donation_otp_verified:';

// ============================================================
// HELPERS
// ============================================================

/**
 * Casts numeric fields returned as strings from PostgreSQL back to JS numbers.
 */
function toDonation(row: DonationRow): DonationRow {
  return {
    ...row,
    amount: Number(row.amount),
    platform_fee: Number(row.platform_fee),
    net_amount: Number(row.net_amount),
  };
}

/**
 * Replaces donor identity fields with anonymous placeholders when the
 * donation is marked as anonymous.
 */
function maskAnonymousDonation(donation: DonationRow): DonationRow {
  if (!donation.is_anonymous) {
    return donation;
  }

  return {
    ...donation,
    donor_id: 'anonymous',
    donor_display_name: 'Anonymous',
  };
}

// ============================================================
// OTP FOR LARGE DONATIONS
// ============================================================

/**
 * Sends an OTP to the donor's phone for donations exceeding 100,000 UZS.
 * Verifies that the target campaign is active before issuing the code.
 */
export async function requestDonationOtp(
  userId: string,
  phone: string,
  campaignId: string,
  amount: number,
): Promise<void> {
  // Verify campaign exists and is active
  const campaignResult = await query(
    `SELECT id, status FROM campaigns WHERE id = $1`,
    [campaignId],
  );

  if (campaignResult.rows.length === 0) {
    throw new NotFoundError('Campaign not found');
  }

  const campaign = campaignResult.rows[0] as { id: string; status: string };

  if (campaign.status === CampaignStatus.FROZEN) {
    throw new ValidationError('This campaign has been frozen by an administrator', 'CAMPAIGN_FROZEN');
  }

  if (campaign.status !== CampaignStatus.ACTIVE) {
    throw new ValidationError('Campaign is not active', 'CAMPAIGN_NOT_ACTIVE');
  }

  // Verify amount threshold
  if (amount <= 100000) {
    throw new ValidationError('OTP is only required for donations over 100,000 UZS', 'OTP_NOT_REQUIRED');
  }

  // Check lockout
  const locked = await isOtpLocked(phone);
  if (locked) {
    throw new RateLimitError('Too many OTP attempts. Please try again later.', 'OTP_RATE_LIMIT');
  }

  // Generate, store, and send OTP
  const otp = generateOtp();
  await storeOtp(phone, otp);
  await smsService.sendOtp(phone, otp);

  const maskedPhone = phone.slice(0, 4) + '****' + phone.slice(-4);
  console.log(`[Sahovat] Donation OTP sent to ${maskedPhone} for ${amount} UZS`);
}

/**
 * Verifies a donation OTP against the stored value for the given phone number.
 * On success, stores a verification token in Redis (10-minute TTL) so the
 * subsequent `initiateDonation` call can confirm the OTP was verified.
 */
export async function verifyDonationOtp(
  userId: string,
  phone: string,
  otp: string,
): Promise<boolean> {
  const result = await verifyOtp(phone, otp);

  if (result) {
    // Store verification flag — valid for 10 minutes
    const key = `${DONATION_OTP_VERIFIED_PREFIX}${userId}`;
    await redis.set(key, '1', 'EX', 600);
  }

  return result;
}

// ============================================================
// INITIATE DONATION
// ============================================================

/**
 * Creates a new pending donation and returns a payment checkout URL.
 * Requires OTP verification for amounts exceeding 100,000 UZS.
 * Checks Redis for OTP verification state set by `verifyDonationOtp`.
 */
export async function initiateDonation(
  userId: string,
  data: InitiateDonationDto,
): Promise<{ donation: DonationRow; checkout_url: string }> {
  // Validate campaign exists and is active
  const campaignResult = await query(
    `SELECT id, status FROM campaigns WHERE id = $1`,
    [data.campaign_id],
  );

  if (campaignResult.rows.length === 0) {
    throw new NotFoundError('Campaign not found');
  }

  const campaign = campaignResult.rows[0] as { id: string; status: string };

  if (campaign.status === CampaignStatus.FROZEN) {
    throw new ValidationError('This campaign has been frozen by an administrator', 'CAMPAIGN_FROZEN');
  }

  if (campaign.status !== CampaignStatus.ACTIVE) {
    throw new ValidationError('Campaign is not active', 'CAMPAIGN_NOT_ACTIVE');
  }

  // Identity and OTP check for large donations
  if (data.amount > 100000) {
    // Check account-level identity verification first
    const userResult = await query(
      `SELECT verification_status FROM users WHERE id = $1`,
      [userId],
    );
    const user = userResult.rows[0] as { verification_status: string } | undefined;
    if (!user || user.verification_status !== 'approved') {
      throw new ValidationError(
        'Identity verification required for donations over 100,000 UZS',
        'IDENTITY_VERIFICATION_REQUIRED',
      );
    }

    // Then check OTP verification state stored in Redis
    const otpKey = `${DONATION_OTP_VERIFIED_PREFIX}${userId}`;
    const otpVerified = await redis.get(otpKey);

    if (!otpVerified) {
      throw new ValidationError('OTP verification required for donations over 100,000 UZS', 'DONATION_OTP_REQUIRED');
    }

    // Consume the OTP verification (one-time use)
    await redis.del(otpKey);
  }

  // Calculate fees
  const feePercentage = await ledgerService.getPlatformFeePercentage();
  const feeIncluded = data.fee_included ?? false;
  const platform_fee = Math.round(data.amount * feePercentage / 100);

  // feeIncluded = true: fee carved out of the entered amount (user pays data.amount)
  // feeIncluded = false (default): fee added on top (user pays data.amount + fee, campaign gets data.amount)
  const charge_amount = feeIncluded ? data.amount : data.amount + platform_fee;
  const net_amount = feeIncluded ? data.amount - platform_fee : data.amount;

  // Determine display name
  const donor_display_name = data.is_anonymous ? null : (data.donor_display_name ?? null);

  // Insert pending donation
  // `amount` column stores the total charge to the user (includes fee when fee is on top)
  const insertResult = await query(
    `INSERT INTO donations (
       campaign_id, donor_id, amount, platform_fee, net_amount,
       payment_provider, status, is_anonymous, donor_display_name, note
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.campaign_id,
      userId,
      charge_amount,
      platform_fee,
      net_amount,
      data.payment_provider,
      DonationStatus.PENDING,
      data.is_anonymous ?? false,
      donor_display_name,
      data.note ?? null,
    ],
  );

  const donation = insertResult.rows[0] as DonationRow;

  // If a saved card was provided, charge it directly
  if (data.saved_card_id) {
    const { getCardWithToken } = await import('../saved-cards/saved-cards.service.js');
    const savedCard = await getCardWithToken(data.saved_card_id, userId);

    const chargeResult = await paymentService.chargeCard({
      amount: charge_amount,
      donation_id: donation.id,
      card_token: savedCard.card_token,
    });

    if (chargeResult.success) {
      // Auto-confirm the donation synchronously
      const confirmedDonation = await confirmDonation(
        donation.id,
        chargeResult.transaction_id,
        'completed',
        charge_amount,
      );

      return {
        donation: toDonation(confirmedDonation),
        checkout_url: '',
      };
    }

    // Charge failed — mark donation as failed
    await query(
      `UPDATE donations SET status = $1 WHERE id = $2`,
      [DonationStatus.FAILED, donation.id],
    );

    throw new ValidationError(
      chargeResult.error || 'Card payment failed. Please try again.',
      'CARD_CHARGE_FAILED',
    );
  }

  // No saved card — create a checkout session for redirect-based payment
  const paymentResult = await paymentService.createPayment({
    amount: charge_amount,
    donation_id: donation.id,
    provider: data.payment_provider,
    return_url: undefined,
  });

  return {
    donation: toDonation(donation),
    checkout_url: paymentResult.checkout_url,
  };
}

// ============================================================
// CONFIRM DONATION (WEBHOOK)
// ============================================================

/**
 * Confirms or fails a pending donation based on the payment provider webhook.
 * Uses a database transaction to atomically update the donation, record the
 * platform fee, and credit the campaign balance.
 */
export async function confirmDonation(
  donationId: string,
  transactionId: string,
  status: 'completed' | 'failed',
  amount: number,
): Promise<DonationRow> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Find the pending donation
    const donationResult = await client.query(
      `SELECT * FROM donations WHERE id = $1 FOR UPDATE`,
      [donationId],
    );

    if (donationResult.rows.length === 0) {
      throw new NotFoundError('Donation not found');
    }

    const donation = donationResult.rows[0] as DonationRow;

    if (donation.status !== DonationStatus.PENDING) {
      // If the donation already has the same terminal status, return idempotently
      // to avoid webhook retry loops from payment providers.
      if (donation.status === status) {
        await client.query('COMMIT');
        return toDonation(donation);
      }
      // Genuine conflict: e.g., trying to mark as failed when already completed
      throw new ValidationError('Donation already processed', 'DONATION_ALREADY_PROCESSED');
    }

    // Verify webhook amount matches the original donation amount
    if (Number(amount) !== Number(donation.amount)) {
      throw new ValidationError('Webhook amount does not match donation amount');
    }

    let updatedDonation: DonationRow;

    if (status === 'completed') {
      // Update donation to completed
      const updateResult = await client.query(
        `UPDATE donations
         SET status = $1, payment_transaction_id = $2, completed_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [DonationStatus.COMPLETED, transactionId, donationId],
      );

      updatedDonation = updateResult.rows[0] as DonationRow;

      // Record platform fee
      await client.query(
        `INSERT INTO platform_fees (donation_id, fee_type, amount)
         VALUES ($1, $2, $3)`,
        [donationId, 'donation', Number(donation.platform_fee)],
      );

      // Credit campaign balance
      await client.query(
        `UPDATE campaigns
         SET current_amount = current_amount + $1
         WHERE id = $2`,
        [Number(donation.net_amount), donation.campaign_id],
      );
    } else {
      // Update donation to failed
      const updateResult = await client.query(
        `UPDATE donations
         SET status = $1, payment_transaction_id = $2
         WHERE id = $3
         RETURNING *`,
        [DonationStatus.FAILED, transactionId, donationId],
      );

      updatedDonation = updateResult.rows[0] as DonationRow;
    }

    await client.query('COMMIT');

    // Generate PDF receipt for completed donations (non-critical)
    if (status === 'completed') {
      try {
        const campaignResult = await query(
          `SELECT * FROM campaigns WHERE id = $1`,
          [donation.campaign_id],
        );

        const campaignRow = campaignResult.rows[0] as Record<string, unknown>;

        const donorResult = await query(
          `SELECT display_name FROM users WHERE id = $1`,
          [donation.donor_id],
        );

        const donorName = donation.is_anonymous
          ? 'Anonymous'
          : ((donorResult.rows[0] as { display_name: string | null })?.display_name ?? 'Anonymous');

        const pdfBuffer = await pdfService.generateDonationReceipt(
          toDonation(updatedDonation) as unknown as import('../../types/entities.js').Donation,
          campaignRow as unknown as import('../../types/entities.js').Campaign,
          donorName,
        );

        const fileUrl = await storageService.savePrivate(
          pdfBuffer,
          `receipt-${donationId}.pdf`,
          'application/pdf',
        );

        await query(
          `INSERT INTO donation_receipts (donation_id, file_url)
           VALUES ($1, $2)`,
          [donationId, fileUrl],
        );

        console.log(`[Sahovat] Receipt generated for donation ${donationId}`);
      } catch (receiptErr) {
        console.error(
          `[Sahovat] Failed to generate receipt for donation ${donationId}:`,
          receiptErr,
        );
      }
    }

    return toDonation(updatedDonation);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// GET DONATION BY ID
// ============================================================

/**
 * Retrieves a single donation by ID. Masks anonymous donor information
 * unless the requesting user is the donor.
 */
export async function getDonationById(
  donationId: string,
  requestingUserId?: string,
): Promise<DonationRow> {
  const result = await query(
    `SELECT * FROM donations WHERE id = $1`,
    [donationId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Donation not found');
  }

  const donation = toDonation(result.rows[0] as DonationRow);

  // If the requesting user is the donor, return unmasked
  if (requestingUserId && requestingUserId === donation.donor_id) {
    return donation;
  }

  return maskAnonymousDonation(donation);
}

// ============================================================
// LIST DONATIONS BY CAMPAIGN
// ============================================================

/**
 * Lists completed donations for a campaign with pagination.
 * Anonymous donors are masked in the response.
 */
export async function listDonationsByCampaign(
  campaignId: string,
  filters: DonationListQuery,
): Promise<{
  data: DonationRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  // Verify campaign exists
  const campaignCheck = await query(
    `SELECT id FROM campaigns WHERE id = $1`,
    [campaignId],
  );

  if (campaignCheck.rows.length === 0) {
    throw new NotFoundError('Campaign not found');
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;
  const sortBy = filters.sort_by === 'amount' ? 'amount' : 'created_at';
  const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE clauses
  const conditions: string[] = ['d.campaign_id = $1', 'd.status = $2'];
  const params: unknown[] = [campaignId, DonationStatus.COMPLETED];
  let paramIndex = 3;

  // Count total
  const countResult = await query(
    `SELECT COUNT(*) AS total FROM donations d WHERE ${conditions.join(' AND ')}`,
    params,
  );

  const total = Number((countResult.rows[0] as { total: string }).total);
  const totalPages = Math.ceil(total / limit);

  // Fetch paginated rows
  const dataResult = await query(
    `SELECT d.*
     FROM donations d
     WHERE ${conditions.join(' AND ')}
     ORDER BY d.${sortBy} ${sortOrder}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset],
  );

  const data = (dataResult.rows as DonationRow[]).map((row) =>
    maskAnonymousDonation(toDonation(row)),
  );

  return {
    data,
    pagination: { page, limit, total, totalPages },
  };
}

// ============================================================
// LIST MY DONATIONS
// ============================================================

/**
 * Lists all donations made by the authenticated user, joined with
 * campaign data. Does not mask anonymous donations since the user
 * is viewing their own history.
 */
export async function listMyDonations(
  userId: string,
  filters: DonationListQuery,
): Promise<{
  data: DonationWithCampaignRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;
  const sortBy = filters.sort_by === 'amount' ? 'amount' : 'created_at';
  const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE clauses
  const conditions: string[] = ['d.donor_id = $1'];
  const params: unknown[] = [userId];
  let paramIndex = 2;

  if (filters.status) {
    conditions.push(`d.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  // Count total
  const countResult = await query(
    `SELECT COUNT(*) AS total
     FROM donations d
     WHERE ${conditions.join(' AND ')}`,
    params,
  );

  const total = Number((countResult.rows[0] as { total: string }).total);
  const totalPages = Math.ceil(total / limit);

  // Fetch paginated rows with campaign data
  const dataResult = await query(
    `SELECT d.*, c.title AS campaign_title, c.cover_image_url AS campaign_cover_image_url
     FROM donations d
     JOIN campaigns c ON c.id = d.campaign_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY d.${sortBy} ${sortOrder}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset],
  );

  const data = (dataResult.rows as DonationWithCampaignRow[]).map((row) => ({
    ...toDonation(row),
    campaign_title: row.campaign_title,
    campaign_cover_image_url: row.campaign_cover_image_url,
  })) as DonationWithCampaignRow[];

  return {
    data,
    pagination: { page, limit, total, totalPages },
  };
}

// ============================================================
// GET RECEIPT
// ============================================================

/**
 * Downloads a donation receipt PDF. Only the donor who made the
 * donation is allowed to access the receipt.
 */
export async function getReceipt(
  donationId: string,
  userId: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  // Verify donation belongs to user
  const donationResult = await query(
    `SELECT donor_id FROM donations WHERE id = $1`,
    [donationId],
  );

  if (donationResult.rows.length === 0) {
    throw new NotFoundError('Donation not found');
  }

  const donation = donationResult.rows[0] as { donor_id: string };

  if (donation.donor_id !== userId) {
    throw new ForbiddenError('You do not have access to this receipt');
  }

  // Fetch receipt record
  const receiptResult = await query(
    `SELECT * FROM donation_receipts WHERE donation_id = $1`,
    [donationId],
  );

  if (receiptResult.rows.length === 0) {
    throw new NotFoundError('Receipt not found');
  }

  const receipt = receiptResult.rows[0] as DonationReceiptRow;

  const buffer = await storageService.getPrivate(receipt.file_url);

  return {
    buffer,
    fileName: `receipt-${donationId.slice(0, 8)}.pdf`,
  };
}
