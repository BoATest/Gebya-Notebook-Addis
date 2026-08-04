/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (must use vi.hoisted so they're available in hoisted vi.mock factories) ───

const { mockDb, mockFetch, mockGetOrCreateCloudProofDeviceId, mockUseSyncStore } = vi.hoisted(() => {
  function makeTable() {
    const hookCallbacks = { creating: null, updating: null };
    const table = {
      where: vi.fn().mockReturnThis(),
      above: vi.fn().mockReturnThis(),
      count: vi.fn().mockResolvedValue(0),
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      and: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(undefined),
      hook: vi.fn((event, cb) => {
        hookCallbacks[event] = cb;
        return { unsubscribe: vi.fn() };
      }),
    };
    return table;
  }

  const mockDb = {
    settings: makeTable(),
    transactions: makeTable(),
    customers: makeTable(),
    customer_transactions: makeTable(),
    catalog_entries: makeTable(),
    suppliers: makeTable(),
    supplier_transactions: makeTable(),
    staff_members: makeTable(),
    settlements: makeTable(),
    analytics: makeTable(),
    transaction: vi.fn((_, ...tables) => {
      const cb = tables[tables.length - 1];
      return cb();
    }),
  };

  const mockFetch = vi.fn();
  const mockGetOrCreateCloudProofDeviceId = vi.fn().mockResolvedValue('test-device-001');
  const mockUseSyncStore = {
    getState: vi.fn(() => ({
      setSyncState: vi.fn(),
      setConflictWarning: vi.fn(),
      setConflictDetails: vi.fn(),
      setLastConflicts: vi.fn(),
    })),
  };

  return { mockDb, mockFetch, mockGetOrCreateCloudProofDeviceId, mockUseSyncStore };
});

vi.mock('../src/db.js', () => ({ default: mockDb, db: mockDb }));
vi.mock('../src/utils/cloudProof.js', () => ({ getOrCreateCloudProofDeviceId: mockGetOrCreateCloudProofDeviceId }));
vi.mock('../src/stores/syncStore.js', () => ({ useSyncStore: mockUseSyncStore }));

// ─── Import after mocks ───

import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  getSyncEngine,
  destroySyncEngine,
} from '../src/utils/syncEngine.js';

// ─── Tests ───

describe('JWT helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAuthToken returns token from db', async () => {
    mockDb.settings.get.mockResolvedValue({ key: 'gebya_auth_token', value: 'my-jwt' });
    const token = await getAuthToken();
    expect(token).toBe('my-jwt');
    expect(mockDb.settings.get).toHaveBeenCalledWith('gebya_auth_token');
  });

  it('getAuthToken returns null when no token stored', async () => {
    mockDb.settings.get.mockResolvedValue(undefined);
    const token = await getAuthToken();
    expect(token).toBeNull();
  });

  it('setAuthToken stores token in db', async () => {
    await setAuthToken('new-token');
    expect(mockDb.settings.put).toHaveBeenCalledWith({ key: 'gebya_auth_token', value: 'new-token' });
  });

  it('clearAuthToken deletes token from db', async () => {
    await clearAuthToken();
    expect(mockDb.settings.delete).toHaveBeenCalledWith('gebya_auth_token');
  });
});

describe('SyncEngine init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    destroySyncEngine();
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: { visibilityState: 'visible' }, writable: true, configurable: true });
    if (!globalThis.window) {
      globalThis.window = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    }
    vi.useFakeTimers();
  });

  afterEach(() => {
    destroySyncEngine();
    vi.useRealTimers();
  });

  it('creates singleton via initSyncEngine', async () => {
    const { initSyncEngine } = await import('../src/utils/syncEngine.js');
    const e = await initSyncEngine();
    expect(e).toBeDefined();
    expect(e.deviceId).toBe('test-device-001');
    expect(getSyncEngine()).toBe(e);
  });

  it('returns same instance on second call', async () => {
    const { initSyncEngine } = await import('../src/utils/syncEngine.js');
    const e1 = await initSyncEngine();
    const e2 = await initSyncEngine();
    expect(e1).toBe(e2);
  });

  it('destroySyncEngine cleans up', async () => {
    const { initSyncEngine } = await import('../src/utils/syncEngine.js');
    await initSyncEngine();
    destroySyncEngine();
    expect(getSyncEngine()).toBeNull();
  });
});

