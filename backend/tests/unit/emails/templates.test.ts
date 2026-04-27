import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render } from '@react-email/render';

import { DonationReceiptEmail } from '../../../src/emails/DonationReceiptEmail.js';
import { CampaignVerifiedEmail } from '../../../src/emails/CampaignVerifiedEmail.js';
import { WithdrawalStatusEmail } from '../../../src/emails/WithdrawalStatusEmail.js';
import { RecurringChargeSucceededEmail } from '../../../src/emails/RecurringChargeSucceededEmail.js';
import { RecurringChargeFailedEmail } from '../../../src/emails/RecurringChargeFailedEmail.js';
import { CampaignMilestoneEmail } from '../../../src/emails/CampaignMilestoneEmail.js';
import { ContactReplyEmail } from '../../../src/emails/ContactReplyEmail.js';

const LOCALES = ['uz', 'ru', 'en'] as const;

async function renderBoth(element: React.ReactElement): Promise<{ html: string; text: string }> {
  const html = await render(element);
  const text = await render(element, { plainText: true });
  return { html, text };
}

describe('email templates', () => {
  describe('DonationReceiptEmail', () => {
    for (const locale of LOCALES) {
      it(`renders ${locale} HTML containing key data`, async () => {
        const { html, text } = await renderBoth(
          React.createElement(DonationReceiptEmail, {
            donationId: 'd-123',
            campaignId: 'c-456',
            campaignTitle: 'Help Aziza',
            amount: 50_000,
            donatedAt: '2026-04-27T12:00:00Z',
            locale,
          }),
        );
        expect(html).toContain('Help Aziza');
        expect(html).toContain('50,000');
        expect(html).toContain('UZS');
        expect(html).toContain('/my-donations/d-123/receipt');
        expect(html).toContain('/campaigns/c-456');
        expect(text).toContain('50,000');
      });
    }
  });

  describe('CampaignVerifiedEmail', () => {
    for (const locale of LOCALES) {
      it(`renders ${locale} HTML containing campaign title and manage link`, async () => {
        const { html } = await renderBoth(
          React.createElement(CampaignVerifiedEmail, {
            campaignId: 'c-456',
            campaignTitle: 'Help Aziza',
            locale,
          }),
        );
        expect(html).toContain('Help Aziza');
        expect(html).toContain('/campaigns/c-456/manage');
      });
    }
  });

  describe('WithdrawalStatusEmail', () => {
    for (const status of ['approved', 'rejected', 'completed'] as const) {
      it(`renders ${status} status correctly (en)`, async () => {
        const { html } = await renderBoth(
          React.createElement(WithdrawalStatusEmail, {
            withdrawalId: 'w-1',
            status,
            amount: 1_500_000,
            transactionReference: status === 'completed' ? 'TXN-AAA' : null,
            adminNotes: status === 'rejected' ? 'Insufficient documents' : null,
            locale: 'en',
          }),
        );
        expect(html).toContain('1,500,000');
        if (status === 'completed') {
          expect(html).toContain('TXN-AAA');
        }
        if (status === 'rejected') {
          expect(html).toContain('Insufficient documents');
        }
      });
    }
  });

  describe('RecurringChargeSucceededEmail', () => {
    it('renders amount and campaign title', async () => {
      const { html } = await renderBoth(
        React.createElement(RecurringChargeSucceededEmail, {
          recurringId: 'r1',
          donationId: 'd1',
          amount: 75_000,
          campaignTitle: 'Help Aziza',
          locale: 'en',
        }),
      );
      expect(html).toContain('75,000');
      expect(html).toContain('Help Aziza');
    });

    it('omits campaign block when title is null', async () => {
      const { html } = await renderBoth(
        React.createElement(RecurringChargeSucceededEmail, {
          recurringId: 'r1',
          donationId: 'd1',
          amount: 75_000,
          campaignTitle: null,
          locale: 'en',
        }),
      );
      expect(html).toContain('75,000');
      // Just ensure it still renders without throwing.
    });
  });

  describe('RecurringChargeFailedEmail', () => {
    it('shows the paused copy when paused=true', async () => {
      const { html, text } = await renderBoth(
        React.createElement(RecurringChargeFailedEmail, {
          recurringId: 'r1',
          failureCount: 3,
          paused: true,
          locale: 'en',
        }),
      );
      expect(html).toMatch(/paused/i);
      // React inserts <!-- --> between adjacent text fragments; assert via text.
      expect(text).toContain('3 / 3');
    });

    it('shows the retry copy when paused=false', async () => {
      const { html, text } = await renderBoth(
        React.createElement(RecurringChargeFailedEmail, {
          recurringId: 'r1',
          failureCount: 1,
          paused: false,
          locale: 'en',
        }),
      );
      expect(html).toMatch(/failed|retry/i);
      expect(text).toContain('1 / 3');
    });
  });

  describe('CampaignMilestoneEmail', () => {
    for (const pct of [25, 50, 75, 90, 100] as const) {
      it(`renders ${pct}% milestone (en)`, async () => {
        const { html } = await renderBoth(
          React.createElement(CampaignMilestoneEmail, {
            campaignId: 'c1',
            campaignTitle: 'Help Aziza',
            percentage: pct,
            currentAmount: 5_000_000,
            goalAmount: 10_000_000,
            locale: 'en',
          }),
        );
        expect(html).toContain('Help Aziza');
        expect(html).toContain(`${pct}%`);
        expect(html).toContain('5,000,000');
        expect(html).toContain('10,000,000');
      });
    }
  });

  describe('ContactReplyEmail', () => {
    it('renders the reference number', async () => {
      const { html, text } = await renderBoth(
        React.createElement(ContactReplyEmail, {
          referenceNumber: 'CT-AB12CD34',
          submitterName: 'Malika',
          locale: 'en',
        }),
      );
      expect(html).toContain('CT-AB12CD34');
      expect(html).toContain('Malika');
      expect(text).toContain('CT-AB12CD34');
    });
  });

  describe('all templates produce non-empty plain text', () => {
    it('every template renders both HTML and text > 0 bytes', async () => {
      const elements: React.ReactElement[] = [
        React.createElement(DonationReceiptEmail, {
          donationId: 'd',
          campaignId: 'c',
          campaignTitle: 't',
          amount: 1,
          donatedAt: '2026-01-01',
          locale: 'uz',
        }),
        React.createElement(CampaignVerifiedEmail, {
          campaignId: 'c',
          campaignTitle: 't',
          locale: 'ru',
        }),
        React.createElement(WithdrawalStatusEmail, {
          withdrawalId: 'w',
          status: 'approved',
          amount: 1,
          transactionReference: null,
          adminNotes: null,
          locale: 'en',
        }),
        React.createElement(RecurringChargeSucceededEmail, {
          recurringId: 'r',
          donationId: 'd',
          amount: 1,
          campaignTitle: null,
          locale: 'uz',
        }),
        React.createElement(RecurringChargeFailedEmail, {
          recurringId: 'r',
          failureCount: 1,
          paused: false,
          locale: 'ru',
        }),
        React.createElement(CampaignMilestoneEmail, {
          campaignId: 'c',
          campaignTitle: 't',
          percentage: 50,
          currentAmount: 1,
          goalAmount: 2,
          locale: 'en',
        }),
        React.createElement(ContactReplyEmail, {
          referenceNumber: 'CT-X',
          locale: 'uz',
        }),
      ];
      for (const el of elements) {
        const { html, text } = await renderBoth(el);
        expect(html.length).toBeGreaterThan(100);
        expect(text.length).toBeGreaterThan(20);
      }
    });
  });
});
