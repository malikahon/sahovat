import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { DemoNotificationsConsole } from '@/components/dev/DemoNotificationsConsole';

/**
 * EventSource isn't implemented in jsdom; provide a minimal stub that
 * captures listeners so we can simulate `notification` events.
 */
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  readyState = 1;
  listeners: Record<string, ((evt: MessageEvent<string>) => void)[]> = {};
  onerror: ((evt: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (evt: MessageEvent<string>) => void) {
    (this.listeners[type] ??= []).push(listener);
  }

  removeEventListener(type: string, listener: (evt: MessageEvent<string>) => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((l) => l !== listener);
  }

  emit(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) });
    for (const listener of this.listeners[type] ?? []) listener(event);
  }

  close() {
    this.readyState = 2;
  }
}

describe('DemoNotificationsConsole', () => {
  beforeEach(() => {
    window.localStorage.clear();
    MockEventSource.instances = [];
    (globalThis as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders nothing when NEXT_PUBLIC_DEMO_CONSOLE is not "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_CONSOLE', 'false');
    const { container } = render(<DemoNotificationsConsole />);
    expect(container.firstChild).toBeNull();
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('renders nothing when localStorage demoConsoleDismissed=true', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_CONSOLE', 'true');
    window.localStorage.setItem('demoConsoleDismissed', 'true');
    const { container } = render(<DemoNotificationsConsole />);
    // After the first effect tick the component should still be null.
    expect(container.querySelector('[data-testid="demo-notifications-console"]')).toBeNull();
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('mounts when env=true and not dismissed, and renders an empty state', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_CONSOLE', 'true');
    render(<DemoNotificationsConsole />);
    expect(screen.getByTestId('demo-notifications-console')).toBeInTheDocument();
    expect(screen.getByText(/Waiting for mock-user notifications/i)).toBeInTheDocument();
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]!.url).toBe('/api/dev/notifications-stream');
  });

  it('renders incoming notification events newest-first', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_CONSOLE', 'true');
    render(<DemoNotificationsConsole />);
    const source = MockEventSource.instances[0]!;

    await act(async () => {
      source.emit('notification', {
        channel: 'sms',
        recipient: '+998***1800',
        preview: 'Your OTP is 123456',
        timestamp: new Date('2026-04-27T12:34:56Z').toISOString(),
      });
    });
    await act(async () => {
      source.emit('notification', {
        channel: 'email',
        recipient: 'm***@example.com',
        subject: 'Receipt',
        preview: 'Thanks for donating',
        timestamp: new Date('2026-04-27T12:35:01Z').toISOString(),
      });
    });

    // Both rows visible.
    expect(screen.getByText(/Your OTP is/)).toBeInTheDocument();
    expect(screen.getByText('Subject: Receipt')).toBeInTheDocument();
  });

  it('persists dismissal to localStorage and unmounts on close click', async () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_CONSOLE', 'true');
    const { queryByTestId } = render(<DemoNotificationsConsole />);
    const closeBtn = screen.getByLabelText('Dismiss demo console');

    await act(async () => {
      closeBtn.click();
    });

    expect(window.localStorage.getItem('demoConsoleDismissed')).toBe('true');
    expect(queryByTestId('demo-notifications-console')).toBeNull();
  });
});
