import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  ShieldCheck,
  FileLock,
  UserCheck,
  Lock,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MarketingPage,
  Hero,
  Section,
  ValueCard,
  CTABanner,
} from '@/components/marketing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.trustSafety');
  return { title: t('title'), description: t('description') };
}

export default async function TrustSafetyPage() {
  const t = await getTranslations('pages.trustSafety');

  const moneyPoints = [
    t('moneyPoint1'),
    t('moneyPoint2'),
    t('moneyPoint3'),
    t('moneyPoint4'),
  ];

  return (
    <MarketingPage>
      <Hero
        eyebrow={t('eyebrow')}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <Section title={t('verifyTitle')} intro={t('verifyIntro')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ValueCard
            icon={<UserCheck className="size-5" />}
            badge="01"
            title={t('verify.step1Title')}
            body={t('verify.step1Body')}
            tone="positive"
          />
          <ValueCard
            icon={<FileLock className="size-5" />}
            badge="02"
            title={t('verify.step2Title')}
            body={t('verify.step2Body')}
            tone="positive"
          />
          <ValueCard
            icon={<ShieldCheck className="size-5" />}
            badge="03"
            title={t('verify.step3Title')}
            body={t('verify.step3Body')}
            tone="positive"
          />
        </div>
      </Section>

      <Section title={t('moneyTitle')}>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('moneyBody')}
          </p>
          <ul className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm">
            {moneyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section>
        <ValueCard
          icon={<AlertTriangle className="size-5" />}
          title={t('fraudTitle')}
          tone="warning"
          body={
            <>
              <p>{t('fraudBody')}</p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/contact?subject=fraud-report" />}
                >
                  {t('fraudCta')}
                  <ArrowRight className="ml-1.5 size-3.5" />
                </Button>
              </div>
            </>
          }
        />
      </Section>

      <CTABanner
        title={t('ctaTitle')}
        body={t('ctaBody')}
        actions={
          <>
            <Button size="lg" render={<Link href="/help" />}>
              {t('ctaTitle')}
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/contact" />}>
              {t('fraudCta')}
            </Button>
          </>
        }
      />
    </MarketingPage>
  );
}
