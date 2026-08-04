/**
 * Auth boot safety tests.
 *
 * Verifies that auth.ts throws at module load time if JWT_SECRET is not set,
 * imports successfully when it is set, and exports the expected interface.
 */
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';

// Mock heavy dependencies so dynamic imports resolve quickly
vi.mock('@workspace/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
  users: {},
  devices: {},
  otps: {},
  businesses: {},
  businessMembers: {},
  normalizePhone: vi.fn(),
}));

vi.mock('@workspace/db/schema', () => ({
  users: {},
  devices: {},
  otps: {},
  businesses: {},
  businessMembers: {},
  normalizePhone: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  gt: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
}));

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn(), verify: vi.fn() },
}));

vi.mock('../../services/telegramBotService.js', () => ({
  sendTelegramTextMessage: vi.fn(),
}));

vi.mock('../../services/smsSender.js', () => ({
  sendSms: vi.fn(),
}));

describe('Auth boot: JWT_SECRET required', () => {
  const originalEnv = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalEnv;
    }
    vi.resetModules();
  });

  it('throws at import time if JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET;
    vi.resetModules();

    try {
      await import('../routes/auth.js');
      throw new Error('Expected throw did not happen');
    } catch (err: any) {
      expect(err.message).toMatch(/JWT_SECRET is not set/);
    }
  }, 10000);

  it('throws at import time if JWT_SECRET is empty string', async () => {
    process.env.JWT_SECRET = '';
    vi.resetModules();

    try {
      await import('../routes/auth.js');
      throw new Error('Expected throw did not happen');
    } catch (err: any) {
      expect(err.message).toMatch(/JWT_SECRET is not set/);
    }
  }, 10000);

  it('imports successfully and exports an Express router when JWT_SECRET is set', async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long';
    vi.resetModules();

    const auth = await import('../routes/auth.js');
    expect(auth.default).toBeDefined();
    expect(typeof auth.default).toBe('function');
  }, 10000);

  it('exports verifyJwt as a function', async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long';
    vi.resetModules();

    const { verifyJwt } = await import('../routes/auth.js');
    expect(typeof verifyJwt).toBe('function');
  }, 10000);

  it('exports a default Express router', async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long';
    vi.resetModules();

    const auth = await import('../routes/auth.js');
    expect(auth.default).toBeDefined();
    expect(typeof auth.default).toBe('function');
  }, 10000);
});
