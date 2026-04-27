import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  Stethoscope,
  GraduationCap,
  Siren,
  Users,
  Palette,
  Briefcase,
  Check,
  X,
  Camera,
  Banknote,
  ArrowRight,
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
  const t = await getTranslations('metadata.organizerGuidelines');
  return { title: t('title'), description: t('description') };
}

const CATEGORY_DOC_KEYS: { key: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'medical', icon: Stethoscope },
  { key: 'education', icon: GraduationCap },
  { key: 'emergency', icon: Siren },
  { key: 'community', icon: Users },
  { key: 'creative', icon: Palette },
  { key: 'business', icon: Briefcase },
];

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  medical: 'campaigns.categories.medical',
  education: 'campaigns.categories.education',
  emergency: 'campaigns.categories.emergency',
  community: 'campaigns.categories.community',
  creative: 'campaigns.categories.creative',
  business: 'campaigns.categories.business',
};

export default async function OrganizerGuidelinesPage() {
  const t = await getTranslations('pages.organizerGuidelines');
  const tRoot = await getTranslations();

  return (
    <MarketingPage>
      <Hero
        eyebrow={t('eyebrow')}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <Section title={t('checklistTitle')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ValueCard
            icon={<Check className="size-5" />}
            title={t('checklist.item1Title')}
            body={t('checklist.item1Body')}
            tone="positive"
          />
          <ValueCard
            icon={<Check className="size-5" />}
            title={t('checklist.item2Title')}
            body={t('checklist.item2Body')}
            tone="positive"
          />
          <ValueCard
            icon={<Check className="size-5" />}
            title={t('checklist.item3Title')}
            body={t('checklist.item3Body')}
            tone="positive"
          />
          <ValueCard
            icon={<Check className="size-5" />}
            title={t('checklist.item4Title')}
            body={t('checklist.item4Body')}
            tone="positive"
          />
        </div>
      </Section>

      <Section title={t('documentsTitle')} intro={t('documentsIntro')}>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm">
          <ul className="divide-y divide-border/60">
            {CATEGORY_DOC_KEYS.map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:gap-5"
              >
                <div className="flex shrink-0 items-center gap-3 sm:w-56">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="font-medium text-foreground">
                    {tRoot(CATEGORY_LABEL_KEYS[key] as 'campaigns.categories.medical')}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(`documents.${key}` as 'documents.medical')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title={t('prohibitedTitle')} intro={t('prohibitedIntro')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ValueCard
            icon={<X className="size-5" />}
            title={t('prohibited.item1Title')}
            body={t('prohibited.item1Body')}
            tone="danger"
          />
          <ValueCard
            icon={<X className="size-5" />}
            title={t('prohibited.item2Title')}
            body={t('prohibited.item2Body')}
            tone="danger"
          />
          <ValueCard
            icon={<X className="size-5" />}
            title={t('prohibited.item3Title')}
            body={t('prohibited.item3Body')}
            tone="danger"
          />
        </div>
      </Section>

      <Section>
        <ValueCard
          icon={<Camera className="size-5" />}
          title={t('photosTitle')}
          body={<p>{t('photosBody')}</p>}
        />
      </Section>

      <Section>
        <ValueCard
          icon={<Banknote className="size-5" />}
          title={t('withdrawalsTitle')}
          body={<p>{t('withdrawalsBody')}</p>}
        />
      </Section>

      <CTABanner
        title={t('ctaTitle')}
        body={t('ctaBody')}
        actions={
          <>
            <Button size="lg" render={<Link href="/create-campaign/step-1" />}>
              {t('ctaTitle')}
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/contact" />}>
              {t('eyebrow')}
            </Button>
          </>
        }
      />
    </MarketingPage>
  );
}
