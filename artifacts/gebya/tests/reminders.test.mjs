/**
 * Unit tests for utils/reminders.js — reminder message templates,
 * channel discovery, channel URL builders, and clipboard helper.
 *
 * Run: pnpm vitest run tests/reminders.test.mjs
 */
/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  REMINDER_TEMPLATES,
  CHANNEL_INFO,
  buildReminderMessage,
  getAvailableChannels,
  preferredChannel,
  buildChannelUrl,
  copyMessageToClipboard,
  countCustomersWithBalance,
  daysAgoLabel,
} from '../src/utils/reminders.js';

describe('REMINDER_TEMPLATES', () => {
  it('has gentle, firm, and final templates', () => {
    expect(REMINDER_TEMPLATES.gentle).toBeDefined();
    expect(REMINDER_TEMPLATES.firm).toBeDefined();
    expect(REMINDER_TEMPLATES.final).toBeDefined();
  });

  it('each template has en and am text plus label and emoji', () => {
    for (const key of Object.keys(REMINDER_TEMPLATES)) {
      const tpl = REMINDER_TEMPLATES[key];
      expect(tpl.en).toBeTruthy();
      expect(tpl.am).toBeTruthy();
      expect(tpl.label.en).toBeTruthy();
      expect(tpl.label.am).toBeTruthy();
      expect(tpl.emoji).toBeTruthy();
    }
  });

  it('templates contain placeholder variables', () => {
    expect(REMINDER_TEMPLATES.gentle.en).toContain('{name}');
    expect(REMINDER_TEMPLATES.gentle.en).toContain('{shop}');
    expect(REMINDER_TEMPLATES.gentle.en).toContain('{amount}');
  });
});

describe('CHANNEL_INFO', () => {
  it('has telegram, whatsapp, sms, and tel channels', () => {
    expect(CHANNEL_INFO.telegram).toBeDefined();
    expect(CHANNEL_INFO.whatsapp).toBeDefined();
    expect(CHANNEL_INFO.sms).toBeDefined();
    expect(CHANNEL_INFO.tel).toBeDefined();
  });
});

describe('buildReminderMessage', () => {
  it('substitutes {name}, {shop}, {amount} in English gentle template', () => {
    const msg = buildReminderMessage({
      template: 'gentle', lang: 'en',
      customer: { display_name: 'Almaz', balance: 500 }, shopName: 'Tigist Shop',
    });
    expect(msg).toContain('Almaz');
    expect(msg).toContain('Tigist Shop');
    expect(msg).toContain('500');
  });

    it('substitutes variables in Amharic gentle template', () => {
    const msg = buildReminderMessage({
      template: 'gentle', lang: 'am',
      customer: { display_name: 'Almaz', balance: 500 }, shopName: 'Tigist Shop',
    });
    // Amharic template starts with "ሰላም" (Hello)
    expect(msg).toContain('ሰላም');
    // Variables are substituted verbatim (English name stays)
    expect(msg).toContain('Almaz');
    expect(msg).toContain('500');
  });

  it('uses firm template in English', () => {
    const msg = buildReminderMessage({
      template: 'firm', lang: 'en',
      customer: { display_name: 'Almaz', balance: 300 }, shopName: 'Shop',
    });
    expect(msg).toContain('past due');
    expect(msg).toContain('Almaz');
    expect(msg).toContain('300');
  });

    it('uses final template in Amharic', () => {
    const msg = buildReminderMessage({
      template: 'final', lang: 'am',
      customer: { display_name: 'አልማዝ', balance: 1000 }, shopName: 'ሱቅ',
    });
    expect(msg).toContain('ዛሬ ያስተናግዱ');
    expect(msg).toContain('አልተከፈለም');
  });

  it('defaults to gentle template when template is unknown', () => {
    const msg = buildReminderMessage({
      template: 'unknown', lang: 'en',
      customer: { display_name: 'A', balance: 100 }, shopName: 'S',
    });
    expect(msg).toBe(buildReminderMessage({
      template: 'gentle', lang: 'en',
      customer: { display_name: 'A', balance: 100 }, shopName: 'S',
    }));
  });

  it('defaults to English when lang is not "am"', () => {
    const msg = buildReminderMessage({
      template: 'gentle', lang: 'fr',
      customer: { display_name: 'A', balance: 100 }, shopName: 'S',
    });
    expect(msg).toBe(buildReminderMessage({
      template: 'gentle', lang: 'en',
      customer: { display_name: 'A', balance: 100 }, shopName: 'S',
    }));
  });

  it('falls back to "customer" when display_name is missing', () => {
    const msg = buildReminderMessage({
      template: 'gentle', lang: 'en',
      customer: { balance: 100 }, shopName: 'Shop',
    });
    expect(msg).toContain('customer');
  });

  it('falls back to "the shop" when shopName is null', () => {
    const msg = buildReminderMessage({
      template: 'gentle', lang: 'en',
      customer: { display_name: 'A', balance: 100 }, shopName: null,
    });
    expect(msg).toContain('the shop');
  });

  it('formats whole-number balance without decimals', () => {
    const msg = buildReminderMessage({
      template: 'gentle', lang: 'en',
      customer: { display_name: 'A', balance: 500 }, shopName: 'S',
    });
    expect(msg).toContain('500');
    expect(msg).not.toMatch(/\d+\.\d+/);
  });

  it('rounds fractional balance to nearest integer', () => {
    const msg = buildReminderMessage({
      template: 'gentle', lang: 'en',
      customer: { display_name: 'A', balance: 500.7 }, shopName: 'S',
    });
        expect(msg).toContain('501');
  });
});

