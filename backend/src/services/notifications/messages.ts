import { env } from '../../config/env.js';
import type { EventPayload } from './events.js';

/**
 * Localized short-form copy for SMS + Telegram channels.
 *
 * Email channel uses React Email templates (in backend/src/emails/) and
 * does NOT go through this file. SMS keeps the body under ~160 chars to
 * fit a single Eskiz segment; Telegram uses HTML for bold/links.
 */

export type Locale = 'uz' | 'ru' | 'en';

const SUPPORTED_LOCALES: readonly Locale[] = ['uz', 'ru', 'en'];

export function normalizeLocale(input: string | null | undefined): Locale {
  if (input && (SUPPORTED_LOCALES as readonly string[]).includes(input)) {
    return input as Locale;
  }
  return 'uz';
}

const APP_BASE = env.APP_BASE_URL.replace(/\/$/, '');

/**
 * Format a UZS amount with thousands separator, no decimals.
 */
function fmtUzs(amount: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(amount));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ============================================================
// donation_completed (donor)
// ============================================================

const donationCompletedSms: Record<Locale, (amount: string, title: string) => string> = {
  uz: (a, t) => `Sahovat: "${t}" kampaniyasiga ${a} so'm xayriyangiz qabul qilindi. Rahmat!`,
  ru: (a, t) => `Sahovat: Ваше пожертвование ${a} сум для "${t}" получено. Спасибо!`,
  en: (a, t) => `Sahovat: Your ${a} UZS donation to "${t}" was received. Thank you!`,
};

const donationCompletedTg: Record<Locale, (amount: string, title: string, link: string, receiptLink: string) => string> = {
  uz: (a, t, l, r) =>
    `❤️ <b>Xayriyangiz qabul qilindi</b>\n\nSiz <b>"${t}"</b> kampaniyasiga <b>${a} so'm</b> xayriya qildingiz.\n\n<a href="${r}">Kvitansiyani yuklab olish</a> · <a href="${l}">Kampaniyani ko'rish</a>`,
  ru: (a, t, l, r) =>
    `❤️ <b>Пожертвование принято</b>\n\nВы пожертвовали <b>${a} сум</b> кампании <b>"${t}"</b>.\n\n<a href="${r}">Скачать квитанцию</a> · <a href="${l}">Открыть кампанию</a>`,
  en: (a, t, l, r) =>
    `❤️ <b>Donation received</b>\n\nYou donated <b>${a} UZS</b> to <b>"${t}"</b>.\n\n<a href="${r}">Download receipt</a> · <a href="${l}">View campaign</a>`,
};

// ============================================================
// campaign_verified (organizer)
// ============================================================

const campaignVerifiedSms: Record<Locale, (title: string) => string> = {
  uz: (t) => `Sahovat: "${t}" kampaniyangiz tasdiqlandi va faollashtirildi.`,
  ru: (t) => `Sahovat: Ваша кампания "${t}" подтверждена и активирована.`,
  en: (t) => `Sahovat: Your campaign "${t}" was approved and is now live.`,
};

const campaignVerifiedTg: Record<Locale, (title: string, link: string) => string> = {
  uz: (t, l) =>
    `🎉 <b>Kampaniyangiz faol!</b>\n\n<b>"${t}"</b> kampaniyangiz tasdiqlandi va endi xayriya qabul qilmoqda.\n\n<a href="${l}">Kampaniyani boshqarish</a>`,
  ru: (t, l) =>
    `🎉 <b>Ваша кампания активна!</b>\n\nКампания <b>"${t}"</b> прошла проверку и теперь принимает пожертвования.\n\n<a href="${l}">Управление кампанией</a>`,
  en: (t, l) =>
    `🎉 <b>Your campaign is live!</b>\n\n<b>"${t}"</b> has been approved and is now accepting donations.\n\n<a href="${l}">Manage campaign</a>`,
};

// ============================================================
// withdrawal_status_changed (organizer)
// ============================================================

