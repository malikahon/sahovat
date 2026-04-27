import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { env } from '../config/env.js';

interface LayoutProps {
  /** Inbox preview text — appears next to subject in clients like Gmail. */
  previewText: string;
  children: React.ReactNode;
}

const COLORS = {
  brand: '#0F766E', // Teal — placeholder; align with frontend tokens later.
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  background: '#F9FAFB',
};

const FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Shared branded email layout. Used by every transactional template.
 *
 * Renders responsive container, brand header, footer with links to
 * /help and /trust-safety. The footer links currently 404 (Week 4 builds
 * those pages); the email still renders correctly.
 */
export function EmailLayout({ previewText, children }: LayoutProps) {
  const baseUrl = env.APP_BASE_URL.replace(/\/$/, '');

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{previewText}</Preview>
      <Body
        style={{
          fontFamily: FONT_STACK,
          backgroundColor: COLORS.background,
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: '560px',
            margin: '24px auto',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: `1px solid ${COLORS.border}`,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Section
            style={{
              padding: '24px 32px',
              borderBottom: `1px solid ${COLORS.border}`,
              backgroundColor: '#ffffff',
            }}
          >
            <Img
              src={`${baseUrl}/icon.svg`}
              width="32"
              height="32"
              alt="Sahovat"
              style={{ display: 'inline-block', verticalAlign: 'middle' }}
            />
            <Text
              style={{
                display: 'inline-block',
                marginLeft: '12px',
                fontSize: '18px',
                fontWeight: 700,
                color: COLORS.brand,
                verticalAlign: 'middle',
              }}
            >
              Sahovat
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '32px' }}>{children}</Section>

          {/* Footer */}
          <Hr style={{ margin: 0, borderColor: COLORS.border }} />
          <Section
            style={{
              padding: '20px 32px',
              backgroundColor: COLORS.background,
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: '12px',
                color: COLORS.muted,
                lineHeight: '18px',
              }}
            >
              Sahovat — Uzbekistan's compliant, escrow-backed crowdfunding
              platform.
            </Text>
            <Text
              style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: COLORS.muted,
                lineHeight: '18px',
              }}
            >
              <Link
                href={`${baseUrl}/help`}
                style={{ color: COLORS.muted, textDecoration: 'underline' }}
              >
                Help Center
              </Link>
              {' · '}
              <Link
                href={`${baseUrl}/trust-safety`}
                style={{ color: COLORS.muted, textDecoration: 'underline' }}
              >
                Trust &amp; Safety
              </Link>
            </Text>
            <Text
              style={{
                margin: '12px 0 0 0',
                fontSize: '11px',
                color: COLORS.muted,
              }}
            >
              © {new Date().getFullYear()} Sahovat. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const EMAIL_COLORS = COLORS;
export const EMAIL_FONT_STACK = FONT_STACK;
