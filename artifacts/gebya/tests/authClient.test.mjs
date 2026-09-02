/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Lightweight mocks — authClient.js uses fetch + the syncEngine token helpers.
const { mockDb, mockFetch } = vi.hoisted(() => {
  function makeTable() {
    return {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  }
  const mockDb = { settings: makeTable() };
  const mockFetch = vi.fn();
  return { mockDb, mockFetch };
});

vi.mock('../src/db.js', () => ({ default: mockDb, db: mockDb }));
vi.mock('../src/stores/syncStore.js', () => ({
  useSyncStore: { getState: () => ({ setSyncState: vi.fn() }) },
}));

// In the vitest node env there is no global fetch by default; install our
// mock so authClient.js hits it instead of Node's built-in.
beforeEach(() => {
  globalThis.fetch = mockFetch;
});

import { ensureFreshToken, _resetRefreshForTest, authedFetch } from '../src/utils/authClient.js';

describe('ensureFreshToken dedup', () => {
  beforeEach(() => {
    _resetRefreshForTest();
    mockFetch.mockReset();
    mockDb.settings.get.mockReset();
    mockDb.settings.put.mockReset();
    mockDb.settings.get.mockResolvedValue({ value: 'old-jwt' });
    mockDb.settings.put.mockResolvedValue(undefined);
  });

  it('calls /api/auth/refresh once and stores the new token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true, token: 'new-jwt', role: 'owner' }),
    });

    const result = await ensureFreshToken();
    expect(result.token).toBe('new-jwt');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer old-jwt' }),
      })
    );
    // The new token was persisted.
    expect(mockDb.settings.put).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'gebya_auth_token', value: 'new-jwt' })
    );
  });

  it('deduplicates concurrent calls into a single refresh request', async () => {
    let resolveRefresh;
    const inFlight = new Promise((r) => { resolveRefresh = r; });
    mockFetch.mockReturnValueOnce(inFlight);

    // Let the first ensureFreshToken() body reach its fetch() call before
    // we issue the second/third concurrent calls.
    const p1 = ensureFreshToken();
    await new Promise((r) => setImmediate(r));
    const p2 = ensureFreshToken();
    const p3 = ensureFreshToken();

    // Only one in-flight refresh, even though three callers arrived.
    expect(mockFetch).toHaveBeenCalledTimes(1);

    resolveRefresh({ ok: true, json: () => Promise.resolve({ ok: true, token: 'shared-jwt' }) });
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1.token).toBe('shared-jwt');
    expect(r2.token).toBe('shared-jwt');
    expect(r3.token).toBe('shared-jwt');
    // Still only one fetch.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects with status-tagged error on a non-2xx response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'token_revoked' }),
    });

    await expect(ensureFreshToken()).rejects.toThrow(/refresh_failed_401/);
  });

  it('rejects with a network error on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(ensureFreshToken()).rejects.toThrow(/Failed to fetch/);
  });
});

describe('authedFetch 401 retry', () => {
  beforeEach(() => {
    _resetRefreshForTest();
    mockFetch.mockReset();
    mockDb.settings.get.mockReset();
    mockDb.settings.put.mockReset();
    mockDb.settings.get.mockResolvedValue({ value: 'old-jwt' });
  });

  it('returns the response on a non-401 status without refreshing', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) });
    const res = await authedFetch('http://x.test/api/foo');
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('refreshes once and retries the original request on 401', async () => {
    // First call: 401. Second call (retry): 200.
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });

    // ensureFreshToken's mock: resolves to a new token.
    mockDb.settings.get
      .mockResolvedValueOnce({ value: 'old-jwt' })   // first call: getAuthToken before first fetch
      .mockResolvedValueOnce({ value: 'old-jwt' })   // second: inside ensureFreshToken
      .mockResolvedValueOnce({ value: 'new-jwt' });  // third: getAuthToken for the retry
    mockDb.settings.put.mockResolvedValue(undefined);

    // Provide a valid refresh response (ensureFreshToken's internal fetch call).
    // The authClient ensureFreshToken's own fetch — mock that as a separate call.
    // We need to mock both the authClient's internal refresh fetch and the test's
    // authedFetch target. Easiest: have the first fetch be the authedFetch target
    // (401), the second be the refresh (200), the third be the retry (200).
    // Already arranged above: 1st=401, 2nd=200. But the 2nd is the refresh
    // (its URL contains /auth/refresh), and the 3rd is the retry. The mock
    // returns the same response shape for both. That's fine.
    // Actually, since ensureFreshToken is mocked via the real module here (not
    // a top-level vi.mock), the refresh will hit mockFetch too. The 2nd mockFetch
    // call IS the refresh. Need to make sure the response shape is what
    // ensureFreshToken expects: { ok:true, json:() => Promise.resolve({ok:true, token: 'new-jwt'}) }
    // Adjust: the 2nd mock should be the refresh response.
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) })           // 1st: authedFetch → 401
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, token: 'new-jwt', role: 'owner' }) }) // 2nd: ensureFreshToken's refresh
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: 'retry-success' }) }); // 3rd: authedFetch retry

    const res = await authedFetch('http://x.test/api/foo');
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // The third (retry) call should carry the NEW token.
    const thirdCallHeaders = mockFetch.mock.calls[2][1].headers;
    expect(thirdCallHeaders.Authorization).toBe('Bearer new-jwt');
  });

  it('returns the 401 when ensureFreshToken also fails', async () => {
    // First call (authedFetch) → 401. Second call (ensureFreshToken's refresh)
    // → server is unreachable, so the fetch itself rejects.
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.resolve({}) })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const res = await authedFetch('http://x.test/api/foo');
    // authedFetch returns the original 401 when refresh fails.
    expect(res.status).toBe(401);
    // No retry was attempted.
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
