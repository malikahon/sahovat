import * as React from 'react';
import { Button, Heading, Section, Text } from '@react-email/components';
import { EmailLayout, EMAIL_COLORS } from './_layout.js';
import { env } from '../config/env.js';
import {
  type EmailLocale,
  type LocaleDict,
  normalizeEmailLocale,
  t,
  formatUzs,
} from './_i18n.js';

type Status = 'approved' | 'rejected' | 'completed';

type Key =
  | 'previewApproved'
  | 'previewRejected'
  | 'previewCompleted'
  | 'headingApproved'
  | 'headingRejected'
  | 'headingCompleted'
  | 'subheadApproved'
  | 'subheadRejected'
  | 'subheadCompleted'
  | 'amountLabel'
  | 'transactionLabel'
  | 'rejectionReasonLabel'
  | 'viewCta';

const COPY: LocaleDict<Key> = {
  uz: {
    previewApproved: 'Pul yechish so\u2018rovingiz tasdiqlandi',
    previewRejected: 'Pul yechish so\u2018rovingiz rad etildi',
    previewCompleted: 'Pul yechishingiz bajarildi',
    headingApproved: 'So\u2018rovingiz tasdiqlandi',
    headingRejected: 'So\u2018rovingiz rad etildi',
    headingCompleted: 'Pul yechish bajarildi',
    subheadApproved:
      'Sizning pul yechish so\u2018rovingiz ko\u2018rib chiqildi va tasdiqlandi. Tez orada to\u2018lov amalga oshiriladi.',
    subheadRejected:
      'Afsuski, so\u2018rovingiz rad etildi. Sabablari uchun pastga qarang yoki yordam bilan bog\u2018laning.',
    subheadCompleted:
      'Pul yechishingiz muvaffaqiyatli bajarildi. Mablag\u2018 sizning hisobingizga o\u2018tkazildi.',
    amountLabel: 'Summa',
    transactionLabel: 'Transaksiya raqami',
    rejectionReasonLabel: 'Sabab',
    viewCta: 'Tafsilotlarni ko\u2018rish',
  },
  ru: {
    previewApproved: 'Ваш запрос на вывод одобрен',
    previewRejected: 'Ваш запрос на вывод отклонён',
    previewCompleted: 'Ваш вывод выполнен',
    headingApproved: 'Запрос одобрен',
    headingRejected: 'Запрос отклонён',
    headingCompleted: 'Вывод выполнен',
    subheadApproved:
      'Ваш запрос на вывод средств был рассмотрен и одобрен. Перевод будет выполнен в ближайшее время.',
    subheadRejected:
      'К сожалению, ваш запрос отклонён. Подробности см. ниже или свяжитесь с поддержкой.',
    subheadCompleted:
      'Ваш вывод успешно выполнен. Средства переведены на указанный счёт.',
    amountLabel: 'Сумма',
    transactionLabel: 'Номер транзакции',
    rejectionReasonLabel: 'Причина',
    viewCta: 'Посмотреть детали',
  },
  en: {
    previewApproved: 'Your withdrawal request was approved',
    previewRejected: 'Your withdrawal request was rejected',
    previewCompleted: 'Your withdrawal is complete',
    headingApproved: 'Request approved',
    headingRejected: 'Request rejected',
    headingCompleted: 'Withdrawal complete',
    subheadApproved:
      'Your withdrawal request has been reviewed and approved. The transfer will be processed shortly.',
    subheadRejected:
      'Unfortunately your request was rejected. See details below or contact support.',
    subheadCompleted:
      'Your withdrawal has been completed. Funds have been transferred to the destination account.',
    amountLabel: 'Amount',
    transactionLabel: 'Transaction reference',
    rejectionReasonLabel: 'Reason',
    viewCta: 'View details',
  },
};

const STATUS_ICONS: Record<Status, string> = {
  approved: '✅',
  rejected: '⚠️',
  completed: '🏦',
};

