import * as React from 'react';
import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout, EMAIL_COLORS } from './_layout.js';
import {
  type EmailLocale,
  type LocaleDict,
  normalizeEmailLocale,
  t,
} from './_i18n.js';

type Key =
  | 'preview'
  | 'heading'
  | 'subhead'
  | 'referenceLabel'
  | 'responseTime'
  | 'closing';

const COPY: LocaleDict<Key> = {
  uz: {
    preview: 'Murojaatingiz qabul qilindi',
    heading: 'Murojaatingiz qabul qilindi',
    subhead:
      'Sahovat jamoasi bilan bog\u2018langaningiz uchun rahmat. Tez orada javob beramiz.',
    referenceLabel: 'Murojaat raqami',
    responseTime:
      'Odatda 1-2 ish kuni ichida javob beramiz. Iltimos, sabr qiling.',
    closing: 'Sahovat jamoasi.',
  },
  ru: {
    preview: 'Ваше обращение принято',
    heading: 'Ваше обращение принято',
    subhead:
      'Спасибо, что связались с командой Sahovat. Мы ответим в ближайшее время.',
    referenceLabel: 'Номер обращения',
    responseTime:
      'Обычно мы отвечаем в течение 1-2 рабочих дней.',
    closing: 'Команда Sahovat.',
  },
  en: {
    preview: 'We received your message',
    heading: 'Your message was received',
    subhead:
      'Thank you for contacting the Sahovat team. We will respond shortly.',
    referenceLabel: 'Reference',
    responseTime:
      'We typically respond within 1-2 business days.',
    closing: 'The Sahovat team.',
  },
};

export interface ContactReplyEmailProps {
  referenceNumber: string;
  /** Optional — submitter's name for personalized greeting. */
  submitterName?: string | null;
  locale?: EmailLocale | string | null;
}

export function ContactReplyEmail({
  referenceNumber,
  submitterName,
  locale,
}: ContactReplyEmailProps) {
  const loc = normalizeEmailLocale(locale ?? null);

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
        📩 {t(COPY, loc, 'heading')}
      </Heading>

      <Text
        style={{
          margin: '12px 0 24px 0',
          fontSize: '14px',
          color: EMAIL_COLORS.muted,
          lineHeight: '22px',
        }}
      >
        {submitterName ? `${submitterName}, ` : ''}
        {t(COPY, loc, 'subhead')}
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
          {t(COPY, loc, 'referenceLabel')}
        </Text>
        <Text
          style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            fontFamily: '"SFMono-Regular", Consolas, monospace',
            color: EMAIL_COLORS.text,
          }}
        >
          {referenceNumber}
        </Text>
      </Section>

      <Text
        style={{
          margin: 0,
          fontSize: '13px',
          color: EMAIL_COLORS.muted,
          lineHeight: '20px',
        }}
      >
        {t(COPY, loc, 'responseTime')}
      </Text>

      <Text
        style={{
          margin: '24px 0 0 0',
          fontSize: '13px',
          color: EMAIL_COLORS.text,
          lineHeight: '20px',
        }}
      >
        — {t(COPY, loc, 'closing')}
      </Text>
    </EmailLayout>
  );
}

ContactReplyEmail.PreviewProps = {
  referenceNumber: 'CT-A1B2C3D4',
  submitterName: 'Malika',
  locale: 'en',
} satisfies ContactReplyEmailProps;

export default ContactReplyEmail;
