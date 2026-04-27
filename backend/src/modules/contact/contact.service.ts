import * as React from 'react';
import { randomBytes } from 'crypto';
import { query } from '../../config/database.js';
import { emailService } from '../../services/email.service.js';
import { ContactReplyEmail } from '../../emails/ContactReplyEmail.js';
import { notifyContactMessage } from '../../services/notifications/admin-feed.js';
import type { SubmitContactDto } from './contact.validation.js';

interface ContactInsert extends SubmitContactDto {
  user_id: string | null;
  source_ip: string | null;
}

export interface ContactSubmissionResult {
  id: string;
  reference_code: string;
  email_reply_sent: boolean;
}

/**
 * Generate a short, human-friendly reference code.
 *   Format: SAH-XXXXXXXX (8 hex chars).
 * Collision is astronomically unlikely; the unique index on
 * `contact_messages.reference_code` is the final guard.
 */
function generateReferenceCode(): string {
  return `SAH-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function submitContactMessage(
  input: ContactInsert,
): Promise<ContactSubmissionResult> {
  const referenceCode = generateReferenceCode();

  const result = await query(
    `INSERT INTO contact_messages
       (user_id, name, email, phone, subject, message, reference_code, source_ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, reference_code`,
    [
      input.user_id,
      input.name,
      input.email ?? null,
      input.phone ?? null,
      input.subject,
      input.message,
      referenceCode,
      input.source_ip,
    ],
  );

  const row = result.rows[0] as { id: string; reference_code: string };

  // Fire-and-forget admin Telegram alert. Never blocks the request.
  void notifyContactMessage({
    referenceNumber: row.reference_code,
    submitterEmail: input.email ?? null,
    submitterName: input.name,
    preview: input.message,
  }).catch((err) => {
    console.error('[Sahovat] [contact] admin alert failed:', err);
  });

  // If submitter provided an email, send the auto-reply directly via the
  // email service. The notification dispatcher requires a user_id, so
  // for guest submissions we send the email out-of-band.
  let emailReplySent = false;
  if (input.email) {
    try {
      await emailService.sendEmail({
        to: input.email,
        subject:
          input.locale === 'ru'
            ? 'Sahovat: ваше обращение принято'
            : input.locale === 'en'
            ? 'Sahovat: We received your message'
            : 'Sahovat: murojaatingiz qabul qilindi',
        react: React.createElement(ContactReplyEmail, {
          referenceNumber: row.reference_code,
          submitterName: input.name,
          locale: input.locale,
        }),
        headers: {
          'X-Sahovat-Reference': row.reference_code,
        },
      });
      emailReplySent = true;
    } catch (err) {
      console.error('[Sahovat] [contact] auto-reply email failed:', err);
    }
  }

  return {
    id: row.id,
    reference_code: row.reference_code,
    email_reply_sent: emailReplySent,
  };
}