export interface WithdrawalStatusEmailProps {
  withdrawalId: string;
  status: Status;
  amount: number;
  transactionReference: string | null;
  adminNotes: string | null;
  locale?: EmailLocale | string | null;
}

export function WithdrawalStatusEmail({
  withdrawalId: _withdrawalId,
  status,
  amount,
  transactionReference,
  adminNotes,
  locale,
}: WithdrawalStatusEmailProps) {
  const loc = normalizeEmailLocale(locale ?? null);
  const baseUrl = env.APP_BASE_URL.replace(/\/$/, '');
  const dashboardUrl = `${baseUrl}/dashboard/withdrawals`;

  const previewKey: Key = (`preview${cap(status)}` as Key);
  const headingKey: Key = (`heading${cap(status)}` as Key);
  const subheadKey: Key = (`subhead${cap(status)}` as Key);

  return (
    <EmailLayout previewText={t(COPY, loc, previewKey)}>
      <Heading
        as="h1"
        style={{
          margin: 0,
          fontSize: '22px',
          fontWeight: 700,
          color: EMAIL_COLORS.text,
        }}
      >
        {STATUS_ICONS[status]} {t(COPY, loc, headingKey)}
      </Heading>

      <Text
        style={{
          margin: '12px 0 24px 0',
          fontSize: '14px',
          color: EMAIL_COLORS.muted,
          lineHeight: '22px',
        }}
      >
        {t(COPY, loc, subheadKey)}
      </Text>

      <Section
        style={{
          padding: '16px 20px',
          backgroundColor: EMAIL_COLORS.background,
          borderRadius: '8px',
          border: `1px solid ${EMAIL_COLORS.border}`,
          marginBottom: '24px',
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: '12px',
            color: EMAIL_COLORS.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {t(COPY, loc, 'amountLabel')}
        </Text>
        <Text
          style={{
            margin: '4px 0 12px 0',
            fontSize: '20px',
            fontWeight: 700,
            color: EMAIL_COLORS.brand,
          }}
        >
          {formatUzs(amount)} UZS
        </Text>

        {status === 'completed' && transactionReference ? (
          <>
            <Text
              style={{
                margin: 0,
                fontSize: '12px',
                color: EMAIL_COLORS.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {t(COPY, loc, 'transactionLabel')}
            </Text>
            <Text
              style={{
                margin: '4px 0 0 0',
                fontSize: '13px',
                fontFamily: '"SFMono-Regular", Consolas, monospace',
                color: EMAIL_COLORS.text,
              }}
            >
              {transactionReference}
            </Text>
          </>
        ) : null}

        {status === 'rejected' && adminNotes ? (
          <>
            <Text
              style={{
                margin: 0,
                fontSize: '12px',
                color: EMAIL_COLORS.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {t(COPY, loc, 'rejectionReasonLabel')}
            </Text>
            <Text
              style={{
                margin: '4px 0 0 0',
                fontSize: '13px',
                color: EMAIL_COLORS.text,
                lineHeight: '20px',
              }}
            >
              {adminNotes}
            </Text>
          </>
        ) : null}
      </Section>

      <Section style={{ textAlign: 'center', margin: '0' }}>
        <Button
          href={dashboardUrl}
          style={{
            backgroundColor: EMAIL_COLORS.brand,
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            padding: '12px 22px',
            borderRadius: '8px',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          {t(COPY, loc, 'viewCta')}
        </Button>
      </Section>
    </EmailLayout>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

WithdrawalStatusEmail.PreviewProps = {
  withdrawalId: '00000000-0000-0000-0000-000000000003',
  status: 'completed',
  amount: 1_500_000,
  transactionReference: 'TXN-9F8E7D6C',
  adminNotes: null,
  locale: 'en',
} satisfies WithdrawalStatusEmailProps;

export default WithdrawalStatusEmail;
