import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Send, Mail, Clock, MapPin } from 'lucide-react';
import { MarketingPage, Hero } from '@/components/marketing';
import { ContactForm } from './ContactForm';

interface ContactPageProps {
  searchParams?: Promise<{ subject?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.contact');
  return { title: t('title'), description: t('description') };
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const t = await getTranslations('pages.contact');
  const params = (await searchParams) ?? {};
  // Map known query-param subject hints to copy from the form translations.
  let initialSubject = '';
  if (params.subject === 'fraud-report') {
    initialSubject = 'Report a campaign';
  }

  return (
    <MarketingPage>
      <Hero
        eyebrow={t('eyebrow')}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Form */}
        <div>
          <ContactForm initialSubject={initialSubject} />
        </div>

        {/* Info card */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">
              {t('infoTitle')}
            </h2>

            <ul className="mt-5 space-y-5 text-sm">
              <li className="flex items-start gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Send className="size-4" />
                </span>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('info.telegramLabel')}
                  </div>
                  <a
                    href="https://t.me/SahovatTechBot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {t('info.telegramValue')}
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="size-4" />
                </span>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('info.emailLabel')}
                  </div>
                  <a
                    href={`mailto:${t('info.emailValue')}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {t('info.emailValue')}
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="size-4" />
                </span>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('info.responseTimeLabel')}
                  </div>
                  <div className="font-medium text-foreground">
                    {t('info.responseTimeValue')}
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="size-4" />
                </span>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t('info.addressLabel')}
                  </div>
                  <div className="font-medium text-foreground">
                    {t('info.addressValue')}
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </MarketingPage>
  );
}
