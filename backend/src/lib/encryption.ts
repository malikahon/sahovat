import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { ValidationError } from './errors.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, 'hex');
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a string in the format "iv:authTag:ciphertext" (all hex-encoded).
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a string in the format "iv:authTag:ciphertext" (all hex-encoded).
 * Returns the original plaintext.
 */
export function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new ValidationError('Invalid encrypted format: expected "iv:authTag:ciphertext"');
  }

  const [ivHex, authTagHex, ciphertext] = parts as [string, string, string];

  const hexPattern = /^[0-9a-fA-F]+$/;

  if (ivHex.length !== 24 || !hexPattern.test(ivHex)) {
    throw new ValidationError('Invalid IV: expected exactly 24 hex characters (12 bytes)');
  }

  if (authTagHex.length !== 32 || !hexPattern.test(authTagHex)) {
    throw new ValidationError('Invalid auth tag: expected exactly 32 hex characters (16 bytes)');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = getKey();

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
