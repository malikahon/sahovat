import { env } from '../../config/env.js';
import { telegramService } from '../telegram.service.js';

/**
 * Admin alert feed — pushes operational notifications (new pending campaign,
 * new withdrawal request, new contact form submission) to a single Telegram
 * group/channel identified by env.TELEGRAM_ADMIN_CHAT_ID.
 *
 * This is NOT user-scoped — it's a global ops feed. It bypasses the
 * NotificationDispatcher and notification_preferences entirely. When
 * TELEGRAM_ADMIN_CHAT_ID is unset, every call is a no-op.
 *
 * Locale is fixed to Uzbek (admin team's working language).
 */

function isEnabled(): boolean {
  return !!env.TELEGRAM_ADMIN_CHAT_ID;
}

async function send(text: string): Promise<void> {
  if (!isEnabled()) return;
  try {
    await telegramService.sendMessage(env.TELEGRAM_ADMIN_CHAT_ID, {
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('[Sahovat] [admin-feed] failed to send:', err);
  }
}

/** Notify admin team that a campaign is pending verification. */
export async function notifyCampaignPending(args: {
  campaignId: string;
  title: string;
  organizerName: string | null;
}): Promise<void> {
  await send(
    `🔍 <b>Yangi kampaniya tekshirishni kutmoqda</b>\n\n` +
      `Sarlavha: <b>${escapeHtml(args.title)}</b>\n` +
      `Tashkilotchi: ${escapeHtml(args.organizerName ?? 'Noma\u2019lum')}\n` +
      `ID: <code>${escapeHtml(args.campaignId)}</code>`,
  );
}

/** Notify admin team that a withdrawal request was submitted. */
export async function notifyWithdrawalSubmitted(args: {
  withdrawalId: string;
  amount: number;
  organizerName: string | null;
}): Promise<void> {
  const formatted = new Intl.NumberFormat('en-US').format(Math.round(args.amount));
  await send(
    `🏦 <b>Yangi pul yechish so'rovi</b>\n\n` +
      `Summa: <b>${formatted} so'm</b>\n` +
      `Tashkilotchi: ${escapeHtml(args.organizerName ?? 'Noma\u2019lum')}\n` +
      `ID: <code>${escapeHtml(args.withdrawalId)}</code>`,
  );
}

/** Notify admin team that a contact-form message arrived. */
export async function notifyContactMessage(args: {
  referenceNumber: string;
  submitterEmail: string | null;
  submitterName: string | null;
  preview: string;
}): Promise<void> {
  await send(
    `📩 <b>Yangi murojaat (Contact form)</b>\n\n` +
      `Raqam: <code>${escapeHtml(args.referenceNumber)}</code>\n` +
      `Yuboruvchi: ${escapeHtml(args.submitterName ?? '-')} ` +
      `${args.submitterEmail ? `&lt;${escapeHtml(args.submitterEmail)}&gt;` : ''}\n` +
      `${escapeHtml(args.preview).slice(0, 280)}`,
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
