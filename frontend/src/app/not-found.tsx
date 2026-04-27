import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('errorPages');

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <FileQuestion className="size-16 text-muted-foreground/40" />
      <h1 className="text-2xl font-bold text-foreground">{t('notFoundTitle')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t('notFoundDescription')}
      </p>
      <div className="flex gap-3 pt-2">
        <Button variant="outline" render={<Link href="/" />}>
          {t('goHome')}
        </Button>
        <Button render={<Link href="/campaigns" />}>{t('browseCampaigns')}</Button>
      </div>
    </div>
  );
}
