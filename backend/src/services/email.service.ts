import * as React from 'react';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { env } from '../config/env.js';
import type { EmailService, SendEmailParams } from '../types/services.js';
import { EmailVerificationCodeEmail } from '../emails/EmailVerificationCodeEmail.js';
import {
  mask,
  publishMockNotification,
  truncatePreview,
} from './notifications/demo-stream.js';

const VERIFICATION_CODE_TTL_MINUTES = 10;

/**
 * Constructs the From header in the format Resend expects:
 *   "Display Name <user@domain>"
 */
function buildFromHeader(): string {
  return `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`;
}

/**
 * Renders a React Email element to HTML + auto-derived plain text.
 */
async function renderEmail(react: React.ReactElement): Promise<{
  html: string;
  text: string;
}> {
  const html = await render(react);
  const text = await render(react, { plainText: true });
  return { html, text };
}

// ============================================================
// REAL EMAIL SERVICE — Resend
// ============================================================

class ResendEmailService implements EmailService {
  private client: Resend;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required for ResendEmailService');
    }
    this.client = new Resend(env.RESEND_API_KEY);
  }

  async sendEmail(params: SendEmailParams): Promise<{ id: string }> {
    const { html, text } = await renderEmail(params.react);

    const result = await this.client.emails.send({
      from: buildFromHeader(),
      to: params.to,
      replyTo: env.EMAIL_REPLY_TO,
      subject: params.subject,
      html,
      text: params.text ?? text,
      headers: params.headers,
    });

    if (result.error) {
      throw new Error(
        `Resend send failed: ${result.error.message ?? 'unknown error'}`,
      );
    }

    if (!result.data?.id) {
      throw new Error('Resend send succeeded but returned no message id');
    }

    console.log(
      `[Sahovat] Email sent to ${params.to} via Resend (id=${result.data.id})`,
    );

    return { id: result.data.id };
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Your Sahovat verification code: ${code}`,
      react: React.createElement(EmailVerificationCodeEmail, {
        code,
        expiresInMinutes: VERIFICATION_CODE_TTL_MINUTES,
      }),
    });
  }
}

// ============================================================
// MOCK EMAIL SERVICE — Development / tests
// ============================================================

class MockEmailService implements EmailService {
  async sendEmail(params: SendEmailParams): Promise<{ id: string }> {
    // Render to HTML so we can sanity-check the template even in dev.
    const { html, text } = await renderEmail(params.react);
    const id = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    console.log('[Sahovat] [MOCK EMAIL] ──────────────────────────────');
    console.log(`[Sahovat] [MOCK EMAIL] To:      ${params.to}`);
    console.log(`[Sahovat] [MOCK EMAIL] From:    ${buildFromHeader()}`);
    console.log(`[Sahovat] [MOCK EMAIL] Subject: ${params.subject}`);
    console.log(`[Sahovat] [MOCK EMAIL] Mock-id: ${id}`);
    console.log(`[Sahovat] [MOCK EMAIL] HTML bytes: ${html.length}`);
    console.log(
      `[Sahovat] [MOCK EMAIL] Text preview:\n${text.split('\n').slice(0, 12).join('\n')}`,
    );
    console.log('[Sahovat] [MOCK EMAIL] ──────────────────────────────');

    const recipient = Array.isArray(params.to) ? params.to[0] ?? '' : params.to;
    await publishMockNotification({
      channel: 'email',
      recipient: mask.email(recipient),
      subject: params.subject,
      preview: truncatePreview(text),
    });

    return { id };
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    // In dev, surface the code prominently in logs so the developer can
    // type it into the verify dialog without checking an inbox.
    console.log(
      `[Sahovat] [MOCK EMAIL] Verification code for ${to}: ${code} (expires in ${VERIFICATION_CODE_TTL_MINUTES} min)`,
    );
    await this.sendEmail({
      to,
      subject: `Your Sahovat verification code: ${code}`,
      react: React.createElement(EmailVerificationCodeEmail, {
        code,
        expiresInMinutes: VERIFICATION_CODE_TTL_MINUTES,
      }),
    });
  }
}

// ============================================================
// FACTORY
// ============================================================

/**
 * Selects the email implementation based on env.EMAIL_PROVIDER.
 * - 'resend' → ResendEmailService (production)
 * - 'mock'   → MockEmailService (dev/test default)
 *
 * In production the env validator guarantees RESEND_API_KEY is set
 * when EMAIL_PROVIDER=resend, so the constructor cannot throw at boot.
 */
export function createEmailService(): EmailService {
  if (env.EMAIL_PROVIDER === 'resend') {
    console.log('[Sahovat] Using Resend email service');
    return new ResendEmailService();
  }
  console.log('[Sahovat] Using mock email service');
  return new MockEmailService();
}

/** Singleton email service instance */
export const emailService: EmailService = createEmailService();
