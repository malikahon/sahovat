import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../../src/config/database.js', () => ({
  query: vi.fn(),
  pool: {
    query: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
  },
  getClient: vi.fn(),
}));

vi.mock('../../../../src/config/redis.js', () => ({
  redis: {
    quit: vi.fn().mockResolvedValue('OK'),
  },
}));

vi.mock('../../../../src/services/email.service.js', () => ({
  emailService: {
    sendEmail: vi.fn().mockResolvedValue({ id: 'mock_email_1' }),
    sendVerificationCode: vi.fn(),
  },
}));

vi.mock('../../../../src/services/notifications/admin-feed.js', () => ({
  notifyContactMessage: vi.fn().mockResolvedValue(undefined),
}));

import { query } from '../../../../src/config/database.js';
import { emailService } from '../../../../src/services/email.service.js';
import { notifyContactMessage } from '../../../../src/services/notifications/admin-feed.js';
import { submitContactMessage } from '../../../../src/modules/contact/contact.service.js';

const queryMock = query as unknown as ReturnType<typeof vi.fn>;
const sendEmailMock = emailService.sendEmail as unknown as ReturnType<typeof vi.fn>;
const adminAlertMock = notifyContactMessage as unknown as ReturnType<typeof vi.fn>;

describe('contactService.submitContactMessage', () => {
  beforeEach(() => {
    queryMock.mockReset();
    sendEmailMock.mockReset();
    adminAlertMock.mockReset();
    sendEmailMock.mockResolvedValue({ id: 'mock_email_1' });
    adminAlertMock.mockResolvedValue(undefined);
  });

  it('inserts a row, fires admin alert, and sends auto-reply when email is present', async () => {
    queryMock.mockResolvedValue({
      rows: [{ id: 'msg-uuid', reference_code: 'SAH-DEADBEEF' }],
    });

    const result = await submitContactMessage({
      name: 'Malika',
      email: 'malika@example.com',
      phone: undefined,
      subject: 'Hello',
      message: 'I have a question.',
      locale: 'en',
      user_id: null,
      source_ip: '127.0.0.1',
    });

    expect(result.reference_code).toMatch(/^SAH-[0-9A-F]{8}$/);
    expect(result.email_reply_sent).toBe(true);

    // Admin alert fired
    expect(adminAlertMock).toHaveBeenCalledTimes(1);
    expect(adminAlertMock.mock.calls[0]![0]).toMatchObject({
      submitterEmail: 'malika@example.com',
      submitterName: 'Malika',
    });

    // Auto-reply sent
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sendArg = sendEmailMock.mock.calls[0]![0] as { to: string; subject: string };
    expect(sendArg.to).toBe('malika@example.com');
    expect(sendArg.subject).toContain('Sahovat');
  });

  it('skips auto-reply email when no email is provided', async () => {
    queryMock.mockResolvedValue({
      rows: [{ id: 'msg-uuid', reference_code: 'SAH-FEEDFACE' }],
    });

    const result = await submitContactMessage({
      name: 'Aziz',
      email: undefined,
      phone: '+998900000000',
      subject: 'Hi',
      message: 'No email here.',
      locale: 'uz',
      user_id: null,
      source_ip: null,
    });

    expect(result.email_reply_sent).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(adminAlertMock).toHaveBeenCalledTimes(1);
  });

  it('still returns success even when admin alert throws', async () => {
    queryMock.mockResolvedValue({
      rows: [{ id: 'msg-uuid', reference_code: 'SAH-12345678' }],
    });
    adminAlertMock.mockRejectedValue(new Error('telegram offline'));

    const result = await submitContactMessage({
      name: 'Aziz',
      email: undefined,
      phone: undefined,
      subject: 'Subject',
      message: 'A message that is long enough.',
      locale: 'en',
      user_id: null,
      source_ip: null,
    });

    expect(result.reference_code).toMatch(/^SAH-/);
    // Don't await microtasks here — the void promise is fire-and-forget; the
    // assertion is that the throw didn't reach the caller (no exception).
  });

  it('marks email_reply_sent=false when auto-reply send fails', async () => {
    queryMock.mockResolvedValue({
      rows: [{ id: 'msg-uuid', reference_code: 'SAH-AABBCCDD' }],
    });
    sendEmailMock.mockRejectedValue(new Error('resend api down'));

    const result = await submitContactMessage({
      name: 'Aziz',
      email: 'aziz@example.com',
      phone: undefined,
      subject: 'Subject',
      message: 'A message that is long enough.',
      locale: 'en',
      user_id: null,
      source_ip: null,
    });

    expect(result.email_reply_sent).toBe(false);
    expect(result.reference_code).toMatch(/^SAH-/);
  });
});
