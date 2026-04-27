'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bell,
  Loader2,
  Phone,
  Send as TelegramIcon,
  Mail,
  Save,
  Info,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { usersApi } from '@/lib/api';

type Channel = 'sms' | 'telegram' | 'email';

const EVENT_TYPES = [
  'donation_completed',
  'campaign_verified',
  'withdrawal_status_changed',
  'recurring_charge_succeeded',
  'recurring_charge_failed',
  'campaign_milestone_reached',
  'contact_message_received',
] as const;

type EventType = (typeof EVENT_TYPES)[number];

const CHANNELS: readonly Channel[] = ['sms', 'telegram', 'email'] as const;

interface PreferenceRow {
  user_id: string;
  event_type: string;
  channel: Channel;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Profile notification matrix.
 *
 * Rows = events, columns = channels. Each cell is a Switch. Channel
 * columns disable their cells when the user lacks the underlying
 * endpoint (no phone, no Telegram link, no verified email).
 *
 * Save is explicit (a Save button at the bottom) — this avoids the
 * "did my toggle take?" feedback gap of debounced auto-save.
 */
export function NotificationPreferencesSection() {
  const t = useTranslations('profile.notifications');
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // The grid is stored as a flat key→bool map for ergonomic toggling.
  const [grid, setGrid] = useState<Record<string, boolean>>({});
  const [initialGrid, setInitialGrid] = useState<Record<string, boolean>>({});

  const cellKey = (event: EventType, channel: Channel) => `${event}:${channel}`;

  // Load preferences on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await usersApi.getNotificationPreferences();
        if (cancelled) return;
        if (result.success && result.data) {
          const next: Record<string, boolean> = {};
          for (const p of result.data.preferences as PreferenceRow[]) {
            next[`${p.event_type}:${p.channel}`] = p.enabled;
          }
          setGrid(next);
          setInitialGrid(next);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Per-channel availability gates.
  const channelDisabled = useMemo<Record<Channel, { disabled: boolean; reason?: string }>>(() => {
    if (!user) {
      return {
        sms: { disabled: true },
        telegram: { disabled: true },
        email: { disabled: true },
      };
    }
    return {
      sms: user.phone_number
        ? { disabled: false }
        : { disabled: true, reason: t('disabled.noPhone') },
      telegram: user.telegram_id
        ? { disabled: false }
        : { disabled: true, reason: t('disabled.noTelegram') },
      email:
        user.email && user.email_verified_at
          ? { disabled: false }
          : {
              disabled: true,
              reason: user.email
                ? t('disabled.emailUnverified')
                : t('disabled.noEmail'),
            },
    };
  }, [user, t]);

  const dirty = useMemo(() => {
    for (const key of Object.keys(grid)) {
      if (grid[key] !== initialGrid[key]) return true;
    }
    for (const key of Object.keys(initialGrid)) {
      if (grid[key] !== initialGrid[key]) return true;
    }
    return false;
  }, [grid, initialGrid]);

  const handleToggle = (event: EventType, channel: Channel, next: boolean) => {
    setGrid((prev) => ({ ...prev, [cellKey(event, channel)]: next }));
    setSaveMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      // Send only changed cells to keep the payload minimal.
      const updates: Array<{
        event_type: EventType;
        channel: Channel;
        enabled: boolean;
      }> = [];
      for (const event of EVENT_TYPES) {
        for (const channel of CHANNELS) {
          const key = cellKey(event, channel);
          if (grid[key] !== initialGrid[key]) {
            updates.push({ event_type: event, channel, enabled: grid[key] === true });
          }
        }
      }
      if (updates.length === 0) {
        setSaving(false);
        return;
      }

      const result = await usersApi.updateNotificationPreferences(updates);
      if (result.success && result.data) {
        const next: Record<string, boolean> = {};
        for (const p of result.data.preferences as PreferenceRow[]) {
          next[`${p.event_type}:${p.channel}`] = p.enabled;
        }
        setGrid(next);
        setInitialGrid(next);
        setSaveMessage({ type: 'success', text: t('saveSuccess') });
      } else {
        setSaveMessage({
          type: 'error',
          text: result.error ?? t('saveError'),
        });
      }
    } catch {
      setSaveMessage({ type: 'error', text: t('saveError') });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Card id="notifications">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pl-1 pr-3 text-left font-medium text-muted-foreground">
                      {t('eventLabel')}
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                      <span className="inline-flex flex-col items-center gap-1">
                        <Phone className="size-4" />
                        <span className="text-xs">{t('channels.sms')}</span>
                      </span>
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                      <span className="inline-flex flex-col items-center gap-1">
                        <TelegramIcon className="size-4" />
                        <span className="text-xs">{t('channels.telegram')}</span>
                      </span>
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                      <span className="inline-flex flex-col items-center gap-1">
                        <Mail className="size-4" />
                        <span className="text-xs">{t('channels.email')}</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EVENT_TYPES.map((event) => (
                    <tr key={event} className="border-b last:border-0">
                      <td className="py-3 pl-1 pr-3 align-middle">
                        <div className="font-medium">{t(`events.${event}.label`)}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {t(`events.${event}.help`)}
                        </div>
                      </td>
                      {CHANNELS.map((channel) => {
                        const gate = channelDisabled[channel];
                        const checked = grid[cellKey(event, channel)] === true;
                        return (
                          <td
                            key={channel}
                            className="px-3 py-3 text-center align-middle"
                          >
                            <div className="inline-flex flex-col items-center gap-1">
                              <Switch
                                checked={checked}
                                onCheckedChange={(next: boolean) =>
                                  handleToggle(event, channel, next === true)
                                }
                                disabled={gate.disabled}
                                aria-label={`${t(`events.${event}.label`)} — ${t(`channels.${channel}`)}`}
                              />
                              {gate.disabled && gate.reason ? (
                                <span className="max-w-[7rem] text-[10px] leading-tight text-muted-foreground">
                                  {gate.reason}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Helper text for any disabled channel */}
            {Object.values(channelDisabled).some((g) => g.disabled) ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span>{t('hintLinkAccounts')}</span>
              </div>
            ) : null}

            {/* Save row */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <div aria-live="polite">
                {saveMessage ? (
                  <span
                    className={
                      saveMessage.type === 'success'
                        ? 'text-xs text-green-700'
                        : 'text-xs text-destructive'
                    }
                  >
                    {saveMessage.text}
                  </span>
                ) : null}
              </div>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {t('save')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