const withdrawalSms: Record<Locale, (status: string, amount: string) => string> = {
  uz: (s, a) => `Sahovat: ${a} so'm pul yechish so'rovingiz holati: ${s}.`,
  ru: (s, a) => `Sahovat: Статус вашего запроса на вывод ${a} сум: ${s}.`,
  en: (s, a) => `Sahovat: Your ${a} UZS withdrawal request is now ${s}.`,
};

const withdrawalTg: Record<Locale, (status: string, amount: string, link: string, txRef: string | null) => string> = {
  uz: (s, a, l, ref) =>
    `🏦 <b>Pul yechish: ${s}</b>\n\nSummasi: <b>${a} so'm</b>${ref ? `\nTransaksiya: <code>${escapeHtml(ref)}</code>` : ''}\n\n<a href="${l}">Tafsilotlar</a>`,
  ru: (s, a, l, ref) =>
    `🏦 <b>Вывод: ${s}</b>\n\nСумма: <b>${a} сум</b>${ref ? `\nТранзакция: <code>${escapeHtml(ref)}</code>` : ''}\n\n<a href="${l}">Подробнее</a>`,
  en: (s, a, l, ref) =>
    `🏦 <b>Withdrawal ${s}</b>\n\nAmount: <b>${a} UZS</b>${ref ? `\nReference: <code>${escapeHtml(ref)}</code>` : ''}\n\n<a href="${l}">View details</a>`,
};

const withdrawalStatusLabels: Record<Locale, Record<'approved' | 'rejected' | 'completed', string>> = {
  uz: { approved: 'tasdiqlandi', rejected: 'rad etildi', completed: 'bajarildi' },
  ru: { approved: 'одобрен', rejected: 'отклонён', completed: 'выполнен' },
  en: { approved: 'approved', rejected: 'rejected', completed: 'completed' },
};

// ============================================================
// recurring_charge_succeeded (donor)
// ============================================================

const recurringSuccessSms: Record<Locale, (amount: string) => string> = {
  uz: (a) => `Sahovat: Avtomatik xayriyangiz ${a} so'm muvaffaqiyatli o'tdi.`,
  ru: (a) => `Sahovat: Ваш автоплатёж ${a} сум успешно прошёл.`,
  en: (a) => `Sahovat: Your recurring donation of ${a} UZS was charged successfully.`,
};

const recurringSuccessTg: Record<Locale, (amount: string, link: string) => string> = {
  uz: (a, l) =>
    `🔁 <b>Avtomatik xayriya qabul qilindi</b>\n\n<b>${a} so'm</b> muvaffaqiyatli o'tdi.\n\n<a href="${l}">Obunani boshqarish</a>`,
  ru: (a, l) =>
    `🔁 <b>Автоплатёж выполнен</b>\n\n<b>${a} сум</b> списано успешно.\n\n<a href="${l}">Управлять подпиской</a>`,
  en: (a, l) =>
    `🔁 <b>Recurring donation processed</b>\n\n<b>${a} UZS</b> was charged successfully.\n\n<a href="${l}">Manage subscription</a>`,
};

// ============================================================
// recurring_charge_failed (donor)
// ============================================================

const recurringFailSms: Record<Locale, (failureCount: number, paused: boolean) => string> = {
  uz: (n, p) =>
    p
      ? `Sahovat: Avtomatik xayriyangiz 3 marta xato berdi va to'xtatildi. Iltimos, to'lov usulini yangilang.`
      : `Sahovat: Avtomatik xayriyangiz amalga oshmadi (${n}/3). Ertaga yana urinib ko'ramiz.`,
  ru: (n, p) =>
    p
      ? `Sahovat: Автоплатёж приостановлен после 3 неудач. Пожалуйста, обновите способ оплаты.`
      : `Sahovat: Автоплатёж не прошёл (${n}/3). Повторим завтра.`,
  en: (n, p) =>
    p
      ? `Sahovat: Your recurring donation was paused after 3 failed attempts. Please update your payment method.`
      : `Sahovat: Your recurring donation failed (${n}/3). We will retry tomorrow.`,
};

