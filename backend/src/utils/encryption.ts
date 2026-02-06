/**
 * Encryption utility for sensitive data
 * Uses AES-256-GCM for encrypting account numbers and other sensitive data
 */

import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from the encryption key in config
 */
function getKey(): Buffer {
  return crypto.scryptSync(config.encryption.key, 'sahovat-salt', 32);
}

/**
 * Encrypts a string using AES-256-GCM
 * Returns a base64 encoded string containing IV + AuthTag + CipherText
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + AuthTag + Encrypted data
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ]);
  
  return combined.toString('base64');
}

/**
 * Decrypts a base64 encoded string that was encrypted with encrypt()
 */
export function decrypt(encryptedData: string): string {
  const key = getKey();
  const combined = Buffer.from(encryptedData, 'base64');
  
  // Extract IV, AuthTag, and encrypted data
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encryptedText = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Masks an account number for display (shows only last 4 digits)
 */
export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) {
    return '****';
  }
  return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
}
