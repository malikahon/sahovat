/**
 * Phone number validation utility for Uzbek phone numbers
 */

interface PhoneValidationResult {
  valid: boolean;
  formatted: string | null;
  error?: string;
}

// Valid Uzbek mobile operator prefixes
const UZBEK_MOBILE_PREFIXES = ['90', '91', '93', '94', '95', '97', '98', '99', '33', '55', '77', '88'];

/**
 * Validates and formats Uzbek phone numbers
 * Accepts formats: +998XXXXXXXXX, 998XXXXXXXXX, 0XXXXXXXXX, XXXXXXXXX (9 digits)
 * @param phone - Phone number to validate
 * @returns Object with validation result and formatted number
 */
export function validateUzbekPhoneNumber(phone: string): PhoneValidationResult {
  // Strip whitespace, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Check if empty
  if (!cleaned) {
    return {
      valid: false,
      formatted: null,
      error: 'Phone number cannot be empty',
    };
  }

  let digits = cleaned;

  // Handle various input formats
  if (digits.startsWith('+998')) {
    // +998XXXXXXXXX format
    digits = digits.slice(1); // Remove +
  } else if (digits.startsWith('998')) {
    // 998XXXXXXXXX format
    // Keep as is
  } else if (digits.startsWith('0')) {
    // 0XXXXXXXXX format
    digits = '998' + digits.slice(1);
  } else if (digits.length === 9) {
    // XXXXXXXXX format (9 digits)
    digits = '998' + digits;
  } else if (digits.length === 12) {
    // Might be formatted as 998XXXXXXXXX
    if (!digits.startsWith('998')) {
      return {
        valid: false,
        formatted: null,
        error: 'Invalid phone number format',
      };
    }
  } else {
    return {
      valid: false,
      formatted: null,
      error: 'Phone number must be 9-12 digits',
    };
  }

  // Verify it's all digits
  if (!/^\d+$/.test(digits)) {
    return {
      valid: false,
      formatted: null,
      error: 'Phone number must contain only digits',
    };
  }

  // Check if it starts with 998 (country code for Uzbekistan)
  if (!digits.startsWith('998')) {
    return {
      valid: false,
      formatted: null,
      error: 'Invalid Uzbekistan country code',
    };
  }

  // Extract subscriber number (everything after country code)
  const subscriberNumber = digits.slice(3);

  // Subscriber number should be 9 digits
  if (subscriberNumber.length !== 9) {
    return {
      valid: false,
      formatted: null,
      error: 'Invalid subscriber number length',
    };
  }

  // Validate mobile prefix
  const prefix = subscriberNumber.slice(0, 2);
  if (!UZBEK_MOBILE_PREFIXES.includes(prefix)) {
    return {
      valid: false,
      formatted: null,
      error: `Invalid mobile prefix: ${prefix}. Must be one of: ${UZBEK_MOBILE_PREFIXES.join(', ')}`,
    };
  }

  // Format as +998XXXXXXXXX
  const formatted = `+${digits}`;

  return {
    valid: true,
    formatted,
  };
}
