import * as React from 'react';
import { Button, Heading, Section, Text } from '@react-email/components';
import { EmailLayout, EMAIL_COLORS } from './_layout.js';
import { env } from '../config/env.js';
import {
  type EmailLocale,
  type LocaleDict,
  normalizeEmailLocale,
  t,
} from './_i18n.js';

type Key =
  | 'preview'
  | 'headingPaused'
  | 'headingFailing'
  | 'subheadPaused'
  | 'subheadFailing'
  | 'attemptsLabel'
  | 'updateCta';

const COPY: LocaleDict<Key> = {
  uz: {
    preview: 'Avtomatik xayriyangizni amalga oshira olmadik',
    headingPaused: 'Avtomatik xayriyangiz to\u2018xtatildi',
    headingFailing: 'Avtomatik xayriyangizda xatolik',
    subheadPaused:
      'Sizning kartangizdan 3 marta pul yechib bo\u2018lmadi, shuning uchun avtomatik xayriya to\u2018xtatildi. Iltimos, to\u2018lov usulini yangilang va obunani qaytadan boshlang.',
    subheadFailing:
      'Karangizdan pul yechib bo\u2018lmadi. Ertaga yana urinib ko\u2018ramiz. Iltimos, kartangiz balansi va amal qilish muddatini tekshiring.',
    attemptsLabel: 'Urinishlar',
    updateCta: 'To\u2018lov usulini yangilash',
  },
  ru: {
    preview: 'Не удалось списать автоплатёж',
    headingPaused: 'Автоплатёж приостановлен',
    headingFailing: 'Ошибка автоплатежа',
    subheadPaused:
      'Не удалось списать средства 3 раза подряд, поэтому автоплатёж приостановлен. Пожалуйста, обновите способ оплаты и возобновите подписку.',
    subheadFailing:
      'Не удалось списать средства с вашей карты. Мы повторим попытку завтра. Проверьте баланс и срок действия карты.',
    attemptsLabel: 'Попытки',
    updateCta: 'Обновить способ оплаты',
  },
  en: {
    preview: 'We could not charge your recurring donation',
    headingPaused: 'Recurring donation paused',
    headingFailing: 'Recurring donation failed',
    subheadPaused:
      'We were unable to charge your card 3 times in a row, so your recurring donation was paused. Please update your payment method and resume the subscription.',
    subheadFailing:
      'We could not charge your card. We will try again tomorrow. Please check your card balance and expiration date.',
    attemptsLabel: 'Attempts',
    updateCta: 'Update payment method',
  },
};

export interface RecurringChargeFailedEmailProps {
  recurringId: string;
  failureCount: number;
  paused: boolean;
  locale?: EmailLocale | string | null;
}

export function RecurringChargeFailedEmail({
  recurringId: _recurringId,
  failureCount,
  paused,
  locale,
}: RecurringChargeFailedEmailProps) {
  const loc = normalizeEmailLocale(locale ?? null);
  const baseUrl = env.APP_BASE_URL.replace(/\/$/, '');
  const updateUrl = `${baseUrl}/dashboard/recurring`;

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
        ⚠️ {t(COPY, loc, paused ? 'headingPaused' : 'headingFailing')}
      </Heading>

      <Text
        style={{
          margin: '12px 0 24px 0',
          fontSize: '14px',
          color: EMAIL_COLORS.muted,
          lineHeight: '22px',
        }}
      >
        {t(COPY, loc, paused ? 'subheadPaused' : 'subheadFailing')}
      </Text>

      <Section
        style={{
          padding: '16px 20px',
          backgroundColor: '#FEF3F2',
          borderRadius: '8px',
          border: '1px solid #FECDCA',
          marginBottom: '24px',
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: '12px',
            color: '#B42318',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {t(COPY, loc, 'attemptsLabel')}
        </Text>
        <Text
          style={{
            margin: '4px 0 0 0',
            fontSize: '18px',
            fontWeight: 700,
            color: '#B42318',
          }}
        >
          {failureCount} / 3
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '0' }}>
        <Button
          href={updateUrl}
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
          {t(COPY, loc, 'updateCta')}
        </Button>
      </Section>
    </EmailLayout>
  );
}

RecurringChargeFailedEmail.PreviewProps = {
  recurringId: '00000000-0000-0000-0000-000000000004',
  failureCount: 2,
  paused: false,
  locale: 'en',
} satisfies RecurringChargeFailedEmailProps;

export default RecurringChargeFailedEmail;
