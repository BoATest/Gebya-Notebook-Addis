import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] WARNING: DATABASE_URL is not set. Database operations will fail at runtime.",
  );
}

// Prefer a pooled Neon endpoint (DATABASE_URL_POOLED, e.g. the "-pooler" host or
// a "?pgbouncer=true" connection string) which reuses server-side connections
// and dramatically cuts cold-start connect latency on serverless. Falls back to
// DATABASE_URL when the pooled variant is not configured.
const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX ?? 5),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      allowExitOnIdle: true,
    })
  : null;
export const db = pool ? drizzle(pool, { schema }) : null;

export function requireDb(): NonNullable<typeof db> {
  if (!db) {
    throw new Error("Database not configured");
  }
  return db;
}

// Warm the connection pool at module load (cold start) so the first real query
// does not pay the full TCP/TLS handshake cost. Best-effort; failures are logged
// but non-fatal.
if (pool) {
  pool
    .query("SELECT 1")
    .then(() => console.log("[db] connection pool warmed"))
    .catch((e) => console.warn("[db] pool warmup failed:", e instanceof Error ? e.message : e));
}

// Re-warm the pool on demand (used by the admin warmup cron).
export function warmDb(): Promise<boolean> {
  if (!pool) return Promise.resolve(false);
  return pool
    .query("SELECT 1")
    .then(() => true)
    .catch((e) => {
      console.warn("[db] warmDb failed:", e instanceof Error ? e.message : e);
      return false;
    });
}

export * from "./schema";
export { getCustomerBalances, enrichWithTelegram } from "./utils/customerBalance.js";
export type { CustomerBalanceRow, CustomerWithTelegram } from "./utils/customerBalance.js";
export { customerBalanceExpression } from "./utils/balance.js";
