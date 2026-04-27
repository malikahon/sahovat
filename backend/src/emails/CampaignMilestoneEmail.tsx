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
  | 'subhead25'
  | 'subhead50'
  | 'subhead75'
  | 'subhead90'
  | 'subhead100'
  | 'progressLabel'
  | 'shareCta'
  | 'shareSubtitle';

const COPY: LocaleDict<Key> = {
  uz: {
    preview: 'Kampaniyangiz yangi bosqichga yetdi',
    heading: 'Yangi bosqichga yetildi',
    subhead25: 'Ajoyib boshlanish! Kampaniyangiz maqsadning 25% iga yetdi.',
    subhead50: 'Yarmi tayyor! Kampaniyangiz 50% maqsadga yetdi.',
    subhead75: 'Deyarli tayyor! 75% maqsadga yetdingiz.',
    subhead90: '90% maqsadga yetdingiz — yakuniga juda yaqin!',
    subhead100: 'Tabriklaymiz! Kampaniyangiz 100% maqsadga yetdi.',
    progressLabel: 'Joriy progress',
    shareCta: 'Kampaniyani ulashish',
    shareSubtitle:
      'Ulashish — kampaniyangizga yana ko\u2018proq yordam jalb qilishning eng oson yo\u2018li.',
  },
  ru: {
    preview: 'Ваша кампания достигла нового рубежа',
    heading: 'Новый рубеж достигнут',
    subhead25: 'Отличное начало! Кампания достигла 25% цели.',
    subhead50: 'Половина пути! Достигнуто 50% цели.',
    subhead75: 'Уже 75% — почти у цели!',
    subhead90: '90% — финишная прямая!',
    subhead100: 'Поздравляем! Кампания достигла 100% цели.',
    progressLabel: 'Текущий прогресс',
    shareCta: 'Поделиться кампанией',
    shareSubtitle:
      'Поделиться — самый простой способ привлечь больше поддержки.',
  },
  en: {
    preview: 'Your campaign reached a new milestone',
    heading: 'Milestone reached',
    subhead25: 'Great start! Your campaign reached 25% of its goal.',
    subhead50: 'Halfway there! Your campaign reached 50% of its goal.',
    subhead75: 'Almost there — 75% of goal reached!',
    subhead90: '90% reached — the finish line is in sight!',
    subhead100: 'Congratulations! Your campaign reached 100% of its goal.',
    progressLabel: 'Current progress',
    shareCta: 'Share campaign',
    shareSubtitle:
      'Sharing is the easiest way to attract more support.',
  },
};

export interface CampaignMilestoneEmailProps {
  campaignId: string;
  campaignTitle: string;
  percentage: 25 | 50 | 75 | 90 | 100;
  currentAmount: number;
  goalAmount: number;
  locale?: EmailLocale | string | null;
}

export function CampaignMilestoneEmail({
  campaignId,
  campaignTitle,
  percentage,
  currentAmount,
  goalAmount,
  locale,
}: CampaignMilestoneEmailProps) {
  const loc = normalizeEmailLocale(locale ?? null);
  const baseUrl = env.APP_BASE_URL.replace(/\/$/, '');
  const campaignUrl = `${baseUrl}/campaigns/${campaignId}`;

  const subheadKey = (`subhead${percentage}` as Key);

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
        🏆 {t(COPY, loc, 'heading')}
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
            fontSize: '14px',
            fontWeight: 600,
            color: EMAIL_COLORS.text,
            lineHeight: '20px',
          }}
        >
          {campaignTitle}
        </Text>

        <Text
          style={{
            margin: '16px 0 4px 0',
            fontSize: '12px',
            color: EMAIL_COLORS.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {t(COPY, loc, 'progressLabel')}
        </Text>

        {/* Progress bar — table-based for max email-client compat */}
        <Section
          style={{
            margin: '8px 0 12px 0',
            height: '10px',
            backgroundColor: EMAIL_COLORS.border,
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <Section
            style={{
              width: `${percentage}%`,
              height: '10px',
              backgroundColor: EMAIL_COLORS.brand,
              borderRadius: '999px',
            }}
          >
            <Text style={{ margin: 0, padding: 0, fontSize: 0, lineHeight: 0 }}> </Text>
          </Section>
        </Section>

        <Text
          style={{
            margin: 0,
            fontSize: '13px',
            color: EMAIL_COLORS.text,
          }}
        >
          <strong style={{ color: EMAIL_COLORS.brand }}>
            {formatUzs(currentAmount)} UZS
          </strong>{' '}
          / {formatUzs(goalAmount)} UZS · {percentage}%
        </Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '0 0 12px 0' }}>
        <Button
          href={campaignUrl}
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
          {t(COPY, loc, 'shareCta')}
        </Button>
      </Section>

      <Text
        style={{
          margin: '16px 0 0 0',
          fontSize: '12px',
          color: EMAIL_COLORS.muted,
          textAlign: 'center',
          lineHeight: '18px',
        }}
      >
        {t(COPY, loc, 'shareSubtitle')}
      </Text>
    </EmailLayout>
  );
}

CampaignMilestoneEmail.PreviewProps = {
  campaignId: '00000000-0000-0000-0000-000000000002',
  campaignTitle: 'Help Aziza recover from surgery',
  percentage: 50,
  currentAmount: 5_000_000,
  goalAmount: 10_000_000,
  locale: 'en',
} satisfies CampaignMilestoneEmailProps;

export default CampaignMilestoneEmail;
