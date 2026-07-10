/**
 * Auth boot safety tests.
 *
 * Verifies that auth.ts throws at module load time if JWT_SECRET is not set,
 * imports successfully when it is set, and exports the expected interface.
 */
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';

// Mock the database module so auth.ts can import without DATABASE_URL
vi.mock('@workspace/db', () => ({
  db: {},
  users: {},
  devices: {},
  otps: {},
  businesses: {},
  businessMembers: {},
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

    await expect(async () => {
      await import('../routes/auth.js');
    }).rejects.toThrow(/JWT_SECRET is not set/);
  });

  it('throws at import time if JWT_SECRET is empty string', async () => {
    process.env.JWT_SECRET = '';
    vi.resetModules();

    await expect(async () => {
      await import('../routes/auth.js');
    }).rejects.toThrow(/JWT_SECRET is not set/);
  });

  it('imports successfully and exports an Express router when JWT_SECRET is set', async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long';
    vi.resetModules();

    const auth = await import('../routes/auth.js');
    expect(auth.default).toBeDefined();
    expect(typeof auth.default).toBe('function');
  });

  it('exports verifyJwt as a function', async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long';
    vi.resetModules();

    const { verifyJwt } = await import('../routes/auth.js');
    expect(typeof verifyJwt).toBe('function');
  });

  it('exports a default Express router', async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long';
    vi.resetModules();

    const auth = await import('../routes/auth.js');
    expect(auth.default).toBeDefined();
    expect(typeof auth.default).toBe('function');
  });
});
