/**
 * @vitest-environment node
 *
 * Money round-trip tests for the numeric(12,2) migration (MIGRATION_PLAN §8
 * precondition, researcher-identified gap: sync.test.ts had zero money fixtures).
 *
 * What these prove:
 *  1. GET /api/sync/pull converts numeric-as-string money fields to rounded JS
 *     numbers server-side (the guard that protects old clients from string
 *     poisoning and the client's strict-type _deepEqual).
 *  2. Rounding is half-away-from-zero at 2dp, mirroring PG ROUND(numeric,2).
 *  3. SYNC_MAINTENANCE=1 makes /api/sync/push return 503 with retry_after.
 */
process.env.JWT_SECRET = "test-jwt-secret-roundtrip";
process.env.APP_BASE_URL = "http://localhost:3000";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockDbSelect, mockDbInsert, mockDbUpdate, mockDbTransaction, mockDb } = vi.hoisted(() => {
  const mockDbSelect = vi.fn();
  const mockDbInsert = vi.fn();
  const mockDbUpdate = vi.fn();
  const mockDbTransaction = vi.fn((fn: any) => fn(mockDb));
  const mockDb = {
    select: (...a: any[]) => mockDbSelect(...a),
    insert: (...a: any[]) => mockDbInsert(...a),
    update: (...a: any[]) => mockDbUpdate(...a),
    transaction: mockDbTransaction,
  };
  return { mockDbSelect, mockDbInsert, mockDbUpdate, mockDbTransaction, mockDb };
});

vi.mock("@workspace/db", () => ({ db: mockDb, requireDb: vi.fn(() => mockDb), customerBalanceExpression: vi.fn() }));

vi.mock("@workspace/db/schema", () => ({
  transactions: { businessId: "businessId", updatedAt: "updatedAt", deviceId: "deviceId", localId: "localId", syncVersion: "syncVersion", id: "id" },
  customers: { businessId: "businessId", updatedAt: "updatedAt", deviceId: "deviceId", localId: "localId", syncVersion: "syncVersion", id: "id", name: "name", displayName: "displayName", telegramChatId: "telegramChatId" },
  customerTransactions: { businessId: "businessId", updatedAt: "updatedAt", deviceId: "deviceId", localId: "localId", syncVersion: "syncVersion", id: "id", customerId: "customer_id", type: "type", amount: "amount" },
  catalogEntries: { businessId: "businessId", updatedAt: "updatedAt", deviceId: "deviceId", localId: "localId", syncVersion: "syncVersion", id: "id" },
  suppliers: { businessId: "businessId", updatedAt: "updatedAt", deviceId: "deviceId", localId: "localId", syncVersion: "syncVersion", id: "id" },
  supplierTransactions: { businessId: "businessId", updatedAt: "updatedAt", deviceId: "deviceId", localId: "localId", syncVersion: "syncVersion", id: "id" },
  staffMembers: { businessId: "businessId", updatedAt: "updatedAt", deviceId: "deviceId", localId: "localId", syncVersion: "syncVersion", id: "id", displayName: "displayName", role: "role" },
  settings: { businessId: "businessId", updatedAt: "updatedAt", deviceId: "deviceId", key: "key", syncVersion: "syncVersion" },
  analytics: { businessId: "businessId", updatedAt: "updatedAt", deviceId: "deviceId", key: "key", syncVersion: "syncVersion" },
  devices: { userId: "userId", deviceId: "deviceId", tokenHash: "tokenHash", staffId: "staffId" },
  businessMembers: { userId: "userId", businessId: "businessId", role: "role", active: "active" },
  auditLog: { id: "id", businessId: "businessId" },
  notifications: { id: "id", businessId: "businessId", ownerUserId: "ownerUserId", type: "type", title: "title", body: "body", entityType: "entityType", entityId: "entityId", actorName: "actorName", read: "read" },
  settlements: { businessId: "businessId", updatedAt: "updatedAt", deviceId: "deviceId", localId: "localId", syncVersion: "syncVersion", id: "id", staffId: "staffId", status: "status" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  gt: vi.fn(() => ({})),
  asc: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
  sql: Object.assign(vi.fn(() => ({})), { raw: vi.fn(() => ({})) }),
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: vi.fn(), verify: vi.fn() },
}));

