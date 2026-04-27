'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/**
 * Demo Notifications Console
 *
 * Floating bottom-right panel that streams redacted previews of every
 * mock SMS / Telegram / Email send made for non-presenter users during
 * a live demo. Dismissable with × — dismissal persists for the whole
 * session via localStorage.
 *
 * Activation gates (BOTH must be true):
 *   - Build-time: NEXT_PUBLIC_DEMO_CONSOLE === 'true'
 *   - Runtime:    localStorage['demoConsoleDismissed'] !== 'true'
 *
 * Backend prerequisites (independently gated):
 *   - DEMO_CONSOLE_ENABLED=true on the backend
 *   - User is authenticated as admin (the SSE proxy enforces this)
 *
 * Spec: roadmap_short.md §10 task 5.10 + Appendix C.
 */

interface NotificationEvent {
  /** monotonically increasing client-side id used as React key */
  id: number;
  channel: 'sms' | 'telegram' | 'email';
  recipient: string;
  subject?: string;
  preview: string;
  timestamp: string;
}

const MAX_VISIBLE = 20;
const DISMISS_KEY = 'demoConsoleDismissed';

const CHANNEL_GLYPH: Record<NotificationEvent['channel'], string> = {
  sms: '📱',
  telegram: '✈',
  email: '✉',
};

const CHANNEL_LABEL: Record<NotificationEvent['channel'], string> = {
  sms: 'SMS',
  telegram: 'TG',
  email: 'EM',
};

function formatTime(iso: string): string {
  // Local-time HH:MM:SS — falls back to truncating the ISO if Date can't parse.
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return iso.slice(11, 19);
  const h = t.getHours().toString().padStart(2, '0');
  const m = t.getMinutes().toString().padStart(2, '0');
  const s = t.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function DemoNotificationsConsole() {
  const buildEnabled = process.env.NEXT_PUBLIC_DEMO_CONSOLE === 'true';

  // We initialize "mounted" lazily: SSR pass returns null; client effect
  // checks localStorage and decides whether to mount. This avoids hydration
  // mismatch on dismissed state.
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<NotificationEvent[]>([]);

  useEffect(() => {
    if (!buildEnabled) return;
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(DISMISS_KEY) === 'true') return;
    setMounted(true);
  }, [buildEnabled]);

  useEffect(() => {
    if (!mounted) return undefined;

    const source = new EventSource('/api/dev/notifications-stream');

    let counter = 0;
    const handleNotification = (msg: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(msg.data) as Omit<NotificationEvent, 'id'>;
        if (!parsed.channel || !parsed.recipient || !parsed.timestamp) return;
        counter += 1;
        setEvents((prev) => {
          const next = [{ ...parsed, id: counter }, ...prev];
          return next.slice(0, MAX_VISIBLE);
        });
      } catch {
        // ignore malformed events
      }
    };

    source.addEventListener('notification', handleNotification as EventListener);

    source.onerror = () => {
      // Browser auto-reconnects; we don't surface transient errors in the UI.
    };

    return () => {
      source.removeEventListener('notification', handleNotification as EventListener);
      source.close();
    };
  }, [mounted]);

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, 'true');
    }
    setMounted(false);
  };

  if (!buildEnabled || !mounted) return null;

  return (
    <div
      className="pointer-events-auto fixed bottom-4 right-4 z-[9999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
      style={{ maxHeight: '50vh' }}
      data-testid="demo-notifications-console"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
          <span className="text-xs font-semibold tracking-wider text-foreground/90">
            DEMO NOTIFICATIONS
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss demo console"
          className="-mr-1 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            Waiting for mock-user notifications…
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((evt) => (
              <li
                key={evt.id}
                className="flex flex-col gap-0.5 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-mono text-[10px]">
                    {formatTime(evt.timestamp)}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase">
                    {CHANNEL_GLYPH[evt.channel]} {CHANNEL_LABEL[evt.channel]}
                  </span>
                  <span className="font-mono text-[11px] text-foreground/80">
                    {evt.recipient}
                  </span>
                </div>
                {evt.subject ? (
                  <div className="font-medium text-foreground">
                    Subject: {evt.subject}
                  </div>
                ) : null}
                <div className="line-clamp-2 text-foreground/70">
                  {evt.preview}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
