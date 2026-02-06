/**
 * SMS service utility
 * Handles sending OTP via SMS (mock in development, production integration ready)
 */

import { config } from '../config';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Formats the OTP message for SMS
 * @param otp - One-time password
 * @returns Formatted SMS message in Uzbek
 */
export function formatOTPMessage(otp: string): string {
  return `Sahovat: Sizning tasdiqlash kodingiz: ${otp}. Kod 5 daqiqa davomida amal qiladi.`;
}

/**
 * Sends OTP via SMS to the provided phone number
 * In development, logs to console. In production, throws error (not configured).
 * @param phoneNumber - Recipient's phone number
 * @param otp - One-time password to send
 * @returns SMSResult with success status and optional messageId or error
 */
export async function sendOTP(phoneNumber: string, otp: string): Promise<SMSResult> {
  const message = formatOTPMessage(otp);

  if (config.nodeEnv === 'development') {
    // Mock SMS in development mode
    console.log(
      `[MOCK SMS] OTP for ${phoneNumber}: ${otp}\nMessage: ${message}`,
    );
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }

  // Production mode: SMS provider not configured
  return {
    success: false,
    error: 'SMS provider not configured',
  };
}
