import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../../src/lib/encryption.js';

describe('encrypt / decrypt', () => {
  it('encrypts and decrypts a card number round-trip', () => {
    const plaintext = '8600123456781234';
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('encrypts to a different value than the plaintext', () => {
    const plaintext = 'secret-data';
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext).not.toContain(plaintext);
  });

  it('produces unique ciphertext on each call (random IV)', () => {
    const plaintext = 'same-input';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
    // But both decrypt to the same value
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it('encrypted string has iv:authTag:ciphertext format', () => {
    const ciphertext = encrypt('test');
    const parts = ciphertext.split(':');
    expect(parts).toHaveLength(3);
    // IV is 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
  });

  it('throws when decrypting a tampered ciphertext', () => {
    const ciphertext = encrypt('test-value');
    // Tamper with the ciphertext portion
    const parts = ciphertext.split(':');
    const tampered = `${parts[0]}:${parts[1]}:ffffffffffffffff`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws when the format is invalid', () => {
    expect(() => decrypt('not-valid-format')).toThrow('Invalid encrypted format');
  });
});
