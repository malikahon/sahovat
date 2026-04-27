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
  | 'heading'
  | 'subhead'
  | 'manageCta'
  | 'tipsHeading'
  | 'tip1'
  | 'tip2'
  | 'tip3';

const COPY: LocaleDict<Key> = {
  uz: {
    preview: 'Kampaniyangiz tasdiqlandi va faollashtirildi',
    heading: 'Kampaniyangiz endi faol',
    subhead:
      'Tabriklaymiz! Kampaniyangiz tekshiruvdan o\u2018tdi va Sahovatda xayriya qabul qilmoqda.',
    manageCta: 'Kampaniyani boshqarish',
    tipsHeading: 'Birinchi xayriyalarni jalb qilish bo\u2018yicha maslahatlar:',
    tip1: 'Kampaniyangizni do\u2018stlar va oila a\u2018zolari bilan bo\u2018lishing.',
    tip2: 'Hayajonli yangiliklarni muntazam yangilab boring.',
    tip3: 'Xayr-ehsonlarga shaxsan minnatdorchilik bildiring.',
  },
  ru: {
    preview: 'Ваша кампания подтверждена и активна',
    heading: 'Ваша кампания теперь активна',
    subhead:
      'Поздравляем! Ваша кампания прошла проверку и принимает пожертвования на Sahovat.',
    manageCta: 'Управлять кампанией',
    tipsHeading: 'Советы для первых пожертвований:',
    tip1: 'Поделитесь кампанией с друзьями и семьёй.',
    tip2: 'Регулярно публикуйте обновления о ходе сбора.',
    tip3: 'Лично благодарите каждого жертвователя.',
  },
  en: {
    preview: 'Your campaign is approved and live',
    heading: 'Your campaign is now live',
    subhead:
      'Congratulations! Your campaign passed verification and is accepting donations on Sahovat.',
    manageCta: 'Manage campaign',
    tipsHeading: 'Tips to attract your first donations:',
    tip1: 'Share your campaign with friends and family.',
    tip2: 'Post regular updates as your campaign grows.',
    tip3: 'Thank each donor personally.',
  },
};

export interface CampaignVerifiedEmailProps {
  campaignId: string;
  campaignTitle: string;
  locale?: EmailLocale | string | null;
}

export function CampaignVerifiedEmail({
  campaignId,
  campaignTitle,
  locale,
}: CampaignVerifiedEmailProps) {
  const loc = normalizeEmailLocale(locale ?? null);
  const baseUrl = env.APP_BASE_URL.replace(/\/$/, '');
  const manageUrl = `${baseUrl}/campaigns/${campaignId}/manage`;

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
        🎉 {t(COPY, loc, 'heading')}
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
            fontSize: '16px',
            fontWeight: 600,
            color: EMAIL_COLORS.text,
            lineHeight: '22px',
          }}
        >
          {campaignTitle}
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '0 0 24px 0' }}>
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
          margin: '24px 0 8px 0',
          fontSize: '13px',
          fontWeight: 600,
          color: EMAIL_COLORS.text,
        }}
      >
        {t(COPY, loc, 'tipsHeading')}
      </Text>
      <Text
        style={{
          margin: '4px 0',
          fontSize: '13px',
          color: EMAIL_COLORS.muted,
          lineHeight: '20px',
        }}
      >
        • {t(COPY, loc, 'tip1')}
      </Text>
      <Text
        style={{
          margin: '4px 0',
          fontSize: '13px',
          color: EMAIL_COLORS.muted,
          lineHeight: '20px',
        }}
      >
        • {t(COPY, loc, 'tip2')}
      </Text>
      <Text
        style={{
          margin: '4px 0',
          fontSize: '13px',
          color: EMAIL_COLORS.muted,
          lineHeight: '20px',
        }}
      >
        • {t(COPY, loc, 'tip3')}
      </Text>
    </EmailLayout>
  );
}

CampaignVerifiedEmail.PreviewProps = {
  campaignId: '00000000-0000-0000-0000-000000000002',
  campaignTitle: 'Help Aziza recover from surgery',
  locale: 'en',
} satisfies CampaignVerifiedEmailProps;

export default CampaignVerifiedEmail;
