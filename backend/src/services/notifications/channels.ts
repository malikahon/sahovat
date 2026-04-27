import * as React from 'react';
import { smsService } from '../sms.service.js';
import { telegramService } from '../telegram.service.js';
import { emailService } from '../email.service.js';
import {
  buildSmsBody,
  buildTelegramBody,
  normalizeLocale,
  type Locale,
} from './messages.js';
import type { EventPayload } from './events.js';
import { DonationReceiptEmail } from '../../emails/DonationReceiptEmail.js';
import { CampaignVerifiedEmail } from '../../emails/CampaignVerifiedEmail.js';
import { WithdrawalStatusEmail } from '../../emails/WithdrawalStatusEmail.js';
import { RecurringChargeSucceededEmail } from '../../emails/RecurringChargeSucceededEmail.js';
import { RecurringChargeFailedEmail } from '../../emails/RecurringChargeFailedEmail.js';
import { CampaignMilestoneEmail } from '../../emails/CampaignMilestoneEmail.js';
import { ContactReplyEmail } from '../../emails/ContactReplyEmail.js';

/**
 * Per-channel send adapters used by NotificationDispatcher and the retry queue.
 *
 * Each function:
 *   - throws on failure (caller decides retry policy)
 *   - resolves on success
 *   - is purely concerned with shaping the payload for its channel
 */

// ============================================================
// SMS
// ============================================================

export async function sendSms<E extends keyof EventPayload>(args: {
  phone: string;
  event: E;
  payload: EventPayload[E];
  locale: string;
}): Promise<void> {
  const loc = normalizeLocale(args.locale);
  const body = buildSmsBody(args.event, args.payload, loc);
  await smsService.sendNotification(args.phone, body);
}

// ============================================================
// TELEGRAM
// ============================================================

export async function sendTelegram<E extends keyof EventPayload>(args: {
  chatId: string;
  event: E;
  payload: EventPayload[E];
  locale: string;
}): Promise<void> {
  const loc = normalizeLocale(args.locale);
  const text = buildTelegramBody(args.event, args.payload, loc);
  await telegramService.sendMessage(args.chatId, {
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

// ============================================================
// EMAIL
// ============================================================

interface EmailEventCopy {
  subject: Record<Locale, string>;
}

const EMAIL_COPY: Record<keyof EventPayload, EmailEventCopy> = {
  donation_completed: {
    subject: {
      uz: 'Sahovat: xayriyangiz uchun rahmat',
      ru: 'Sahovat: спасибо за ваше пожертвование',
      en: 'Sahovat: Thank you for your donation',
    },
  },
  campaign_verified: {
    subject: {
      uz: 'Sahovat: kampaniyangiz tasdiqlandi',
      ru: 'Sahovat: ваша кампания подтверждена',
      en: 'Sahovat: Your campaign was approved',
    },
  },
  withdrawal_status_changed: {
    subject: {
      uz: 'Sahovat: pul yechish holati yangilandi',
      ru: 'Sahovat: статус вывода обновлён',
      en: 'Sahovat: Your withdrawal status changed',
    },
  },
  recurring_charge_succeeded: {
    subject: {
      uz: 'Sahovat: avtomatik xayriya amalga oshdi',
      ru: 'Sahovat: автоплатёж выполнен',
      en: 'Sahovat: Recurring donation processed',
    },
  },
  recurring_charge_failed: {
    subject: {
      uz: 'Sahovat: avtomatik xayriya xatoligi',
      ru: 'Sahovat: ошибка автоплатежа',
      en: 'Sahovat: Recurring donation failed',
    },
  },
  campaign_milestone_reached: {
    subject: {
      uz: 'Sahovat: kampaniyangiz yangi bosqichga yetdi',
      ru: 'Sahovat: ваша кампания достигла нового рубежа',
      en: 'Sahovat: Your campaign hit a milestone',
    },
  },
  contact_message_received: {
    subject: {
      uz: 'Sahovat: murojaatingiz qabul qilindi',
      ru: 'Sahovat: ваше обращение принято',
      en: 'Sahovat: We received your message',
    },
  },
};

function buildEmailReact<E extends keyof EventPayload>(
  event: E,
  payload: EventPayload[E],
  locale: Locale,
): React.ReactElement {
  switch (event) {
    case 'donation_completed': {
      const p = payload as EventPayload['donation_completed'];
      return React.createElement(DonationReceiptEmail, {
        donationId: p.donationId,
        campaignId: p.campaignId,
        campaignTitle: p.campaignTitle,
        amount: p.amount,
        donatedAt: new Date().toISOString(),
        locale,
      });
    }
    case 'campaign_verified': {
      const p = payload as EventPayload['campaign_verified'];
      return React.createElement(CampaignVerifiedEmail, {
        campaignId: p.campaignId,
        campaignTitle: p.campaignTitle,
        locale,
      });
    }
    case 'withdrawal_status_changed': {
      const p = payload as EventPayload['withdrawal_status_changed'];
      return React.createElement(WithdrawalStatusEmail, {
        withdrawalId: p.withdrawalId,
        status: p.status,
        amount: p.amount,
        transactionReference: p.transactionReference,
        adminNotes: p.adminNotes,
        locale,
      });
    }
    case 'recurring_charge_succeeded': {
      const p = payload as EventPayload['recurring_charge_succeeded'];
      return React.createElement(RecurringChargeSucceededEmail, {
        recurringId: p.recurringId,
        donationId: p.donationId,
        amount: p.amount,
        campaignTitle: p.campaignTitle,
        locale,
      });
    }
    case 'recurring_charge_failed': {
      const p = payload as EventPayload['recurring_charge_failed'];
      return React.createElement(RecurringChargeFailedEmail, {
        recurringId: p.recurringId,
        failureCount: p.failureCount,
        paused: p.paused,
        locale,
      });
    }
    case 'campaign_milestone_reached': {
      const p = payload as EventPayload['campaign_milestone_reached'];
      return React.createElement(CampaignMilestoneEmail, {
        campaignId: p.campaignId,
        campaignTitle: p.campaignTitle,
        percentage: p.percentage,
        currentAmount: p.currentAmount,
        goalAmount: p.goalAmount,
        locale,
      });
    }
    case 'contact_message_received': {
      const p = payload as EventPayload['contact_message_received'];
      return React.createElement(ContactReplyEmail, {
        referenceNumber: p.referenceNumber,
        submitterName: p.submitterName,
        locale,
      });
    }
    default: {
      const _exhaustive: never = event as never;
      throw new Error(`Unhandled email event: ${String(_exhaustive)}`);
    }
  }
}

export async function sendEmail<E extends keyof EventPayload>(args: {
  to: string;
  event: E;
  payload: EventPayload[E];
  locale: string;
}): Promise<void> {
  const loc = normalizeLocale(args.locale);
  const subject = EMAIL_COPY[args.event].subject[loc];
  const react = buildEmailReact(args.event, args.payload, loc);
  await emailService.sendEmail({
    to: args.to,
    subject,
    react,
  });
}