vi.mock("../auth.js", () => ({
  verifyJwt: vi.fn().mockReturnValue({ userId: 1 }),
}));

vi.mock("../rateLimits.js", () => ({
  syncRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../rbac.js", () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../services/pushNotificationSender.js", () => ({
  sendPushToOwner: vi.fn(),
}));

vi.mock("../services/reminderConfiguration.js", () => ({
  setLastReminderSentAt: vi.fn(),
}));

vi.mock("../services/reminderHistory.js", () => ({
  createHistoryEntry: vi.fn(),
}));

vi.mock("../services/telegramBotService.js", () => ({
  sendTelegramTextMessage: vi.fn(),
}));

import syncRouter from "../sync.js";
import { verifyJwt } from "../auth.js";

const mockVerifyJwt = verifyJwt as ReturnType<typeof vi.fn>;

function chainable(rows: any[]) {
  const q: any = {};
  q.from = vi.fn(() => q);
  q.where = vi.fn(() => q);
  q.orderBy = vi.fn(() => q);
  q.limit = vi.fn(() => Promise.resolve(rows));
  q.returning = vi.fn(() => Promise.resolve(rows));
  q.then = (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject);
  return q;
}

function findHandler(method: string, path: string) {
  const stack = (syncRouter as any).stack;
  const layer = stack.find((l: any) => l.route?.path === path && l.route?.methods?.[method]);
  if (!layer) throw new Error(`${method.toUpperCase()} ${path} not found`);
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle;
}

function makeReq(overrides: any = {}) {
  return {
    method: "GET", url: "/pull", body: {}, query: { since: "1000", limit: "50" },
    headers: { authorization: "Bearer test-token", "x-business-id": "1" },
    params: {}, ...overrides,
  } as any;
}

function makeRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = vi.fn(function (code: number) { res.statusCode = code; return res; });
  res.json = vi.fn(function (payload: any) { res.body = payload; return res; });
  return res;
}

async function callHandler(handler: any, req: any, res: any) {
  const noop = () => {};
  await handler(req, res, noop);
}

/** Queue the 10 pullTable selects in the route's fixed Promise.all order. */
function queuePullTables(order: Array<any[]>) {
  mockDbSelect.mockReturnValueOnce(chainable([{ businessId: 1 }])); // getBusinessForUser
  for (const rows of order) mockDbSelect.mockReturnValueOnce(chainable(rows));
}

describe("money round-trip: GET /api/sync/pull numeric-string normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyJwt.mockReturnValue({ userId: 1 });
    delete process.env.SYNC_MAINTENANCE;
  });
  afterEach(() => {
    delete process.env.SYNC_MAINTENANCE;
  });

  it("converts numeric-as-string money fields to JS numbers (transactions, customer_transactions, settlements)", async () => {
    const txRow = {
      localId: 1, id: 11, updatedAt: 2000, businessId: 1, deviceId: "dev-a", syncVersion: 2,
      type: "sale", amount: "150.50", costPrice: "80.25", profit: "70.25",
      paidAmount: "100.00", remainingAmount: "50.50",
    };
    const custTxRow = {
      localId: 2, id: 12, updatedAt: 2000, businessId: 1, deviceId: "dev-a", syncVersion: 1,
      type: "credit_add", amount: "0.1", customerId: 5,
    };
    const settleRow = {
      localId: 3, id: 13, updatedAt: 2000, businessId: 1, deviceId: "dev-a", syncVersion: 1,
      status: "checked", actualCash: "1500", expectedCash: "1499.99", totalVariance: "0.01",
    };
    queuePullTables([
      [txRow],            // transactions
      [],                 // customers
      [custTxRow],        // customer_transactions
      [],                 // catalog_entries
      [],                 // suppliers
      [],                 // supplier_transactions
      [],                 // staff_members
      [settleRow],        // settlements
      [],                 // settings
      [],                 // analytics
    ]);

    const handler = findHandler("get", "/pull");
    const res = makeRes();
    await callHandler(handler, makeReq(), res);

    expect(res.statusCode).toBe(200);
    const t = res.body.tables;
    expect(typeof t.transactions[0].amount).toBe("number");
    expect(t.transactions[0].amount).toBe(150.5);
    expect(t.transactions[0].costPrice).toBe(80.25);
    expect(t.transactions[0].remainingAmount).toBe(50.5);
    // The 0.1 case — the whole reason the epsilon rule exists.
    expect(t.customer_transactions[0].amount).toBe(0.1);
    expect(typeof t.customer_transactions[0].amount).toBe("number");
    expect(t.settlements[0].expectedCash).toBe(1499.99);
    expect(t.settlements[0].totalVariance).toBe(0.01);
    // No string money values may survive anywhere in the guarded tables.
    for (const row of [...t.transactions, ...t.customer_transactions, ...t.settlements]) {
      for (const [k, v] of Object.entries(row)) {
        if (/amount|cash|price|profit|variance|paid|remaining|cost|transfer|total|forward/i.test(k)) {
          expect([typeof v, k]).not.toContain("string");
        }
      }
    }
  });

  it("rounds half-away-from-zero at 2dp, mirroring PG ROUND(numeric,2)", async () => {
    const txRow = {
      localId: 1, id: 11, updatedAt: 2000, businessId: 1, deviceId: "dev-a", syncVersion: 1,
      type: "sale", amount: "10.155", costPrice: "-2.675", profit: null,
    };
    queuePullTables([[txRow], [], [], [], [], [], [], [], [], []]);

    const handler = findHandler("get", "/pull");
    const res = makeRes();
    await callHandler(handler, makeReq(), res);

    const row = res.body.tables.transactions[0];
    expect(row.amount).toBe(10.16);          // "10.155" → 10.16 (half away from zero)
    expect(row.costPrice).toBe(-2.68);       // symmetric for negatives
    expect(row.profit).toBeNull();           // null stays null (no invented 0)
  });

  it("neutralizes garbage money values to 0 but leaves non-money fields untouched", async () => {
    const txRow = {
      localId: 1, id: 11, updatedAt: 2000, businessId: 1, deviceId: "dev-a", syncVersion: 1,
      type: "sale", amount: "not-a-number", itemName: "1.5 kg sugar", quantity: 2,
    };
    queuePullTables([[txRow], [], [], [], [], [], [], [], [], []]);

    const handler = findHandler("get", "/pull");
    const res = makeRes();
    await callHandler(handler, makeReq(), res);

    const row = res.body.tables.transactions[0];
    expect(row.amount).toBe(0);
    expect(row.itemName).toBe("1.5 kg sugar"); // non-money string field untouched
    expect(row.quantity).toBe(2);
  });
});