const recurringFailTg: Record<Locale, (failureCount: number, paused: boolean, link: string) => string> = {
  uz: (n, p, l) =>
    p
      ? `⚠️ <b>Avtomatik xayriya to'xtatildi</b>\n\n3 marta urinish xato berdi. Iltimos, to'lov kartasini yangilang.\n\n<a href="${l}">To'lov usulini yangilash</a>`
      : `⚠️ <b>Avtomatik xayriya xatoligi</b>\n\nUrinish ${n}/3. Ertaga yana sinab ko'ramiz.\n\n<a href="${l}">To'lov usulini yangilash</a>`,
  ru: (n, p, l) =>
    p
      ? `⚠️ <b>Автоплатёж приостановлен</b>\n\nНе удалось списать 3 раза подряд. Обновите карту.\n\n<a href="${l}">Обновить способ оплаты</a>`
      : `⚠️ <b>Автоплатёж не прошёл</b>\n\nПопытка ${n}/3. Повторим завтра.\n\n<a href="${l}">Обновить способ оплаты</a>`,
  en: (n, p, l) =>
    p
      ? `⚠️ <b>Recurring donation paused</b>\n\nFailed 3 attempts in a row. Please update your card.\n\n<a href="${l}">Update payment method</a>`
      : `⚠️ <b>Recurring donation failed</b>\n\nAttempt ${n}/3. Retrying tomorrow.\n\n<a href="${l}">Update payment method</a>`,
};

// ============================================================
// campaign_milestone_reached (organizer)
// ============================================================

const milestoneSms: Record<Locale, (pct: number, title: string) => string> = {
  uz: (p, t) => `Sahovat: "${t}" kampaniyangiz ${p}% maqsadga yetdi!`,
  ru: (p, t) => `Sahovat: Ваша кампания "${t}" достигла ${p}% от цели!`,
  en: (p, t) => `Sahovat: Your campaign "${t}" has reached ${p}% of its goal!`,
};

const milestoneTg: Record<Locale, (pct: number, title: string, link: string) => string> = {
  uz: (p, t, l) =>
    `🏆 <b>${p}% maqsadga yetdingiz!</b>\n\n<b>"${t}"</b> kampaniyangiz qo'llab-quvvatlanmoqda.\n\n<a href="${l}">Ulashish</a>`,
  ru: (p, t, l) =>
    `🏆 <b>Достигнут рубеж ${p}%!</b>\n\nКампания <b>"${t}"</b> продолжает набирать поддержку.\n\n<a href="${l}">Поделиться</a>`,
  en: (p, t, l) =>
    `🏆 <b>${p}% milestone reached!</b>\n\n<b>"${t}"</b> is gaining momentum.\n\n<a href="${l}">Share campaign</a>`,
};

// ============================================================
// contact_message_received (admin or submitter)
// ============================================================

const contactSms: Record<Locale, (refNumber: string) => string> = {
  uz: (r) => `Sahovat: Murojaatingiz qabul qilindi. Raqam: ${r}. Tez orada javob beramiz.`,
  ru: (r) => `Sahovat: Ваше обращение принято. Номер: ${r}. Скоро ответим.`,
  en: (r) => `Sahovat: Your message was received. Reference: ${r}. We'll reply soon.`,
};

const contactTg: Record<Locale, (refNumber: string) => string> = {
  uz: (r) => `📩 Murojaatingiz qabul qilindi. Raqam: <code>${escapeHtml(r)}</code>.`,
  ru: (r) => `📩 Ваше обращение принято. Номер: <code>${escapeHtml(r)}</code>.`,
  en: (r) => `📩 Your message was received. Reference: <code>${escapeHtml(r)}</code>.`,
};

// ============================================================
// PUBLIC BUILDERS
// ============================================================

