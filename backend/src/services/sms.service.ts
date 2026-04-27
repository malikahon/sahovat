import { env } from '../config/env.js';
import type { SmsService } from '../types/services.js';

// ============================================================
// LOCALIZED OTP MESSAGES
// ============================================================

// Eskiz pre-approved test template. The free / unverified Eskiz tier
// rejects any message body other than this exact string. Used when
// SMS_ESKIZ_TEST_MODE=true (no PINFL / template moderation yet).
export const ESKIZ_TEST_MESSAGE = 'This is test from Eskiz';

const OTP_MESSAGES: Record<string, (otp: string) => string> = {
  uz: (otp) => `Sahovat: Sizning tasdiqlash kodingiz: ${otp}. 5 daqiqa ichida amal qiladi.`,
  ru: (otp) => `Sahovat: Ваш код подтверждения: ${otp}. Действителен 5 минут.`,
  en: (otp) => `Sahovat: Your verification code is: ${otp}. Valid for 5 minutes.`,
};

function getOtpMessage(otp: string, locale: string): string {
  const fn = OTP_MESSAGES[locale];
  if (fn) return fn(otp);
  // Default to Uzbek
  return `Sahovat: Sizning tasdiqlash kodingiz: ${otp}. 5 daqiqa ichida amal qiladi.`;
}

// ============================================================
// ESKIZ.UZ SMS SERVICE (Production)
// ============================================================

class EskizSmsService implements SmsService {
  private token: string | null = null;
  private tokenExpiresAt: number = 0;
  private authPromise: Promise<string> | null = null;

  private get baseUrl(): string {
    return env.SMS_API_URL;
  }

  /**
   * Authenticates with Eskiz.uz API and caches the bearer token.
   * Eskiz tokens are valid for ~30 days; we refresh proactively
   * when the token is within 1 day of expiry, or on 401 response.
   * Uses a promise-based mutex to prevent concurrent auth requests.
   */
  private async authenticate(): Promise<string> {
    // Return cached token if still valid (with 1-day buffer)
    if (this.token && Date.now() < this.tokenExpiresAt - 86_400_000) {
      return this.token;
    }

    // Deduplicate concurrent auth calls
    if (!this.authPromise) {
      this.authPromise = this._doAuth().finally(() => { this.authPromise = null; });
    }
    return this.authPromise;
  }

  /**
   * Performs the actual authentication request to Eskiz.uz.
   */
  private async _doAuth(): Promise<string> {
    const formData = new FormData();
    formData.append('email', env.SMS_API_EMAIL);
    formData.append('password', env.SMS_API_PASSWORD);

    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Eskiz auth failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      data: { token: string };
    };

    this.token = data.data.token;
    // Eskiz tokens expire in ~30 days; set expiry to 29 days from now
    this.tokenExpiresAt = Date.now() + 29 * 24 * 60 * 60 * 1000;

    return this.token;
  }

  /**
   * Sends an SMS via Eskiz.uz API.
   * Retries once on 401 (token expired) by re-authenticating.
   */
  private async sendSms(phone: string, message: string): Promise<void> {
    let token = await this.authenticate();

    // Strip the + prefix if present — Eskiz expects "998XXXXXXXXX"
    const normalizedPhone = phone.startsWith('+') ? phone.slice(1) : phone;

    const send = async (bearerToken: string): Promise<Response> => {
      const formData = new FormData();
      formData.append('mobile_phone', normalizedPhone);
      formData.append('message', message);
      formData.append('from', '4546'); // Eskiz default sender ID

      return fetch(`${this.baseUrl}/api/message/sms/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        body: formData,
      });
    };

    let response = await send(token);

    // Retry on 401: force re-auth and try once more
    if (response.status === 401) {
      this.token = null;
      this.tokenExpiresAt = 0;
      token = await this.authenticate();
      response = await send(token);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Eskiz SMS send failed (${response.status}): ${text}`);
    }

    console.log(`[Sahovat] SMS sent to ${phone} via Eskiz.uz`);
  }

  async sendOtp(phone: string, otp: string, locale: string = 'uz'): Promise<void> {
    const realMessage = getOtpMessage(otp, locale);
    if (env.SMS_ESKIZ_TEST_MODE) {
      // Eskiz unverified-tier limitation: only the pre-approved test
      // template is accepted. Log the real OTP code so it remains
      // recoverable from server logs during demo / dev.
      console.log(
        `[Sahovat] [Eskiz TEST_MODE] OTP for ${phone}: ${otp} ` +
        `(would have sent: "${realMessage}"; sending: "${ESKIZ_TEST_MESSAGE}")`,
      );
      await this.sendSms(phone, ESKIZ_TEST_MESSAGE);
      return;
    }
    await this.sendSms(phone, realMessage);
  }

  async sendNotification(phone: string, message: string): Promise<void> {
    if (env.SMS_ESKIZ_TEST_MODE) {
      console.log(
        `[Sahovat] [Eskiz TEST_MODE] Notification to ${phone} ` +
        `(would have sent: "${message}"; sending: "${ESKIZ_TEST_MESSAGE}")`,
      );
      await this.sendSms(phone, ESKIZ_TEST_MESSAGE);
      return;
    }
    await this.sendSms(phone, message);
  }
}

// ============================================================
// MOCK SMS SERVICE (Development)
// ============================================================

class MockSmsService implements SmsService {
  async sendOtp(phone: string, otp: string, locale: string = 'uz'): Promise<void> {
    console.log(`[Sahovat] [MOCK SMS] OTP for ${phone}: ${otp} (locale: ${locale})`);
  }

  async sendNotification(phone: string, message: string): Promise<void> {
    console.log(`[Sahovat] [MOCK SMS] Notification to ${phone}: ${message}`);
  }
}

// ============================================================
// FACTORY
// ============================================================

/**
 * Creates the appropriate SMS service based on environment.
 * Uses MockSmsService when SMS_API_EMAIL is not configured (development).
 */
export function createSmsService(): SmsService {
  if (!env.SMS_API_EMAIL || env.NODE_ENV === 'test') {
    console.log('[Sahovat] Using mock SMS service');
    return new MockSmsService();
  }

  console.log('[Sahovat] Using Eskiz.uz SMS service');
  return new EskizSmsService();
}

/** Singleton SMS service instance */
export const smsService: SmsService = createSmsService();