describe("SYNC_MAINTENANCE gate: POST /api/sync/push returns 503", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyJwt.mockReturnValue({ userId: 1 });
  });
  afterEach(() => {
    delete process.env.SYNC_MAINTENANCE;
  });

  function pushReq() {
    return {
      method: "POST", url: "/push", query: {},
      headers: { authorization: "Bearer test-token", "x-business-id": "1" },
      body: { device_id: "test-device-1", tables: {} },
      params: {},
    } as any;
  }

  it("blocks push with 503 + retry_after when SYNC_MAINTENANCE=1 (before any DB access)", async () => {
    process.env.SYNC_MAINTENANCE = "1";
    const handler = findHandler("post", "/push");
    const res = makeRes();
    await callHandler(handler, pushReq(), res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: "maintenance", retry_after: 60 });
    // Gate must fire BEFORE any DB round-trip: no select may have been consumed.
    expect(mockDbSelect).not.toHaveBeenCalled();
  });

  it("lets push through normally when SYNC_MAINTENANCE is unset", async () => {
    const handler = findHandler("post", "/push");
    mockDbSelect.mockReturnValueOnce(chainable([{ userId: 1, tokenHash: "hash", staffId: null }])); // device lookup
    mockDbUpdate.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) });
    mockDbSelect.mockReturnValueOnce(chainable([{ businessId: 1 }])); // getBusinessForUser
    const res = makeRes();
    await callHandler(handler, pushReq(), res);
    expect(res.body.ok).toBe(true);
    expect(res.statusCode).toBe(200);
  });
});
