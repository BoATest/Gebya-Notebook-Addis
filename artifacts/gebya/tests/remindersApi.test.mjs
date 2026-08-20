/**
 * Unit tests for api/reminders.js — frontend API client for reminders.
 * Mocks fetch + getAuthToken; no real network or IndexedDB needed.
 *
 * Run: pnpm vitest run tests/remindersApi.test.mjs
 */
/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/utils/syncEngine.js', () => ({
  getAuthToken: vi.fn().mockResolvedValue('mock-jwt-token'),
}));

vi.stubEnv('VITE_API_BASE', 'http://localhost:3000');

const { remindersApi } = await import('../src/api/reminders.js');

describe('remindersApi.sendManualReminder', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete globalThis.fetch;
  });

  it('POSTs to /telegram/reminders/remind/{customerId} with correct body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });

    await remindersApi.sendManualReminder('shop-1', 'cust-42', {
      balance: 500, dueDate: '2026-01-01', language: 'en',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/telegram/reminders/remind/cust-42');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
    const body = JSON.parse(options.body);
    expect(body).toEqual({ shopId: 'shop-1', balance: 500, dueDate: '2026-01-01', language: 'en' });
  });

  it('includes Bearer auth token in headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });

    await remindersApi.sendManualReminder('shop-1', 'cust-42', {
      balance: 500, dueDate: null, language: 'en',
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer mock-jwt-token');
  });

  it('throws on HTTP error with status and error message', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 403,
      text: () => Promise.resolve(JSON.stringify({ error: 'Forbidden' })),
    });

    await expect(remindersApi.sendManualReminder('shop-1', 'cust-42', {
      balance: 500, dueDate: null, language: 'en',
    })).rejects.toThrow('Forbidden');
  });

  it('throws with HTTP status when no error message in body', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 500,
      text: () => Promise.resolve(JSON.stringify({})),
    });

    try {
      await remindersApi.sendManualReminder('shop-1', 'cust-42', {
        balance: 0, dueDate: null, language: 'en',
      });
      expect.fail('Should have thrown');
        }
  });
});

describe('remindersApi.getHistory', () => {
  let mockFetch;
  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true, text: () => Promise.resolve(JSON.stringify({ entries: [], total: 0 })),
    });
    globalThis.fetch = mockFetch;
  });
  afterEach(() => { delete globalThis.fetch; });

  it('GETs history with shopId, limit, offset query params', async () => {
    await remindersApi.getHistory({ shopId: 's1', limit: 20, offset: 0 });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/telegram/reminders/history');
    expect(url).toContain('shopId=s1');
    expect(url).toContain('limit=20');
    expect(url).toContain('offset=0');
  });

  it('includes customerId in query when provided', async () => {
    await remindersApi.getHistory({ shopId: 's1', customerId: 'c-5' });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('customerId=c-5');
  });

  it('includes fromDate and toDate when provided', async () => {
    await remindersApi.getHistory({ shopId: 's1', fromDate: '2026-01-01', toDate: '2026-12-31' });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('fromDate=2026-01-01');
    expect(url).toContain('toDate=2026-12-31');
  });

  it('defaults limit to 20 and offset to 0', async () => {
    await remindersApi.getHistory({ shopId: 's1' });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('limit=20');
    expect(url).toContain('offset=0');
  });

  it('returns parsed JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, text: () => Promise.resolve(JSON.stringify({ entries: [{ id: 1, status: 'sent' }], total: 1 })),
    });
    const result = await remindersApi.getHistory({ shopId: 's1' });
    expect(result.entries).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

describe('remindersApi.getShopDefault', () => {
  it('GETs shop default config', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, text: () => Promise.resolve(JSON.stringify({ frequency: 'daily' })),
    });
    const result = await remindersApi.getShopDefault('shop-1');
    const [url] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('/telegram/reminders/config');
    expect(url).toContain('shopId=shop-1');
    expect(result).toEqual({ frequency: 'daily' });
  });
});

describe('remindersApi.setShopDefault', () => {
  it('POSTs to config endpoint with shopId and frequency', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });
    await remindersApi.setShopDefault('shop-1', 'daily');
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/telegram/reminders/config');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ shopId: 'shop-1', frequency: 'daily' });
  });
});

describe('remindersApi.pauseReminders', () => {
  it('POSTs to pause endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });
    await remindersApi.pauseReminders('shop-1');
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/telegram/reminders/pause');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ shopId: 'shop-1' });
  });
});

describe('remindersApi.resumeReminders', () => {
  it('POSTs to resume endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });
    await remindersApi.resumeReminders('shop-1');
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/telegram/reminders/resume');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ shopId: 'shop-1' });
  });
});
