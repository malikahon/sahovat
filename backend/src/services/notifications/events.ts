/**
 * Discriminated union of payloads passed to NotificationDispatcher.dispatch().
 * Each event_type has a strongly-typed payload shape: missing fields → TS error
 * at the call site.
 */

export interface EventPayload {
  donation_completed: {
    /** Donation row id. */
    donationId: string;
    /** Campaign row id. */
    campaignId: string;
    /** Campaign title (denormalized for message construction). */
    campaignTitle: string;
    /** Gross UZS amount. */
    amount: number;
    /** Donor's display name (or "Anonymous" when is_anonymous). */
    donorName: string;
  };

  campaign_verified: {
    campaignId: string;
    campaignTitle: string;
  };

  withdrawal_status_changed: {
    withdrawalId: string;
    status: 'approved' | 'rejected' | 'completed';
    amount: number;
    /** Only set when status === 'completed'. */
    transactionReference: string | null;
    /** Optional admin note (rejection reason, etc.). */
    adminNotes: string | null;
  };

  recurring_charge_succeeded: {
    recurringId: string;
    donationId: string;
    amount: number;
    /** Optional — recurring may target a category instead of a fixed campaign. */
    campaignId: string | null;
    campaignTitle: string | null;
  };

  recurring_charge_failed: {
    recurringId: string;
    /** Current failure count (1, 2, or 3+). */
    failureCount: number;
    /** True when the recurring was auto-paused after 3 failures. */
    paused: boolean;
  };

  campaign_milestone_reached: {
    campaignId: string;
    campaignTitle: string;
    /** Crossed threshold: 25 | 50 | 75 | 90 | 100. */
    percentage: 25 | 50 | 75 | 90 | 100;
    currentAmount: number;
    goalAmount: number;
  };

  contact_message_received: {
    /** Short reference shown to the submitter. */
    referenceNumber: string;
    /** Submitter-provided email, if any. */
    submitterEmail: string | null;
    /** Submitter-provided name, if any. */
    submitterName: string | null;
    /** First 200 chars of the message body, for admin alert preview. */
    messagePreview: string;
  };
}

/** All milestone thresholds, in ascending order. */
export const MILESTONE_THRESHOLDS = [25, 50, 75, 90, 100] as const;
