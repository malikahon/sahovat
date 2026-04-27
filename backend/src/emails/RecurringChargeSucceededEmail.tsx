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
  | 'amountLabel'
  | 'campaignLabel'
  | 'manageCta'
  | 'thanks';

const COPY: LocaleDict<Key> = {
  uz: {
    preview: 'Avtomatik xayriyangiz amalga oshdi',
    heading: 'Avtomatik xayriya qabul qilindi',
    subhead:
      'Saxiyligingiz uchun rahmat. Avtomatik xayriyangiz muvaffaqiyatli amalga oshirildi.',
    amountLabel: 'Summa',
    campaignLabel: 'Kampaniya',
    manageCta: 'Obunani boshqarish',
    thanks: 'Yaxshilik qilganingiz uchun rahmat.',
  },
  ru: {
    preview: 'Автоплатёж выполнен успешно',
    heading: 'Автоплатёж выполнен',
    subhead:
      'Спасибо за вашу щедрость. Ваш автоплатёж был успешно выполнен.',
    amountLabel: 'Сумма',
    campaignLabel: 'Кампания',
    manageCta: 'Управлять подпиской',
    thanks: 'Спасибо за ваш вклад.',
  },
  en: {
    preview: 'Your recurring donation was processed',
    heading: 'Recurring donation processed',
    subhead:
      'Thank you for your generosity. Your recurring donation was processed successfully.',
    amountLabel: 'Amount',
    campaignLabel: 'Campaign',
    manageCta: 'Manage subscription',
    thanks: 'Thank you for making a difference.',
  },
};

export interface RecurringChargeSucceededEmailProps {
  recurringId: string;
  donationId: string;
  amount: number;
  campaignTitle: string | null;
  locale?: EmailLocale | string | null;
}

export function RecurringChargeSucceededEmail({
  recurringId: _recurringId,
  donationId: _donationId,
  amount,
  campaignTitle,
  locale,
}: RecurringChargeSucceededEmailProps) {
  const loc = normalizeEmailLocale(locale ?? null);
  const baseUrl = env.APP_BASE_URL.replace(/\/$/, '');
  const manageUrl = `${baseUrl}/dashboard/recurring`;

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
        🔁 {t(COPY, loc, 'heading')}
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
            margin: '4px 0 16px 0',
            fontSize: '24px',
            fontWeight: 700,
            color: EMAIL_COLORS.brand,
          }}
        >
          {formatUzs(amount)} UZS
        </Text>

        {campaignTitle ? (
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
              {t(COPY, loc, 'campaignLabel')}
            </Text>
            <Text
              style={{
                margin: '4px 0 0 0',
                fontSize: '15px',
                fontWeight: 600,
                color: EMAIL_COLORS.text,
                lineHeight: '20px',
              }}
            >
              {campaignTitle}
            </Text>
          </>
        ) : null}
      </Section>

      <Section style={{ textAlign: 'center', margin: '0' }}>
        <Button
          href={manageUrl}
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
          {t(COPY, loc, 'manageCta')}
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
        {t(COPY, loc, 'thanks')}
      </Text>
    </EmailLayout>
  );
}

RecurringChargeSucceededEmail.PreviewProps = {
  recurringId: '00000000-0000-0000-0000-000000000005',
  donationId: '00000000-0000-0000-0000-000000000006',
  amount: 50_000,
  campaignTitle: 'Help Aziza recover from surgery',
  locale: 'en',
} satisfies RecurringChargeSucceededEmailProps;

export default RecurringChargeSucceededEmail;
