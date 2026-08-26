/**
 * @vitest-environment node
 */
// business-legacy.ts throws at module load if JWT_SECRET is missing.
process.env.JWT_SECRET = "test-secret-for-unit-tests";
process.env.APP_BASE_URL = "http://localhost:3000";

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────
const { mockDbSelect, mockDbUpdate, mockDb } = vi.hoisted(() => {
  const mockDbSelect = vi.fn();
  const mockDbUpdate = vi.fn();
  const mockDb = {
    select: (...a: any[]) => mockDbSelect(...a),
    update: (...a: any[]) => mockDbUpdate(...a),
  };
  return { mockDbSelect, mockDbUpdate, mockDb };
});

vi.mock("@workspace/db", () => ({
  db: mockDb,
  requireDb: vi.fn(() => mockDb),
}));

vi.mock("@workspace/db/schema", () => ({
  users: {},
  devices: {},
  otps: {},
  businesses: {},
  businessMembers: { businessId: "businessId", role: "role", userId: "userId", displayName: "displayName", id: "id", active: "active", permissions: "permissions" },
  invites: {},
  normalizePhone: (p: string) => p,
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  gt: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: vi.fn(), verify: vi.fn() },
}));

vi.mock("../auth.js", () => ({
  verifyJwt: vi.fn().mockReturnValue({ userId: 1 }),
}));

vi.mock("../../services/telegramBotService.js", () => ({
  sendTelegramTextMessage: vi.fn(),
}));

vi.mock("@workspace/db/schema/permission-defaults", () => ({
  resolvePermissions: vi.fn(() => ({})),
}));

// ── Import AFTER mocks ──────────────────────────────────────────────────────
import reactivateRouter from "../business-legacy.js";
import { verifyJwt } from "../auth.js";

const mockVerifyJwt = verifyJwt as ReturnType<typeof vi.fn>;

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeReq(staffId = "2", token = "valid-token") {
  return {
    method: "POST",
    url: `/staff/${staffId}/reactivate`,
    body: {},
    query: {},
    headers: token ? { authorization: `Bearer ${token}` } : {},
    locals: {},
    params: { staff_id: staffId },
  } as any;
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status: vi.fn(function (this: any, code: number) {
      this.statusCode = code;
      return res;
    }),
    json: vi.fn(function (this: any, payload: any) {
      this.body = payload;
    }),
  };
  return res;
}

function chainable(rows: any[]) {
  const q: any = {};
  q.from = vi.fn(() => q);
  q.where = vi.fn(() => q);
  q.limit = vi.fn(() => Promise.resolve(rows));
  return q;
}

function getReactivateHandler() {
  const stack = (reactivateRouter as any).stack;
  const layer = stack.find(
    (l: any) => l.route?.path === "/staff/:staff_id/reactivate" && l.route?.methods?.post
  );
  if (!layer) throw new Error("reactivate route not found on router");
  const route = layer.route;
  return route.stack[0].handle;
}

// ── Tests ───────────────────────────────────────────────────────────────────
describe("POST /staff/:staff_id/reactivate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no bearer token", async () => {
    const handler = getReactivateHandler();
    const req = makeReq("2", "");
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Missing bearer token." });
  });

  it("returns 400 when staff_id is not a number", async () => {
    mockVerifyJwt.mockReturnValue({ userId: 1 });
    const handler = getReactivateHandler();
    const req = makeReq("abc");
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid staff_id" });
  });

  it("returns 403 when caller is not owner or manager", async () => {
    mockVerifyJwt.mockReturnValue({ userId: 3 });
    const memberRows = [{ id: 1, role: "cashier", businessId: 1 }];
    mockDbSelect.mockReturnValueOnce(chainable(memberRows));

    const handler = getReactivateHandler();
    const req = makeReq("2");
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Owner or manager only." });
  });

  it("returns 404 when target staff not found in same business", async () => {
    mockVerifyJwt.mockReturnValue({ userId: 1 });
    // getBusinessForUser returns owner
    mockDbSelect.mockReturnValueOnce(chainable([{ id: 1, role: "owner", businessId: 1 }]));
    // target lookup returns empty
    mockDbSelect.mockReturnValueOnce(chainable([]));

    const handler = getReactivateHandler();
    const req = makeReq("999");
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Staff not found." });
  });

  it("returns 200 and sets active=true when reactivating valid staff", async () => {
    mockVerifyJwt.mockReturnValue({ userId: 1 });
    // getBusinessForUser returns owner
    mockDbSelect.mockReturnValueOnce(chainable([{ id: 1, role: "owner", businessId: 1 }]));
    // target lookup finds staff
    mockDbSelect.mockReturnValueOnce(chainable([{ id: 42 }]));
    // update chain: .update().set().where()
    const whereChain = { where: vi.fn().mockResolvedValue(undefined) };
    const setChain = { set: vi.fn(() => whereChain) };
    mockDbUpdate.mockReturnValueOnce(setChain);

    const handler = getReactivateHandler();
    const req = makeReq("2");
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ reactivated: true });
    expect(mockDbUpdate).toHaveBeenCalled();
    expect(setChain.set).toHaveBeenCalledWith({ active: true });
    expect(whereChain.where).toHaveBeenCalled();
  });
});