describe('getAvailableChannels', () => {
  it('returns telegram when customer has telegram_username', () => {
    expect(getAvailableChannels({ telegram_username: 'almaz' })).toEqual(['telegram']);
  });

  it('returns telegram when customer has telegram_chat_id', () => {
    expect(getAvailableChannels({ telegram_chat_id: '12345' })).toEqual(['telegram']);
  });

  it('returns all phone channels when customer has phone_number only', () => {
    expect(getAvailableChannels({ phone_number: '+251911000030' }))
      .toEqual(['whatsapp', 'sms', 'tel']);
  });

  it('returns telegram first then phone channels', () => {
    expect(getAvailableChannels({
      telegram_username: 'almaz', phone_number: '+251911000030',
    })).toEqual(['telegram', 'whatsapp', 'sms', 'tel']);
  });

  it('returns empty array when no contact info', () => {
    expect(getAvailableChannels({})).toEqual([]);
  });

  it('returns empty array for null customer', () => {
    expect(getAvailableChannels(null)).toEqual([]);
  });

  it('does not duplicate telegram when both username and chat_id present', () => {
    expect(getAvailableChannels({
      telegram_username: 'almaz', telegram_chat_id: '12345',
    })).toEqual(['telegram']);
  });
});

describe('preferredChannel', () => {
  it('returns telegram when available', () => {
    expect(preferredChannel({ telegram_username: 'al', phone_number: '+2519' })).toBe('telegram');
  });

  it('returns whatsapp when no telegram but has phone', () => {
    expect(preferredChannel({ phone_number: '+2519' })).toBe('whatsapp');
  });

  it('returns null when no contact info', () => {
    expect(preferredChannel({})).toBeNull();
  });

  it('returns null for null customer', () => {
    expect(preferredChannel(null)).toBeNull();
  });
});

describe('buildChannelUrl', () => {
  const msg = 'Hello from Tigist Shop';

  it('builds t.me URL for telegram (strips @)', () => {
    expect(buildChannelUrl({
      channel: 'telegram', customer: { telegram_username: '@almaz' }, message: msg,
    })).toBe('https://t.me/almaz');
  });

  it('builds t.me URL when username has no @', () => {
    expect(buildChannelUrl({
      channel: 'telegram', customer: { telegram_username: 'almaz' }, message: msg,
    })).toBe('https://t.me/almaz');
  });

  it('returns null for telegram when no username', () => {
    expect(buildChannelUrl({
      channel: 'telegram', customer: { telegram_chat_id: '123' }, message: msg,
    })).toBeNull();
  });

  it('builds whatsapp URL with encoded message', () => {
    const url = buildChannelUrl({
      channel: 'whatsapp', customer: { phone_number: '+251911000030' }, message: msg,
    });
    expect(url).toContain('https://wa.me/251911000030');
    expect(url).toContain(encodeURIComponent(msg));
  });

  it('builds SMS URL with encoded message', () => {
    const url = buildChannelUrl({
      channel: 'sms', customer: { phone_number: '+251911000030' }, message: msg,
    });
    expect(url).toContain('sms:+251911000030');
    expect(url).toContain(encodeURIComponent(msg));
  });

  it('builds tel URL', () => {
    expect(buildChannelUrl({
      channel: 'tel', customer: { phone_number: '+251911000030' }, message: msg,
    })).toBe('tel:+251911000030');
  });

  it('normalizes phone starting with 0', () => {
    expect(buildChannelUrl({
      channel: 'tel', customer: { phone_number: '0911000030' }, message: '',
    })).toBe('tel:+251911000030');
  });

  it('normalizes phone starting with 251 (no +)', () => {
    expect(buildChannelUrl({
      channel: 'tel', customer: { phone_number: '251911000030' }, message: '',
    })).toBe('tel:+251911000030');
  });

  it('normalizes 9-digit phone', () => {
    expect(buildChannelUrl({
      channel: 'tel', customer: { phone_number: '911000030' }, message: '',
    })).toBe('tel:+251911000030');
  });

  it('returns null for unknown channel', () => {
    expect(buildChannelUrl({
      channel: 'unknown', customer: { phone_number: '+2519' }, message: msg,
    })).toBeNull();
  });

  it('returns null for sms when no phone', () => {
    expect(buildChannelUrl({
      channel: 'sms', customer: { telegram_username: 'al' }, message: '',
    })).toBeNull();
  });

    it('returns null when customer is null', () => {
    expect(buildChannelUrl({
      channel: 'tel', customer: null, message: '',
    })).toBeNull();
  });
});

