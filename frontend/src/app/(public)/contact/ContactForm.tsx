'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .optional()
    .or(z.literal('')),
  phone: z.string().trim().max(32).optional().or(z.literal('')),
  subject: z.string().trim().min(4).max(120),
  message: z.string().trim().min(10).max(4000),
  // Honeypot — must stay empty.
  website: z.string().max(0).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface ContactFormProps {
  /** Optional initial subject (e.g. when arriving from "report fraud" CTA). */
  initialSubject?: string;
}

export function ContactForm({ initialSubject = '' }: ContactFormProps) {
  const t = useTranslations('pages.contact.form');
  const locale = useLocale();

  const [submitting, setSubmitting] = useState(false);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: initialSubject,
      message: '',
      website: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          email: values.email || undefined,
          phone: values.phone || undefined,
          subject: values.subject,
          message: values.message,
          locale,
          website: values.website || undefined,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { reference_code?: string };
        message?: string;
      };

      if (!res.ok || !payload.success) {
        toast.error(payload.message ?? t('errorGeneric'));
        return;
      }

      const ref = payload.data?.reference_code ?? '';
      setReferenceCode(ref);
      reset();
    } catch {
      toast.error(t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  if (referenceCode) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {t('successTitle')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('successBody', { ref: referenceCode })}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => setReferenceCode(null)}
            >
              {t('successAgain')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5 rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm"
    >
      {/* Honeypot — visually hidden, off-screen, NOT display:none (some bots skip those). */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '-10000px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register('website')}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">{t('nameLabel')}</Label>
          <Input
            id="contact-name"
            placeholder={t('namePlaceholder')}
            aria-invalid={errors.name ? 'true' : 'false'}
            {...register('name')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">{t('emailLabel')}</Label>
          <Input
            id="contact-email"
            type="email"
            placeholder={t('emailPlaceholder')}
            aria-invalid={errors.email ? 'true' : 'false'}
            {...register('email')}
          />
          <p className="text-xs text-muted-foreground">{t('emailHint')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-phone">{t('phoneLabel')}</Label>
          <Input
            id="contact-phone"
            type="tel"
            placeholder={t('phonePlaceholder')}
            {...register('phone')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-subject">{t('subjectLabel')}</Label>
          <Input
            id="contact-subject"
            placeholder={t('subjectPlaceholder')}
            aria-invalid={errors.subject ? 'true' : 'false'}
            {...register('subject')}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-message">{t('messageLabel')}</Label>
        <Textarea
          id="contact-message"
          rows={6}
          placeholder={t('messagePlaceholder')}
          aria-invalid={errors.message ? 'true' : 'false'}
          {...register('message')}
        />
      </div>

      <div className="flex items-center justify-end">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t('submitting')}
            </>
          ) : (
            <>
              <Send className="mr-2 size-4" />
              {t('submit')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
