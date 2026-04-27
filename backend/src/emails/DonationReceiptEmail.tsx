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

type Key =
  | 'preview'
  | 'heading'
  | 'subhead'
  | 'campaignLabel'
  | 'amountLabel'
  | 'dateLabel'
  | 'downloadCta'
  | 'viewCampaignCta'
  | 'closing';

const COPY: LocaleDict<Key> = {
  uz: {
    preview: 'Sahovatga xayriyangiz uchun rahmat',
    heading: 'Xayriyangiz qabul qilindi',
    subhead: 'Saxiy yordamingiz uchun rahmat. Quyida xayriyangiz tafsilotlari.',
    campaignLabel: 'Kampaniya',
    amountLabel: 'Summa',
    dateLabel: 'Sana',
    downloadCta: 'Kvitansiyani PDF formatida yuklab olish',
    viewCampaignCta: 'Kampaniyani ko\u2018rish',
    closing: 'Yaxshilik qilganingiz uchun rahmat.',
  },
  ru: {
    preview: 'Спасибо за ваше пожертвование Sahovat',
    heading: 'Пожертвование получено',
    subhead: 'Спасибо за вашу поддержку. Ниже детали вашего пожертвования.',
    campaignLabel: 'Кампания',
    amountLabel: 'Сумма',
    dateLabel: 'Дата',
    downloadCta: 'Скачать квитанцию в PDF',
    viewCampaignCta: 'Открыть кампанию',
    closing: 'Спасибо за ваш вклад.',
  },
  en: {
    preview: 'Thank you for your donation to Sahovat',
    heading: 'Donation received',
    subhead: 'Thank you for your generous support. Below is a summary of your donation.',
    campaignLabel: 'Campaign',
    amountLabel: 'Amount',
    dateLabel: 'Date',
    downloadCta: 'Download PDF receipt',
    viewCampaignCta: 'View campaign',
    closing: 'Thank you for making a difference.',
  },
};

export interface DonationReceiptEmailProps {
  donationId: string;
  campaignId: string;
  campaignTitle: string;
  amount: number;
  /** ISO date string of completion. */
  donatedAt: string;
  locale?: EmailLocale | string | null;
}

export function DonationReceiptEmail({
  donationId,
  campaignId,
  campaignTitle,
  amount,
  donatedAt,
  locale,
}: DonationReceiptEmailProps) {
  const loc = normalizeEmailLocale(locale ?? null);
  const baseUrl = env.APP_BASE_URL.replace(/\/$/, '');
  const receiptUrl = `${baseUrl}/my-donations/${donationId}/receipt`;
  const campaignUrl = `${baseUrl}/campaigns/${campaignId}`;
  const formattedDate = donatedAt.split('T')[0] ?? donatedAt;

  return (
    <EmailLayout previewText={t(COPY, loc, 'preview')}>
      <Heading
        as="h1"
        style={{
          margin: 0,
          fontSize: '22px',
          fontWeight: 700,
          color: EMAIL_COLORS.text,
        }}
      >
        ❤️ {t(COPY, loc, 'heading')}
      </Heading>

      <Text
        style={{
          margin: '12px 0 24px 0',
          fontSize: '14px',
          color: EMAIL_COLORS.muted,
          lineHeight: '22px',
        }}
      >
        {t(COPY, loc, 'subhead')}
      </Text>

      <Section
        style={{
          padding: '20px',
          backgroundColor: EMAIL_COLORS.background,
          borderRadius: '8px',
          border: `1px solid ${EMAIL_COLORS.border}`,
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
          {t(COPY, loc, 'campaignLabel')}
        </Text>
        <Text
          style={{
            margin: '4px 0 16px 0',
            fontSize: '16px',
            fontWeight: 600,
            color: EMAIL_COLORS.text,
            lineHeight: '22px',
          }}
        >
          {campaignTitle}
        </Text>

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
            margin: '4px 0 16px 0',
            fontSize: '24px',
            fontWeight: 700,
            color: EMAIL_COLORS.brand,
          }}
        >
          {formatUzs(amount)} UZS
        </Text>

        <Text
          style={{
            margin: 0,
            fontSize: '12px',
            color: EMAIL_COLORS.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {t(COPY, loc, 'dateLabel')}
        </Text>
        <Text
          style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            color: EMAIL_COLORS.text,
          }}
        >
          {formattedDate}
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '28px 0 12px 0' }}>
        <Button
          href={receiptUrl}
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
          {t(COPY, loc, 'downloadCta')}
        </Button>
      </Section>

      <Section style={{ textAlign: 'center', margin: '0 0 12px 0' }}>
        <Button
          href={campaignUrl}
          style={{
            backgroundColor: '#ffffff',
            color: EMAIL_COLORS.brand,
            fontSize: '14px',
            fontWeight: 600,
            padding: '11px 22px',
            borderRadius: '8px',
            textDecoration: 'none',
            border: `1px solid ${EMAIL_COLORS.brand}`,
            display: 'inline-block',
          }}
        >
          {t(COPY, loc, 'viewCampaignCta')}
        </Button>
      </Section>

      <Text
        style={{
          margin: '24px 0 0 0',
          fontSize: '13px',
          color: EMAIL_COLORS.muted,
          lineHeight: '20px',
        }}
      >
        {t(COPY, loc, 'closing')}
      </Text>
    </EmailLayout>
  );
}

DonationReceiptEmail.PreviewProps = {
  donationId: '00000000-0000-0000-0000-000000000001',
  campaignId: '00000000-0000-0000-0000-000000000002',
  campaignTitle: 'Help Aziza recover from surgery',
  amount: 50000,
  donatedAt: '2026-04-27T12:34:56Z',
  locale: 'en',
} satisfies DonationReceiptEmailProps;

export default DonationReceiptEmail;
