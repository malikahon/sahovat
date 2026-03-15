import { ValidationError } from './errors.js';

/**
 * Validates an Uzbek phone number in +998XXXXXXXXX format.
 * Must be exactly 13 characters: +998 followed by 9 digits.
 */
export function validateUzbekPhone(phone: string): boolean {
  return /^\+998\d{9}$/.test(phone);
}

/**
 * Normalizes a phone number to +998XXXXXXXXX format.
 *
 * Handles inputs such as:
 * - 998901234567  → +998901234567
 * - +998901234567 → +998901234567
 * - 901234567     → +998901234567
 *
 * @throws {ValidationError} if the input cannot be normalized to a valid Uzbek phone number.
 */
export function formatPhone(phone: string): string {
  // Strip all whitespace, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-()]/g, '');

  // If it starts with +, remove it for uniform processing
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // If it starts with 998, prefix with +
  if (cleaned.startsWith('998') && cleaned.length === 12) {
    const formatted = `+${cleaned}`;
    if (validateUzbekPhone(formatted)) {
      return formatted;
    }
  }

  // If it's 9 digits, assume it's the local number without country code
  if (cleaned.length === 9 && /^\d{9}$/.test(cleaned)) {
    const formatted = `+998${cleaned}`;
    if (validateUzbekPhone(formatted)) {
      return formatted;
    }
  }

  throw new ValidationError('Invalid Uzbek phone number format');
}
