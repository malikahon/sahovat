import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('telegram.service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MockTelegramService (default in tests)', () => {
    it('sendMessage returns a synthetic message_id and logs', async () => {
      const { telegramService } = await import('../../../src/services/telegram.service.js');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await telegramService.sendMessage('12345', {
        text: 'hello world',
      });

      expect(result.message_id).toEqual(expect.any(Number));
      const calls = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(calls).toContain('[MOCK TG]');
      expect(calls).toContain('chat=12345');
    });
  });

  describe('RealTelegramService', () => {
    async function loadServiceWithReal() {
      vi.resetModules();
      const envModule = await import('../../../src/config/env.js');
      (envModule.env as { TELEGRAM_PROVIDER: string }).TELEGRAM_PROVIDER = 'real';
      // Token is set in vitest.config.ts already, but make sure.
      (envModule.env as { TELEGRAM_BOT_TOKEN: string }).TELEGRAM_BOT_TOKEN =
        envModule.env.TELEGRAM_BOT_TOKEN || '123456:test_bot_token_for_fixtures';
      const svc = await import('../../../src/services/telegram.service.js');
      return svc;
    }

    it('posts to the Telegram sendMessage endpoint with correct payload', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        async json() {
          return { ok: true, result: { message_id: 42 } };
        },
        async text() {
          return '';
        },
      });
      vi.stubGlobal('fetch', fetchMock);

      const { telegramService } = await loadServiceWithReal();
      const result = await telegramService.sendMessage('98765', {
        text: '<b>hello</b>',
      });

      expect(result.message_id).toBe(42);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/bot');
      expect(url).toContain('/sendMessage');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body as string);
      expect(body.chat_id).toBe('98765');
      expect(body.text).toBe('<b>hello</b>');
      expect(body.parse_mode).toBe('HTML');
      expect(body.disable_web_page_preview).toBe(true);
    });

    it('throws when Telegram returns non-2xx', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          async text() {
            return 'bot was blocked by the user';
          },
        }),
      );
      const { telegramService } = await loadServiceWithReal();
      await expect(
        telegramService.sendMessage('99999', { text: 'x' }),
      ).rejects.toThrow(/403.*blocked/);
    });

    it('throws when Telegram responds ok=false', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          async json() {
            return { ok: false, description: 'chat not found' };
          },
          async text() {
            return '';
          },
        }),
      );
      const { telegramService } = await loadServiceWithReal();
      await expect(
        telegramService.sendMessage('99999', { text: 'x' }),
      ).rejects.toThrow(/chat not found/);
    });

    it('throws on fetch network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
      const { telegramService } = await loadServiceWithReal();
      await expect(
        telegramService.sendMessage('99999', { text: 'x' }),
      ).rejects.toThrow(/ECONNRESET/);
    });
  });
});
