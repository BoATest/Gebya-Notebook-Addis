/**
 * @vitest-environment node
 */
process.env.JWT_SECRET = "test-secret-for-unit-tests";
process.env.NODE_ENV = "development";

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDbSelect, mockDbInsert, mockDbUpdate, mockDb } = vi.hoisted(() => {
  const mockDbSelect = vi.fn();
  const mockDbInsert = vi.fn();
  const mockDbUpdate = vi.fn();
  const mockDb = {
    select: (...a: any[]) => mockDbSelect(...a),
    insert: (...a: any[]) => mockDbInsert(...a),
    update: (...a: any[]) => mockDbUpdate(...a),
  };
  return { mockDbSelect, mockDbInsert, mockDbUpdate, mockDb };
});

vi.mock("@workspace/db", () => ({ db: mockDb, requireDb: vi.fn(() => mockDb) }));

vi.mock("@workspace/db/schema", () => ({
  users: { id: "id", phoneNumber: "phone_number", active: "active", preferredLang: "preferred_lang", createdAt: "created_at" },
  devices: { deviceId: "device_id", userId: "user_id", name: "name", lastSeenAt: "last_seen_at" },
  otps: { id: "id", phoneNumber: "phone_number", codeHash: "code_hash", otpHash: "otp_hash", attempts: "attempts", maxAttempts: "max_attempts", expiresAt: "expires_at", consumed: "consumed", userId: "user_id", verifiedAt: "verified_at", lockedAt: "locked_at", createdAt: "created_at" },
  businesses: { id: "id", name: "name", plan: "plan" },
  businessMembers: { userId: "user_id", businessId: "business_id", role: "role", permissions: "permissions" },
  normalizePhone: vi.fn((p: string) => (p && p.length >= 8 ? `+251${p.replace(/^0/, "")}` : null)),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  gt: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: vi.fn(() => "mock-jwt-token"), verify: vi.fn(() => ({ userId: 1, type: "access" })) },
}));

vi.mock("../../services/telegramBotService.js", () => ({
  sendTelegramTextMessage: vi.fn(),
}));

vi.mock("../../services/smsSender.js", () => ({
  sendSms: vi.fn(),
}));

import authRouter from "../auth.js";
import { normalizePhone } from "@workspace/db/schema";
import jwt from "jsonwebtoken";
import crypto from "crypto";

function hashOtpForTest(plain: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(plain, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const mockNormalizePhone = normalizePhone as ReturnType<typeof vi.fn>;
const mockJwtSign = jwt.sign as ReturnType<typeof vi.fn>;
const mockJwtVerify = jwt.verify as ReturnType<typeof vi.fn>;

function chainable(rows: any[]) {
  const q: any = {};
  q.from = vi.fn(() => q);
  q.where = vi.fn(() => q);
  q.orderBy = vi.fn(() => q);
  q.limit = vi.fn(() => Promise.resolve(rows));
  q.returning = vi.fn(() => Promise.resolve(rows));
  return q;
}

function findHandler(method: string, path: string) {
  const stack = (authRouter as any).stack;
  const layer = stack.find((l: any) => l.route?.path === path && l.route?.methods?.[method]);
  if (!layer) throw new Error(`${method.toUpperCase()} ${path} not found`);
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle;
}

function makeRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = vi.fn(function (code: number) { res.statusCode = code; return res; });
  res.json = vi.fn(function (payload: any) { res.body = payload; return res; });
  res.cookie = vi.fn();
  res.clearCookie = vi.fn();
  return res;
}

function makeReq(overrides: any = {}) {
  return {
    method: "POST", url: "/otp", body: {}, query: {},
    headers: {}, params: {}, cookies: {}, ...overrides,
  } as any;
}

describe("POST /api/auth/otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbSelect.mockReset();
    mockDbInsert.mockReset();
    mockDbUpdate.mockReset();
    mockNormalizePhone.mockImplementation((p: string) => (p && p.length >= 8 ? `+251${p.replace(/^0/, "")}` : null));
  });

  it("returns 400 when phone_number is missing", async () => {
    const handler = findHandler("post", "/otp");
    const req = makeReq({ body: {} });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/phone_number/);
  });

  it("returns 400 for invalid phone number", async () => {
    mockNormalizePhone.mockReturnValue(null);
    const handler = findHandler("post", "/otp");
    const req = makeReq({ body: { phone_number: "not-a-phone" } });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Invalid/);
  });

  it("returns ok=true with otp in dev mode", async () => {
    mockNormalizePhone.mockReturnValue("+251911111111");
    mockDbSelect.mockReturnValueOnce(chainable([]));
    mockDbInsert.mockReturnValue({ values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([]) });
    const handler = findHandler("post", "/otp");
    const req = makeReq({ body: { phone_number: "0911111111" } });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.phone_number).toBe("+251911111111");
    expect(res.body.otp).toBeDefined();
    expect(res.body.otp).toMatch(/^\d{6}$/);
  });
});

