/**
 * Maps backend error codes to i18n translation keys.
 *
 * Backend returns: { error: "CAMPAIGN_FROZEN", message: "This campaign has been frozen..." }
 * Frontend maps the code to a translated string via the "errors" namespace.
 *
 * Usage:
 *   const t = useTranslations('errors');
 *   const msg = getErrorMessage(res.error, t);
 */

/** Error codes that have i18n translations in the "errors" namespace */
const KNOWN_ERROR_CODES = new Set([
  // Auth
  'INVALID_PHONE',
  'OTP_RATE_LIMIT',
  'INVALID_OTP',
  'INVALID_CREDENTIALS',
  'ADMIN_REQUIRED',
  'ADMIN_NO_PASSWORD',
  'TOKEN_REVOKED',
  'UNAUTHORIZED',
  'VERIFICATION_REQUIRED',
  // Campaigns
  'WITHDRAWAL_ACCOUNT_REQUIRED',
  'NOT_CAMPAIGN_OWNER',
  'CAMPAIGN_NOT_EDITABLE',
  'CAMPAIGN_NOT_DRAFT',
  'MAX_DOCUMENTS',
  // Donations
  'CAMPAIGN_FROZEN',
  'CAMPAIGN_NOT_ACTIVE',
  'OTP_NOT_REQUIRED',
  'DONATION_OTP_REQUIRED',
  'DONATION_ALREADY_PROCESSED',
  // Withdrawals
  'CAMPAIGN_INVALID_STATUS',
  'INSUFFICIENT_BALANCE',
  'INVALID_AMOUNT',
  'LAST_WITHDRAWAL_ACCOUNT',
  'CANNOT_DELETE_PRIMARY',
  // Recurring
  'DUPLICATE_RECURRING',
  // Admin
  'CANNOT_MODIFY_SELF',
  'CANNOT_BAN_ADMIN',
  'INVALID_FEE_RANGE',
  // Generic
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'FORBIDDEN',
  'RATE_LIMIT',
  'INTERNAL_ERROR',
]);

/**
 * Get a user-friendly, localized error message from a backend error code.
 *
 * @param code - The error code from the backend (e.g., "CAMPAIGN_FROZEN")
 * @param t - The translation function from useTranslations('errors')
 * @param fallbackMessage - Optional fallback (e.g., the raw backend message)
 * @returns Translated error string
 */
export function getErrorMessage(
  code: string | undefined,
  t: (key: string) => string,
  fallbackMessage?: string,
): string {
  if (code && KNOWN_ERROR_CODES.has(code)) {
    try {
      return t(code);
    } catch {
      // Translation key doesn't exist, fall through
    }
  }
  return fallbackMessage ?? t('INTERNAL_ERROR');
}