/**
 * Build the SMS body for an event. Always returns a single-segment-friendly
 * plain-text string.
 */
export function buildSmsBody<E extends keyof EventPayload>(
  event: E,
  payload: EventPayload[E],
  locale: Locale,
): string {
  switch (event) {
    case 'donation_completed': {
      const p = payload as EventPayload['donation_completed'];
      return donationCompletedSms[locale](fmtUzs(p.amount), p.campaignTitle);
    }
    case 'campaign_verified': {
      const p = payload as EventPayload['campaign_verified'];
      return campaignVerifiedSms[locale](p.campaignTitle);
    }
    case 'withdrawal_status_changed': {
      const p = payload as EventPayload['withdrawal_status_changed'];
      return withdrawalSms[locale](
        withdrawalStatusLabels[locale][p.status],
        fmtUzs(p.amount),
      );
    }
    case 'recurring_charge_succeeded': {
      const p = payload as EventPayload['recurring_charge_succeeded'];
      return recurringSuccessSms[locale](fmtUzs(p.amount));
    }
    case 'recurring_charge_failed': {
      const p = payload as EventPayload['recurring_charge_failed'];
      return recurringFailSms[locale](p.failureCount, p.paused);
    }
    case 'campaign_milestone_reached': {
      const p = payload as EventPayload['campaign_milestone_reached'];
      return milestoneSms[locale](p.percentage, p.campaignTitle);
    }
    case 'contact_message_received': {
      const p = payload as EventPayload['contact_message_received'];
      return contactSms[locale](p.referenceNumber);
    }
    default: {
      // Exhaustiveness guard.
      const _exhaustive: never = event as never;
      throw new Error(`Unhandled SMS event: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Build the Telegram body (HTML) for an event.
 */
export function buildTelegramBody<E extends keyof EventPayload>(
  event: E,
  payload: EventPayload[E],
  locale: Locale,
): string {
  switch (event) {
    case 'donation_completed': {
      const p = payload as EventPayload['donation_completed'];
      return donationCompletedTg[locale](
        fmtUzs(p.amount),
        escapeHtml(p.campaignTitle),
        `${APP_BASE}/campaigns/${p.campaignId}`,
        `${APP_BASE}/my-donations/${p.donationId}/receipt`,
      );
    }
    case 'campaign_verified': {
      const p = payload as EventPayload['campaign_verified'];
      return campaignVerifiedTg[locale](
        escapeHtml(p.campaignTitle),
        `${APP_BASE}/campaigns/${p.campaignId}/manage`,
      );
    }
    case 'withdrawal_status_changed': {
      const p = payload as EventPayload['withdrawal_status_changed'];
      return withdrawalTg[locale](
        withdrawalStatusLabels[locale][p.status],
        fmtUzs(p.amount),
        `${APP_BASE}/dashboard/withdrawals`,
        p.transactionReference,
      );
    }
    case 'recurring_charge_succeeded': {
      const p = payload as EventPayload['recurring_charge_succeeded'];
      return recurringSuccessTg[locale](
        fmtUzs(p.amount),
        `${APP_BASE}/dashboard/recurring`,
      );
    }
    case 'recurring_charge_failed': {
      const p = payload as EventPayload['recurring_charge_failed'];
      return recurringFailTg[locale](
        p.failureCount,
        p.paused,
        `${APP_BASE}/dashboard/recurring`,
      );
    }
    case 'campaign_milestone_reached': {
      const p = payload as EventPayload['campaign_milestone_reached'];
      return milestoneTg[locale](
        p.percentage,
        escapeHtml(p.campaignTitle),
        `${APP_BASE}/campaigns/${p.campaignId}`,
      );
    }
    case 'contact_message_received': {
      const p = payload as EventPayload['contact_message_received'];
      return contactTg[locale](p.referenceNumber);
    }
    default: {
      const _exhaustive: never = event as never;
      throw new Error(`Unhandled Telegram event: ${String(_exhaustive)}`);
    }
  }
}