describe('SyncEngine.sync', () => {
  let engine;

  beforeEach(async () => {
    vi.clearAllMocks();
    destroySyncEngine();
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: { visibilityState: 'visible' }, writable: true, configurable: true });
    if (!globalThis.window) {
      globalThis.window = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    }
    globalThis.fetch = mockFetch;
    mockDb.settings.get.mockImplementation((key) => {
      if (key === 'gebya_auth_token') return Promise.resolve({ value: 'test-token' });
      return Promise.resolve(undefined);
    });

    const { initSyncEngine } = await import('../src/utils/syncEngine.js');
    engine = await initSyncEngine();
  });

  afterEach(() => {
    destroySyncEngine();
    delete globalThis.fetch;
  });

  it('sets unauthenticated status when no token', async () => {
    destroySyncEngine();
    mockDb.settings.get.mockResolvedValue(undefined);
    const { initSyncEngine } = await import('../src/utils/syncEngine.js');
    engine = await initSyncEngine();
    await engine.sync();
    expect(engine.status).toBe('unauthenticated');
  }, 10000);

  it('sets syncing status during sync', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, tables: {}, hasMore: false }),
    });

    const statusChanges = [];
    engine.onChange((state) => statusChanges.push(state.status));

    await engine.sync();
    expect(statusChanges).toContain('syncing');
    expect(statusChanges).toContain('idle');
  }, 10000);

  it('handles 401 error by clearing auth', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await engine.sync();
    expect(engine.status).toBe('unauthenticated');
  }, 10000);

  it('handles network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await engine.sync();
    expect(engine.status).toBe('error');
    expect(engine.error).toBe('Network error');
  }, 15000);

  it('skips sync when already syncing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, tables: {}, hasMore: false }),
    });

    engine.status = 'syncing';
    await engine.sync();
    expect(mockFetch).not.toHaveBeenCalled();
  }, 10000);

  it('skips sync when offline', async () => {
    engine.online = false;
    await engine.sync();
    expect(mockFetch).not.toHaveBeenCalled();
  }, 10000);
});

describe('SyncEngine._schedulePush', () => {
  let engine;

  beforeEach(async () => {
    vi.clearAllMocks();
    destroySyncEngine();
    vi.useFakeTimers();
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: { visibilityState: 'visible' }, writable: true, configurable: true });
    if (!globalThis.window) {
      globalThis.window = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    }
    globalThis.fetch = mockFetch;
    mockDb.settings.get.mockImplementation((key) => {
      if (key === 'gebya_auth_token') return Promise.resolve({ value: 'test-token' });
      return Promise.resolve(undefined);
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, tables: {}, hasMore: false }),
    });

    const { initSyncEngine } = await import('../src/utils/syncEngine.js');
    engine = await initSyncEngine();
  });

  afterEach(() => {
    destroySyncEngine();
    vi.useRealTimers();
    delete globalThis.fetch;
  });

  it('increments pending count', () => {
    engine._pulling = false;
    engine._schedulePush('transactions', 'create', {});
    expect(engine.pendingCount).toBe(1);
  });

  it('does not schedule push when pulling', () => {
    engine._pulling = true;
    engine._schedulePush('transactions', 'create', {});
    expect(engine.pendingCount).toBe(0);
  });

  it('debounces multiple pushes', () => {
    engine._pulling = false;
    engine._schedulePush('transactions', 'create', {});
    engine._schedulePush('customers', 'create', {});
    expect(engine.pendingCount).toBe(2);
    expect(engine._pushDebounce).toBeDefined();
  });
});

describe('SyncEngine.fullSync', () => {
  let engine;

  beforeEach(async () => {
    vi.clearAllMocks();
    destroySyncEngine();
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: { visibilityState: 'visible' }, writable: true, configurable: true });
    if (!globalThis.window) {
      globalThis.window = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    }
    globalThis.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, tables: {}, hasMore: false }),
    });
    mockDb.settings.get.mockImplementation((key) => {
      if (key === 'gebya_auth_token') return Promise.resolve({ value: 'test-token' });
      return Promise.resolve(undefined);
    });

    const { initSyncEngine } = await import('../src/utils/syncEngine.js');
    engine = await initSyncEngine();
  });

  afterEach(() => {
    destroySyncEngine();
    delete globalThis.fetch;
  });

  it('resets lastSyncAt to 0 before pulling', async () => {
    engine.lastSyncAt = 1000;
    await engine.fullSync();
    expect(engine.lastSyncAt).toBeGreaterThan(0);
  }, 10000);

  it('restores state on error', async () => {
    engine.lastSyncAt = 5000;
    engine.tableLastSync = { transactions: 1000 };
    mockFetch.mockRejectedValue(new Error('Network error'));

    await engine.fullSync();
    expect(engine.lastSyncAt).toBe(5000);
    expect(engine.tableLastSync).toEqual({ transactions: 1000 });
    expect(engine.status).toBe('error');
  }, 15000);

  it('sets unauthenticated on 401', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await engine.fullSync();
    expect(engine.status).toBe('unauthenticated');
  }, 10000);
});

