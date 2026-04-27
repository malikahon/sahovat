import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the resend SDK BEFORE importing the service.
// vitest hoists vi.mock calls to the top of the file.
vi.mock('resend', () => {
  const send = vi.fn();
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: { send },
    })),
    // Expose the mock send function for assertions.
    __mockSend: send,
  };
});

describe('email.service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('MockEmailService (default in tests)', () => {
    it('sendEmail returns a mock id and logs', async () => {
      const { emailService } = await import('../../../src/services/email.service.js');
      const { EmailVerificationCodeEmail } = await import(
        '../../../src/emails/EmailVerificationCodeEmail.js'
      );
      const React = await import('react');

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test subject',
        react: React.createElement(EmailVerificationCodeEmail, {
          code: '123456',
          expiresInMinutes: 10,
        }),
      });

      expect(result.id).toMatch(/^mock_/);
    });

    it('sendVerificationCode logs the code prominently', async () => {
      const { emailService } = await import('../../../src/services/email.service.js');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await emailService.sendVerificationCode('user@example.com', '987654');

      const calls = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(calls).toContain('987654');
      expect(calls).toContain('user@example.com');

      logSpy.mockRestore();
    });
  });

  describe('ResendEmailService', () => {
    /**
     * To exercise the real-provider path we re-import the service after
     * setting EMAIL_PROVIDER=resend on the env module. We do this by
     * reaching into the env module's mutable copy.
     */
    async function loadServiceWithResend() {
      vi.resetModules();
      const envModule = await import('../../../src/config/env.js');
      // env is a frozen-by-convention object but mutable in JS — we need
      // both the mode flag and a non-empty API key.
      (envModule.env as { EMAIL_PROVIDER: string }).EMAIL_PROVIDER = 'resend';
      (envModule.env as { RESEND_API_KEY: string }).RESEND_API_KEY = 'test_key_xyz';
      const svc = await import('../../../src/services/email.service.js');
      return svc;
    }

    it('sendEmail forwards to Resend SDK with correct payload', async () => {
      const resendMock = await import('resend');
      const send = (resendMock as unknown as { __mockSend: ReturnType<typeof vi.fn> }).__mockSend;
      send.mockResolvedValue({ data: { id: 'msg_abc123' }, error: null });

      const { emailService } = await loadServiceWithResend();
      const { EmailVerificationCodeEmail } = await import(
        '../../../src/emails/EmailVerificationCodeEmail.js'
      );
      const React = await import('react');

      const result = await emailService.sendEmail({
        to: 'real@example.com',
        subject: 'Verify your email',
        react: React.createElement(EmailVerificationCodeEmail, {
          code: '111222',
          expiresInMinutes: 10,
        }),
      });

      expect(result.id).toBe('msg_abc123');
      expect(send).toHaveBeenCalledTimes(1);
      const arg = send.mock.calls[0][0];
      expect(arg.to).toBe('real@example.com');
      expect(arg.subject).toBe('Verify your email');
      expect(arg.from).toContain('Sahovat Test');
      expect(arg.from).toContain('notifications@sahovat.test');
      expect(arg.replyTo).toBe('support@sahovat.test');
      expect(arg.html).toContain('111222');
      expect(typeof arg.text).toBe('string');
      expect(arg.text.length).toBeGreaterThan(0);
    });

    it('throws when Resend returns an error', async () => {
      const resendMock = await import('resend');
      const send = (resendMock as unknown as { __mockSend: ReturnType<typeof vi.fn> }).__mockSend;
      send.mockResolvedValue({
        data: null,
        error: { name: 'validation_error', message: 'invalid recipient' },
      });

      const { emailService } = await loadServiceWithResend();
      const { EmailVerificationCodeEmail } = await import(
        '../../../src/emails/EmailVerificationCodeEmail.js'
      );
      const React = await import('react');

      await expect(
        emailService.sendEmail({
          to: 'bad',
          subject: 'X',
          react: React.createElement(EmailVerificationCodeEmail, {
            code: '111111',
            expiresInMinutes: 10,
          }),
        }),
      ).rejects.toThrow(/invalid recipient/);
    });

    it('throws when Resend throws (network error)', async () => {
      const resendMock = await import('resend');
      const send = (resendMock as unknown as { __mockSend: ReturnType<typeof vi.fn> }).__mockSend;
      send.mockRejectedValue(new Error('ECONNRESET'));

      const { emailService } = await loadServiceWithResend();
      const { EmailVerificationCodeEmail } = await import(
        '../../../src/emails/EmailVerificationCodeEmail.js'
      );
      const React = await import('react');

      await expect(
        emailService.sendEmail({
          to: 'x@y.com',
          subject: 'X',
          react: React.createElement(EmailVerificationCodeEmail, {
            code: '222222',
            expiresInMinutes: 10,
          }),
        }),
      ).rejects.toThrow(/ECONNRESET/);
    });
  });

  describe('EmailVerificationCodeEmail template', () => {
    it('renders HTML containing the code', async () => {
      const { render } = await import('@react-email/render');
      const { EmailVerificationCodeEmail } = await import(
        '../../../src/emails/EmailVerificationCodeEmail.js'
      );
      const React = await import('react');

      const html = await render(
        React.createElement(EmailVerificationCodeEmail, {
          code: '424242',
          expiresInMinutes: 10,
        }),
      );
      expect(html).toContain('424242');
      expect(html).toContain('Verify your email');
    });

    it('renders a plain-text version', async () => {
      const { render } = await import('@react-email/render');
      const { EmailVerificationCodeEmail } = await import(
        '../../../src/emails/EmailVerificationCodeEmail.js'
      );
      const React = await import('react');

      const text = await render(
        React.createElement(EmailVerificationCodeEmail, {
          code: '424242',
          expiresInMinutes: 10,
        }),
        { plainText: true },
      );
      expect(text).toContain('424242');
    });
  });
});