describe("POST /api/auth/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbSelect.mockReset();
    mockDbInsert.mockReset();
    mockDbUpdate.mockReset();
    mockJwtSign.mockReturnValue("mock-jwt-token");
    mockNormalizePhone.mockImplementation((p: string) => (p && p.length >= 8 ? `+251${p.replace(/^0/, "")}` : null));
  });

  it("returns 400 when phone_number is missing", async () => {
    const handler = findHandler("post", "/verify");
    const req = makeReq({ body: { otp: "123456" } });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/phone_number and otp/);
  });

  it("returns 400 when otp is missing", async () => {
    const handler = findHandler("post", "/verify");
    const req = makeReq({ body: { phone_number: "0911111111" } });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/phone_number and otp/);
  });

  it("returns 400 for invalid phone number", async () => {
    mockNormalizePhone.mockReturnValue(null);
    const handler = findHandler("post", "/verify");
    const req = makeReq({ body: { phone_number: "123", otp: "123456" } });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Invalid/);
  });

  it("returns 400 when no OTP record found", async () => {
    mockNormalizePhone.mockReturnValue("+251911111111");
    mockDbSelect.mockReturnValueOnce(chainable([]));
    const handler = findHandler("post", "/verify");
    const req = makeReq({ body: { phone_number: "0911111111", otp: "123456" } });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Invalid or expired OTP/);
  });

  it("returns 200 with token for valid OTP", async () => {
    mockNormalizePhone.mockReturnValue("+251911111111");
    const storedHash = hashOtpForTest("123456");
    mockDbSelect
      .mockReturnValueOnce(chainable([{ id: 1, phoneNumber: "+251911111111", codeHash: storedHash, attempts: 0, maxAttempts: 5, expiresAt: new Date(Date.now() + 600000), consumed: false }]))
      .mockReturnValueOnce(chainable([{ id: 1, phoneNumber: "+251911111111", active: true }]))
      .mockReturnValueOnce(chainable([{ businessId: 1, role: "owner", permissions: null }]))
      .mockReturnValueOnce(chainable([{ id: 1, name: "Test Shop", plan: "free" }]));
    mockDbUpdate.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) });
    mockDbInsert.mockReturnValue({ values: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([{ id: 1, phoneNumber: "+251911111111" }]) });
    const handler = findHandler("post", "/verify");
    const req = makeReq({ body: { phone_number: "0911111111", otp: "123456" } });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.token).toBe("mock-jwt-token");
    expect(res.body.user).toBeDefined();
  });
});

describe("POST /api/auth/link-device", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbInsert.mockReset();
    mockJwtVerify.mockReturnValue({ userId: 1, type: "access" });
  });

  it("returns 401 when no token", async () => {
    const handler = findHandler("post", "/link-device");
    const req = makeReq({ headers: {} });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/token/);
  });

  it("returns 400 when device_id is missing", async () => {
    const handler = findHandler("post", "/link-device");
    const req = makeReq({ headers: { authorization: "Bearer valid-token" }, body: {} });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/device_id/);
  });

  it("returns ok=true with device_id for valid request", async () => {
    mockDbInsert.mockReturnValue({ values: vi.fn().mockReturnThis(), onConflictDoUpdate: vi.fn().mockResolvedValue(undefined) });
    const handler = findHandler("post", "/link-device");
    const req = makeReq({ headers: { authorization: "Bearer valid-token" }, body: { device_id: "device-123" } });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.device_id).toBe("device-123");
  });
});

describe("POST /api/auth/logout", () => {
  it("returns ok=true and clears cookie", async () => {
    const handler = findHandler("post", "/logout");
    const req = makeReq({});
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.clearCookie).toHaveBeenCalled();
  });
});

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbSelect.mockReset();
    mockJwtVerify.mockReturnValue({ userId: 1, type: "access" });
  });

  it("returns 401 when no token", async () => {
    const handler = findHandler("get", "/me");
    const req = makeReq({ method: "GET", url: "/me", headers: {}, cookies: {} });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/token/);
  });

  it("returns 404 when user not found", async () => {
    mockDbSelect.mockReturnValueOnce(chainable([]));
    const handler = findHandler("get", "/me");
    const req = makeReq({ method: "GET", url: "/me", headers: { authorization: "Bearer valid-token" } });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/User not found/);
  });

  it("returns user info for valid token", async () => {
    mockDbSelect
      .mockReturnValueOnce(chainable([{ id: 1, phoneNumber: "+251911111111", active: true, preferredLang: "en", createdAt: new Date() }]))
      .mockReturnValueOnce(chainable([{ businessId: 1, role: "owner", permissions: null }]))
      .mockReturnValueOnce(chainable([{ id: 1, name: "Test Shop", plan: "free" }]));
    const handler = findHandler("get", "/me");
    const req = makeReq({ method: "GET", url: "/me", headers: { authorization: "Bearer valid-token" } });
    const res = makeRes();
    await handler(req, res, () => {});
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.phone_number).toBe("+251911111111");
  });
});
