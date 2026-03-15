import { describe, it, expect } from 'vitest';
import { validateUzbekPhone, formatPhone } from '../../../src/lib/phone.js';

describe('validateUzbekPhone', () => {
  it('accepts a valid +998XXXXXXXXX number', () => {
    expect(validateUzbekPhone('+998901234567')).toBe(true);
  });

  it('accepts all valid Uzbek numbers', () => {
    expect(validateUzbekPhone('+998991234567')).toBe(true);
    expect(validateUzbekPhone('+998711234567')).toBe(true);
  });

  it('rejects a number without country code', () => {
    expect(validateUzbekPhone('901234567')).toBe(false);
  });

  it('rejects a number with wrong country code', () => {
    expect(validateUzbekPhone('+7901234567')).toBe(false);
  });

  it('rejects a number that is too short', () => {
    expect(validateUzbekPhone('+99890123456')).toBe(false);
  });

  it('rejects a number that is too long', () => {
    expect(validateUzbekPhone('+9989012345678')).toBe(false);
  });

  it('rejects a number with non-digit characters', () => {
    expect(validateUzbekPhone('+998901234abc')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateUzbekPhone('')).toBe(false);
  });
});

describe('formatPhone', () => {
  it('passes through a correctly formatted number', () => {
    expect(formatPhone('+998901234567')).toBe('+998901234567');
  });

  it('normalizes 998-prefixed number without +', () => {
    expect(formatPhone('998901234567')).toBe('+998901234567');
  });

  it('normalizes 9-digit local number', () => {
    expect(formatPhone('901234567')).toBe('+998901234567');
  });

  it('strips whitespace and dashes', () => {
    expect(formatPhone('+998 90 123-45-67')).toBe('+998901234567');
  });

  it('strips parentheses', () => {
    expect(formatPhone('+998(90)1234567')).toBe('+998901234567');
  });

  it('throws for an invalid number', () => {
    expect(() => formatPhone('12345')).toThrow();
  });
});
