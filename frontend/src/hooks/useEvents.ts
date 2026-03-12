'use client';

import { useCallback, useEffect, useRef } from 'react';

// ============================================================
// SESSION ID — Guest session tracking (11.7)
// ============================================================

const SESSION_KEY = 'sahovat_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// ============================================================
// EVENT TYPES
// ============================================================

type EventType =
  | 'campaign_viewed'
  | 'campaign_shared'
  | 'donation_initiated'
  | 'donation_completed';

interface TrackEventPayload {
  event_type: EventType;
  campaign_id?: string;
  session_id: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// SEND EVENT
// ============================================================

async function sendEvent(payload: TrackEventPayload): Promise<void> {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silently fail — analytics should never break the UX
  }
}

// ============================================================
// HOOK
// ============================================================

/**
 * useEvents — Behavioral event tracking hook.
 *
 * Tracks campaign views with time-on-page, shares, and donation events.
 * Works for both authenticated and anonymous users (guest sessions via localStorage).
 */
export function useEvents() {
  const sessionId = useRef<string>('');

  useEffect(() => {
    sessionId.current = getSessionId();
  }, []);

  /**
   * Track a campaign view. Call on mount of campaign detail page.
   * Returns a cleanup function that sends time_spent_ms on unmount.
   */
  const trackView = useCallback((campaignId: string) => {
    const startTime = Date.now();
    const sid = sessionId.current || getSessionId();

    // Fire initial view event
    sendEvent({
      event_type: 'campaign_viewed',
      campaign_id: campaignId,
      session_id: sid,
      metadata: { source: 'detail_page' },
    });

    // Return cleanup that reports time spent
    return () => {
      const timeSpentMs = Date.now() - startTime;
      if (timeSpentMs > 1000) {
        // Only report if user spent > 1 second
        // Use sendBeacon for reliable delivery on page unload
        const payload: TrackEventPayload = {
          event_type: 'campaign_viewed',
          campaign_id: campaignId,
          session_id: sid,
          metadata: {
            source: 'detail_page_exit',
            time_spent_ms: timeSpentMs,
          },
        };

        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(
            '/api/events',
            new Blob([JSON.stringify(payload)], { type: 'application/json' }),
          );
        } else {
          sendEvent(payload);
        }
      }
    };
  }, []);

  /**
   * Track a campaign share.
   */
  const trackShare = useCallback((campaignId: string) => {
    const sid = sessionId.current || getSessionId();
    sendEvent({
      event_type: 'campaign_shared',
      campaign_id: campaignId,
      session_id: sid,
    });
  }, []);

  /**
   * Track donation initiation (bottom sheet opened).
   */
  const trackDonationInitiated = useCallback((campaignId: string) => {
    const sid = sessionId.current || getSessionId();
    sendEvent({
      event_type: 'donation_initiated',
      campaign_id: campaignId,
      session_id: sid,
    });
  }, []);

  /**
   * Track donation completion.
   */
  const trackDonationCompleted = useCallback((campaignId: string, amount?: number) => {
    const sid = sessionId.current || getSessionId();
    sendEvent({
      event_type: 'donation_completed',
      campaign_id: campaignId,
      session_id: sid,
      metadata: amount ? { amount } : undefined,
    });
  }, []);

  return {
    trackView,
    trackShare,
    trackDonationInitiated,
    trackDonationCompleted,
  };
}
