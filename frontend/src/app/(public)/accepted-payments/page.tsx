import { useTranslations } from 'next-intl';
import { CreditCard, Shield, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AcceptedPaymentsPage() {
  const t = useTranslations('acceptedPayments');

  const providers = [
    {
      id: 'payme',
      name: 'PayMe',
      description: t('paymeDescription'),
      fees: t('paymeFees'),
      processingTime: t('paymeProcessingTime'),
      features: [t('paymeFeature1'), t('paymeFeature2'), t('paymeFeature3')],
    },
    {
      id: 'click',
      name: 'Click',
      description: t('clickDescription'),
      fees: t('clickFees'),
      processingTime: t('clickProcessingTime'),
      features: [t('clickFeature1'), t('clickFeature2'), t('clickFeature3')],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <CreditCard className="size-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{provider.name}</h2>
                <p className="text-sm text-muted-foreground">{provider.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <span className="font-medium text-foreground">{t('processingTime')}:</span>{' '}
                  <span className="text-muted-foreground">{provider.processingTime}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <CreditCard className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <span className="font-medium text-foreground">{t('fees')}:</span>{' '}
                  <span className="text-muted-foreground">{provider.fees}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {provider.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="mt-0.5 size-4 shrink-0 text-green-600" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl bg-muted/50 p-6">
        <div className="flex items-start gap-3">
          <Shield className="size-5 shrink-0 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground">{t('securityTitle')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('securityDescription')}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/campaigns" className="text-primary hover:underline">
          {t('browseCampaigns')} →
        </Link>
      </div>
    </div>
  );
}