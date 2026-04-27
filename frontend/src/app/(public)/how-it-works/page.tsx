import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  ArrowRight,
  Search,
  Coins,
  CreditCard,
  Receipt,
  ShieldCheck,
  FileText,
  Eye,
  Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  MarketingPage,
  Hero,
  Section,
  StepFlow,
  CTABanner,
  type Step,
} from '@/components/marketing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.howItWorks');
  return { title: t('title'), description: t('description') };
}

export default async function HowItWorksPage() {
  const t = await getTranslations('pages.howItWorks');

  const donorSteps: Step[] = [
    {
      icon: <Search className="size-5" />,
      title: t('donor.step1Title'),
      body: t('donor.step1Body'),
    },
    {
      icon: <Coins className="size-5" />,
      title: t('donor.step2Title'),
      body: t('donor.step2Body'),
    },
    {
      icon: <CreditCard className="size-5" />,
      title: t('donor.step3Title'),
      body: t('donor.step3Body'),
    },
    {
      icon: <Receipt className="size-5" />,
      title: t('donor.step4Title'),
      body: t('donor.step4Body'),
    },
  ];

  const organizerSteps: Step[] = [
    {
      icon: <ShieldCheck className="size-5" />,
      title: t('organizer.step1Title'),
      body: t('organizer.step1Body'),
    },
    {
      icon: <FileText className="size-5" />,
      title: t('organizer.step2Title'),
      body: t('organizer.step2Body'),
    },
    {
      icon: <Eye className="size-5" />,
      title: t('organizer.step3Title'),
      body: t('organizer.step3Body'),
    },
    {
      icon: <Banknote className="size-5" />,
      title: t('organizer.step4Title'),
      body: t('organizer.step4Body'),
    },
  ];

  return (
    <MarketingPage>
      <Hero
        eyebrow={t('eyebrow')}
        title={t('title')}
        subtitle={t('subtitle')}
        align="center"
      />

      <Tabs defaultValue="donor">
        <TabsList className="mx-auto mb-8 h-auto p-1">
          <TabsTrigger value="donor" className="px-6 py-2">
            {t('donorTab')}
          </TabsTrigger>
          <TabsTrigger value="organizer" className="px-6 py-2">
            {t('organizerTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="donor" className="space-y-12">
          <Section title={t('donor.title')} intro={t('donor.intro')} centered>
            <StepFlow steps={donorSteps} />
          </Section>

          <CTABanner
            title={t('donor.ctaTitle')}
            body={t('donor.ctaBody')}
            actions={
              <Button size="lg" render={<Link href="/campaigns" />}>
                {t('donor.step1Title')}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="organizer" className="space-y-12">
          <Section
            title={t('organizer.title')}
            intro={t('organizer.intro')}
            centered
          >
            <StepFlow steps={organizerSteps} />
          </Section>

          <CTABanner
            title={t('organizer.ctaTitle')}
            body={t('organizer.ctaBody')}
            actions={
              <Button size="lg" render={<Link href="/create-campaign/step-1" />}>
                {t('organizer.ctaTitle')}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            }
          />
        </TabsContent>
      </Tabs>
    </MarketingPage>
  );
}
