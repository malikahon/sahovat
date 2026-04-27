import * as React from 'react';
import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout, EMAIL_COLORS } from './_layout.js';

interface EmailVerificationCodeEmailProps {
  code: string;
  expiresInMinutes: number;
}

/**
 * One-time verification code email.
 *
 * Body is intentionally short — the code is the entire payload. Long
 * marketing-style copy in transactional code emails hurts deliverability
 * and is the #1 cause of "this looks like phishing" reports.
 */
export function EmailVerificationCodeEmail({
  code,
  expiresInMinutes,
}: EmailVerificationCodeEmailProps) {
  return (
    <EmailLayout previewText={`Your Sahovat verification code is ${code}`}>
      <Heading
        as="h1"
        style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 700,
          color: EMAIL_COLORS.text,
        }}
      >
        Verify your email
      </Heading>

      <Text
        style={{
          margin: '12px 0 24px 0',
          fontSize: '14px',
          color: EMAIL_COLORS.muted,
          lineHeight: '22px',
        }}
      >
        Enter this code in Sahovat to verify your email address.
      </Text>

      <Section
        style={{
          textAlign: 'center',
          padding: '20px',
          backgroundColor: EMAIL_COLORS.background,
          borderRadius: '8px',
          border: `1px solid ${EMAIL_COLORS.border}`,
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '8px',
            fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
            color: EMAIL_COLORS.brand,
          }}
        >
          {code}
        </Text>
      </Section>

      <Text
        style={{
          margin: '24px 0 0 0',
          fontSize: '13px',
          color: EMAIL_COLORS.muted,
          lineHeight: '20px',
        }}
      >
        This code expires in {expiresInMinutes} minutes.
      </Text>

      <Text
        style={{
          margin: '12px 0 0 0',
          fontSize: '12px',
          color: EMAIL_COLORS.muted,
          lineHeight: '18px',
        }}
      >
        If you didn't request this, you can safely ignore this email — no
        changes will be made to your account.
      </Text>
    </EmailLayout>
  );
}

EmailVerificationCodeEmail.PreviewProps = {
  code: '123456',
  expiresInMinutes: 10,
};

export default EmailVerificationCodeEmail;
