import Link from 'next/link';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import {
  Heart,
  PenSquare,
  Banknote,
  UserCog,
  CreditCard,
  Send,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MarketingPage,
  Hero,
  Section,
  FAQAccordion,
  CTABanner,
  type FAQEntry,
} from '@/components/marketing';
import faqEn from '@/content/faq.en.json';
import faqUz from '@/content/faq.uz.json';
import faqRu from '@/content/faq.ru.json';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.help');
  return { title: t('title'), description: t('description') };
}

interface RawFAQEntry extends FAQEntry {
  category: string;
}

const FAQ_BY_LOCALE: Record<string, RawFAQEntry[]> = {
  en: faqEn as RawFAQEntry[],
  uz: faqUz as RawFAQEntry[],
  ru: faqRu as RawFAQEntry[],
};

const CATEGORY_ORDER: { key: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'donating', icon: Heart },
  { key: 'creating', icon: PenSquare },
  { key: 'withdrawals', icon: Banknote },
  { key: 'account', icon: UserCog },
  { key: 'payments', icon: CreditCard },
  { key: 'telegramSms', icon: Send },
];

export default async function HelpPage() {
  const t = await getTranslations('pages.help');
  const locale = await getLocale();
  const allFaq = FAQ_BY_LOCALE[locale] ?? FAQ_BY_LOCALE.en;

  // Group entries by category (preserves source order within each group).
  const grouped: Record<string, FAQEntry[]> = {};
  for (const entry of allFaq) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category].push({ id: entry.id, q: entry.q, a: entry.a });
  }

  return (
    <MarketingPage>
      <Hero
        eyebrow={t('eyebrow')}
        title={t('title')}
        subtitle={t('subtitle')}
        align="center"
      />

      <Section title={t('categoryHeading')}>
        <div className="space-y-10">
          {CATEGORY_ORDER.map(({ key, icon: Icon }) => {
            const entries = grouped[key] ?? [];
            if (entries.length === 0) return null;
            return (
              <div key={key}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <h3 className="text-base font-semibold text-foreground sm:text-lg">
                    {t(`categories.${key}` as 'categories.donating')}
                  </h3>
                </div>
                <FAQAccordion items={entries} />
              </div>
            );
          })}
        </div>
      </Section>

      <CTABanner
        title={t('stillNeedHelp')}
        body={t('stillNeedHelpBody')}
        actions={
          <Button size="lg" render={<Link href="/contact" />}>
            {t('stillNeedHelpCta')}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        }
      />
    </MarketingPage>
  );
}