describe('SyncEngine._pullAll', () => {
  let engine;

  beforeEach(async () => {
    vi.clearAllMocks();
    destroySyncEngine();
    vi.useFakeTimers();
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: { visibilityState: 'visible' }, writable: true, configurable: true });
    if (!globalThis.window) {
      globalThis.window = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    }
    globalThis.fetch = mockFetch;
    mockDb.settings.get.mockImplementation((key) => {
      if (key === 'gebya_auth_token') return Promise.resolve({ value: 'test-token' });
      return Promise.resolve(undefined);
    });

    const { initSyncEngine } = await import('../src/utils/syncEngine.js');
    engine = await initSyncEngine();
  });

  afterEach(() => {
    destroySyncEngine();
    vi.useRealTimers();
    delete globalThis.fetch;
  });

  it('sets _pulling flag during pull', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, tables: {}, hasMore: false }),
    });

    await engine._pullAll('test-token');
    expect(engine._pulling).toBe(false);
  });

  it('handles empty response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tables: null }),
    });

    await engine._pullAll('test-token');
    expect(engine.status).not.toBe('error');
  });

  it('handles pagination', async () => {
    let callCount = 0;
    mockFetch.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            tables: { transactions: [{ id: 1, localId: 1, updatedAt: 100 }] },
            hasMore: true,
            nextCursor: 100,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ tables: {}, hasMore: false }),
      });
    });

    await engine._pullAll('test-token');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('SyncEngine._pushAll', () => {
  let engine;

  beforeEach(async () => {
    vi.clearAllMocks();
    destroySyncEngine();
    vi.useFakeTimers();
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: { visibilityState: 'visible' }, writable: true, configurable: true });
    if (!globalThis.window) {
      globalThis.window = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    }
    globalThis.fetch = mockFetch;
    mockDb.settings.get.mockImplementation((key) => {
      if (key === 'gebya_auth_token') return Promise.resolve({ value: 'test-token' });
      return Promise.resolve(undefined);
    });

    const { initSyncEngine } = await import('../src/utils/syncEngine.js');
    engine = await initSyncEngine();
  });

  afterEach(() => {
    destroySyncEngine();
    vi.useRealTimers();
    delete globalThis.fetch;
  });

  it('skips push when no data', async () => {
    await engine._pushAll('test-token');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends push with correct headers', async () => {
    mockDb.transactions.toArray.mockResolvedValue([{ id: 1, updated_at: 2000 }]);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, business_id: 1 }),
    });

    engine.businessId = 1;
    await engine._pushAll('test-token');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/sync/push'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
          'x-business-id': '1',
        }),
      })
    );
  });

  it('handles 403 permission error', async () => {
    vi.useFakeTimers();
    mockDb.transactions.toArray.mockResolvedValue([{ id: 1, updated_at: 2000 }]);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ missing_permission: 'can_add_records' }),
    });

    const promise = engine._pushAll('test-token');
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(1000 * Math.pow(2, i));
    }
    await expect(promise).rejects.toThrow(/403/);
    vi.useRealTimers();
  }, 30000);

  it('stores business_id from response', async () => {
    mockDb.transactions.toArray.mockResolvedValue([{ id: 1, updated_at: 2000 }]);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, business_id: 42 }),
    });

    await engine._pushAll('test-token');
    expect(engine.businessId).toBe(42);
  });
});

describe('SyncEngine.onChange', () => {
  let engine;

  beforeEach(async () => {
    vi.clearAllMocks();
    destroySyncEngine();
    vi.useFakeTimers();
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: { visibilityState: 'visible' }, writable: true, configurable: true });
    if (!globalThis.window) {
      globalThis.window = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    }
    mockDb.settings.get.mockResolvedValue(undefined);

    const { initSyncEngine } = await import('../src/utils/syncEngine.js');
    engine = await initSyncEngine();
  });

  afterEach(() => {
    destroySyncEngine();
    vi.useRealTimers();
  });

  it('calls listener immediately with current state', () => {
    const cb = vi.fn();
    engine.onChange(cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ status: 'idle' }));
  });

  it('returns unsubscribe function', () => {
    const cb = vi.fn();
    const unsub = engine.onChange(cb);
    unsub();
    engine._notify();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe('SyncEngine._countPending', () => {
  let engine;

  beforeEach(async () => {
    vi.clearAllMocks();
    destroySyncEngine();
    vi.useFakeTimers();
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'document', { value: { visibilityState: 'visible' }, writable: true, configurable: true });
    if (!globalThis.window) {
      globalThis.window = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    }
    mockDb.settings.get.mockResolvedValue(undefined);

    const { initSyncEngine } = await import('../src/utils/syncEngine.js');
    engine = await initSyncEngine();
  });

  afterEach(() => {
    destroySyncEngine();
    vi.useRealTimers();
  });

  it('counts records from all tables', async () => {
    mockDb.transactions.count.mockResolvedValue(3);
    mockDb.customers.count.mockResolvedValue(2);
    await engine._countPending();
    expect(engine.pendingCount).toBe(5);
  });

  it('resets count to zero when no pending', async () => {
    engine.pendingCount = 10;
    Object.values(mockDb).forEach((t) => {
      if (t && typeof t === 'object' && t.count) t.count.mockReset();
      if (t && typeof t === 'object' && t.toArray) t.toArray.mockReset();
    });
    Object.values(mockDb).forEach((t) => {
      if (t && typeof t === 'object' && t.count) t.count.mockResolvedValue(0);
      if (t && typeof t === 'object' && t.toArray) t.toArray.mockResolvedValue([]);
    });
    await engine._countPending();
    expect(engine.pendingCount).toBe(0);
  });
});
