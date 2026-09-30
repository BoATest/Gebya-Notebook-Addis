/**
 * @vitest-environment node
 *
 * Guard tests for the POST /api/shops account-takeover fix (business-legacy.ts).
 *
 * The fix under test: an unauthenticated request whose phone already belongs to a
 * registered user must receive 409 + NO token; a brand-new phone must still get the
 * normal signup flow (201 + token).
 *
 * NOTE: business-legacy.ts throws at module load if JWT_SECRET or
 * JOIN_CODE_SIGNING_KEY is unset — both are provided by src/routes/__tests__/setup-env.ts
 * (vitest setupFiles). If setup-env.ts does not yet set JOIN_CODE_SIGNING_KEY, add:
 *     process.env.JOIN_CODE_SIGNING_KEY = process.env.JWT_SECRET;
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const h = vi.hoisted(() => {
  const selectQueue: unknown[][] = [];
  const insertQueue: unknown[][] = [];
  const chainable = (rows: unknown[]) => {
    const p: any = Promise.resolve(rows);
    p.from = () => p;
    p.where = () => p;
    p.limit = () => p;
    p.values = () => p;
    p.returning = () => p;
    return p;
  };
  const mockDbSelect = vi.fn(() => chainable(selectQueue.shift() ?? []));
  const mockDbInsert = vi.fn(() => chainable(insertQueue.shift() ?? [{}]));
  return { selectQueue, insertQueue, mockDbSelect, mockDbInsert };
});

vi.mock("@workspace/db", () => ({
  db: undefined,
  requireDb: () => ({ select: h.mockDbSelect, insert: h.mockDbInsert }),
}));

vi.mock("@workspace/db/schema", () => ({
  users: { name: "users" },
  devices: { name: "devices" },
  otps: { name: "otps" },
  businesses: { name: "businesses" },
  businessMembers: { name: "businessMembers" },
  invites: { name: "invites" },
  normalizePhone: (p?: string) => p ?? null,
}));

vi.mock("@workspace/db/schema/permission-defaults", () => ({
  resolvePermissions: () => ({ mock: true }),
}));

vi.mock("drizzle-orm", () => ({
  eq: (..._a: unknown[]) => ({}),
  and: (..._a: unknown[]) => ({}),
  gt: (..._a: unknown[]) => ({}),
  isNull: (..._a: unknown[]) => ({}),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: () => "test-signed-jwt",
  },
}));

vi.mock("../auth.js", () => ({
  verifyJwt: () => null,
}));

vi.mock("../services/telegramBotService.js", () => ({
  sendTelegramTextMessage: vi.fn(),
}));

import router from "../business-legacy.js";

function getShopsPostHandler(): (req: Request, res: Response) => Promise<void> {
  for (const layer of (router as any).stack) {
    if (layer.route && layer.route.path === "/shops" && layer.route.methods?.post) {
      return layer.route.stack[0].handle;
    }
  }
  throw new Error("POST /shops handler not found in business-legacy router");
}

function makeReq(body: unknown): Request {
  // No Authorization header → getUserIdFromRequest returns null (unauthenticated).
  return { headers: {}, body } as unknown as Request;
}

function makeRes(): Response & { body?: unknown; statusCode: number } {
  const res: any = {};
  res.statusCode = 0;
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}

describe("POST /api/shops account-takeover guard", () => {
  beforeEach(() => {
    h.selectQueue.length = 0;
    h.insertQueue.length = 0;
    vi.clearAllMocks();
  });

  it("an unauthenticated request with an EXISTING user's phone receives 409 and NO token", async () => {
    // First select in the route = findUserIdByPhone lookup → phone already registered.
    h.selectQueue.push([{ id: 7 }]);

    const handler = getShopsPostHandler();
    const res = makeRes();
    await handler(makeReq({ display_name: "Victim Shop", phone: "+251911223344" }), res);

    expect(res.statusCode).toBe(409);
    expect((res.body as any).code).toBe("PHONE_ALREADY_REGISTERED");
    // The takeover-proof assertions: no credential of any kind in the response.
    expect((res.body as any).auth_token).toBeUndefined();
    expect((res.body as any).device_token).toBeUndefined();
    // And nothing was written: no shop, no membership, no invite, no user row.
    expect(h.mockDbInsert).not.toHaveBeenCalled();
  });

  it("an unauthenticated request with a NEW phone still completes signup (201 + token)", async () => {
    h.selectQueue.push([]);                                 // findUserIdByPhone → no match
    h.selectQueue.push([]);                                 // ensureUser lookup → no match
    h.insertQueue.push([{ id: 5 }]);                        // ensureUser insert → new user
    h.insertQueue.push([{ id: 1, name: "Fresh Shop" }]);    // businesses insert
    h.insertQueue.push([{}]);                               // businessMembers insert
    h.insertQueue.push([{}]);                               // invites insert
    h.selectQueue.push([{ phoneNumber: "+251911223344" }]); // response phone lookup

    const handler = getShopsPostHandler();
    const res = makeRes();
    await handler(makeReq({ display_name: "Fresh Shop", phone: "+251911223344" }), res);

    expect(res.statusCode).toBe(201);
    expect((res.body as any).shop_id).toBe(1);
    expect((res.body as any).auth_token).toBe("test-signed-jwt");
    expect(h.mockDbInsert).toHaveBeenCalledTimes(4);
  });
});