describe('copyMessageToClipboard', () => {
  const originalNavigator = globalThis.navigator;
  const originalDocument = globalThis.document;

  afterEach(() => {
    if (originalNavigator !== undefined) {
      Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true, writable: true });
    }
    if (originalDocument !== undefined) {
      Object.defineProperty(globalThis, 'document', { value: originalDocument, configurable: true, writable: true });
    }
  });

  it('uses navigator.clipboard.writeText when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } }, configurable: true, writable: true,
    });
    const result = await copyMessageToClipboard('hello world');
    expect(writeText).toHaveBeenCalledWith('hello world');
    expect(result).toBe(true);
  });

  it('falls back to document.execCommand when clipboard API throws', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard error'));
    const execCommand = vi.fn().mockReturnValue(true);
    const mockTextArea = { value: '', style: {}, select: vi.fn() };
    const appendSpy = vi.fn();
    const removeSpy = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } }, configurable: true, writable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: vi.fn(() => mockTextArea),
        execCommand,
        body: { appendChild: appendSpy, removeChild: removeSpy },
      }, configurable: true, writable: true,
    });
    const result = await copyMessageToClipboard('fallback test');
    expect(appendSpy).toHaveBeenCalledWith(mockTextArea);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(removeSpy).toHaveBeenCalledWith(mockTextArea);
    expect(result).toBe(true);
  });

    it('returns false when navigator has no clipboard and execCommand fails', async () => {
    const execCommand = vi.fn().mockReturnValue(false);
    Object.defineProperty(globalThis, 'navigator', {
      value: {}, configurable: true, writable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: vi.fn(() => ({ value: '', style: {}, select: vi.fn() })),
        execCommand,
        body: { appendChild: vi.fn(), removeChild: vi.fn() },
      }, configurable: true, writable: true,
    });
    const result = await copyMessageToClipboard('test');
    expect(result).toBe(false);
  });
});

describe('countCustomersWithBalance', () => {
  it('counts customers with positive balance', () => {
    expect(countCustomersWithBalance([
      { id: 1, balance: 100 },
      { id: 2, balance: 0 },
      { id: 3, balance: 50.5 },
    ])).toBe(2);
  });

  it('returns 0 for empty array', () => {
    expect(countCustomersWithBalance([])).toBe(0);
  });

    it('returns 0 for empty array and undefined', () => {
    expect(countCustomersWithBalance([])).toBe(0);
    expect(countCustomersWithBalance(undefined)).toBe(0);
  });

  it('does not count zero or negative balance', () => {
    expect(countCustomersWithBalance([{ balance: 0 }])).toBe(0);
    expect(countCustomersWithBalance([{ balance: -50 }])).toBe(0);
  });
});

describe('daysAgoLabel', () => {
  const realNow = Date.now;

  afterEach(() => {
    Date.now = realNow;
  });

  it('returns null for falsy timestamps', () => {
    expect(daysAgoLabel(null, 'en')).toBeNull();
    expect(daysAgoLabel(0, 'en')).toBeNull();
    expect(daysAgoLabel(undefined, 'en')).toBeNull();
  });

  it('returns "today" for same-day (English)', () => {
    const now = realNow();
    Date.now = () => now;
    expect(daysAgoLabel(now - 1000 * 60 * 30, 'en')).toBe('today');
  });

  it('returns "ዛሬ" for same-day (Amharic)', () => {
    const now = realNow();
    Date.now = () => now;
    expect(daysAgoLabel(now - 1000 * 60 * 30, 'am')).toBe('ዛሬ');
  });

  it('returns "1d ago" for one day ago (English)', () => {
    const now = realNow();
    Date.now = () => now;
    expect(daysAgoLabel(now - 1000 * 60 * 60 * 24 * 1.5, 'en')).toBe('1d ago');
  });

  it('returns "ከ1 ቀን በፊት" for one day ago (Amharic)', () => {
    const now = realNow();
    Date.now = () => now;
    expect(daysAgoLabel(now - 1000 * 60 * 60 * 24 * 1.5, 'am')).toBe('ከ1 ቀን በፊት');
  });

  it('returns "5d ago" for multiple days (English)', () => {
    const now = realNow();
    Date.now = () => now;
    expect(daysAgoLabel(now - 1000 * 60 * 60 * 24 * 5.5, 'en')).toBe('5d ago');
  });

  it('returns "ከ5 ቀን በፊት" for multiple days (Amharic)', () => {
    const now = realNow();
    Date.now = () => now;
    expect(daysAgoLabel(now - 1000 * 60 * 60 * 24 * 5.5, 'am')).toBe('ከ5 ቀን በፊት');
  });
});
