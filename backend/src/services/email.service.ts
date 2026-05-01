import { Resend } from 'resend';
import { env } from '../config/env.js';
import type { EmailService } from '../types/services.js';

// ============================================================
// LOCALIZED OTP MESSAGES
// ============================================================

const OTP_SUBJECTS: Record<string, (otp: string) => string> = {
  uz: (otp) => `Sahovat: tasdiqlash kodi ${otp}`,
  ru: (otp) => `Sahovat: код подтверждения ${otp}`,
  en: (otp) => `Sahovat: your verification code ${otp}`,
};

const OTP_HEADINGS: Record<string, string> = {
  uz: 'Tasdiqlash kodi',
  ru: 'Код подтверждения',
  en: 'Verification code',
};

const OTP_BODY: Record<string, string> = {
  uz: 'Sahovatga kirish uchun quyidagi 6 xonali kodni kiriting. Kod 5 daqiqa ichida amal qiladi.',
  ru: 'Введите следующий 6-значный код, чтобы войти в Sahovat. Код действителен 5 минут.',
  en: 'Enter the following 6-digit code to sign in to Sahovat. The code is valid for 5 minutes.',
};

const OTP_FOOTER: Record<string, string> = {
  uz: 'Agar siz bu kodni so\u2018ramagan bo\u2018lsangiz, ushbu xatni e\u2019tiborsiz qoldiring.',
  ru: 'Если вы не запрашивали этот код, просто проигнорируйте это письмо.',
  en: "If you didn't request this code, you can safely ignore this email.",
};

function pick<T>(map: Record<string, T>, locale: string, fallback: string = 'uz'): T {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return map[locale] ?? map[fallback]!;
}

function buildHtml(otp: string, locale: string): string {
  const heading = pick(OTP_HEADINGS, locale);
  const body = pick(OTP_BODY, locale);
  const footer = pick(OTP_FOOTER, locale);
  // Inline styles for broad email-client compatibility.
  return `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="padding-bottom:16px;">
                <div style="font-size:18px;font-weight:600;color:#0f172a;">Sahovat</div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:8px;">
                <div style="font-size:20px;font-weight:600;color:#0f172a;">${heading}</div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;">
                <div style="font-size:14px;line-height:1.5;color:#475569;">${body}</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 0 24px 0;">
                <div style="display:inline-block;font-family:'SF Mono',ui-monospace,Menlo,Monaco,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#0f172a;background:#f1f5f9;padding:16px 24px;border-radius:8px;">
                  ${otp}
                </div>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e5e7eb;padding-top:16px;">
                <div style="font-size:12px;line-height:1.5;color:#94a3b8;">${footer}</div>
              </td>
            </tr>
          </table>
          <div style="font-size:12px;color:#94a3b8;padding-top:16px;">&copy; Sahovat</div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildText(otp: string, locale: string): string {
  const heading = pick(OTP_HEADINGS, locale);
  const body = pick(OTP_BODY, locale);
  const footer = pick(OTP_FOOTER, locale);
  return `${heading}\n\n${body}\n\n${otp}\n\n${footer}\n\n— Sahovat`;
}

// ============================================================
// RESEND EMAIL SERVICE
// ============================================================

class ResendEmailService implements EmailService {
  private client: Resend | null = null;

  private getClient(): Resend {
    if (!this.client) {
      if (!env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not configured');
      }
      this.client = new Resend(env.RESEND_API_KEY);
    }
    return this.client;
  }

  async sendOtp(email: string, otp: string, locale: string = 'uz'): Promise<void> {
    const client = this.getClient();
    const from = `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`;
    const subjectFn = pick(OTP_SUBJECTS, locale);
    const subject = subjectFn(otp);

    const payload: Parameters<typeof client.emails.send>[0] = {
      from,
      to: [email],
      subject,
      html: buildHtml(otp, locale),
      text: buildText(otp, locale),
    };

    if (env.EMAIL_REPLY_TO) {
      // Resend SDK supports `replyTo`
      (payload as unknown as Record<string, unknown>).replyTo = env.EMAIL_REPLY_TO;
    }

    const { data, error } = await client.emails.send(payload);

    if (error) {
      throw new Error(
        `Resend send failed: ${error.message ?? JSON.stringify(error)}`,
      );
    }

    console.log(
      `[Sahovat] Email OTP sent to ${email} via Resend (id: ${data?.id ?? 'unknown'})`,
    );
  }
}

// ============================================================
// FACTORY
// ============================================================

export function createEmailService(): EmailService {
  console.log('[Sahovat] Using Resend email service');
  return new ResendEmailService();
}

/** Singleton email service instance */
export const emailService: EmailService = createEmailService();
