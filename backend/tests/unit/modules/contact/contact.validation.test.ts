import { describe, it, expect } from 'vitest';
import { submitContactSchema } from '../../../../src/modules/contact/contact.validation.js';

describe('submitContactSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = submitContactSchema.body.safeParse({
      name: 'Malika',
      subject: 'Hello',
      message: 'I have a question about my donation.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.locale).toBe('uz');
    }
  });

  it('rejects when name is too short', () => {
    const result = submitContactSchema.body.safeParse({
      name: 'M',
      subject: 'Hello',
      message: 'I have a question about my donation.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when message is too short', () => {
    const result = submitContactSchema.body.safeParse({
      name: 'Malika',
      subject: 'Hello',
      message: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('lowercases and trims email', () => {
    const result = submitContactSchema.body.safeParse({
      name: 'Malika',
      email: '  Malika@Example.COM  ',
      subject: 'Hello',
      message: 'I have a question about my donation.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('malika@example.com');
    }
  });

  it('rejects when honeypot website field is filled', () => {
    const result = submitContactSchema.body.safeParse({
      name: 'Malika',
      subject: 'Hello',
      message: 'I have a question about my donation.',
      website: 'http://spammer.example',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty honeypot website field', () => {
    const result = submitContactSchema.body.safeParse({
      name: 'Malika',
      subject: 'Hello',
      message: 'I have a question about my donation.',
      website: '',
    });
    expect(result.success).toBe(true);
  });
});
