// Two-tier admin cache.
//
// L1: in-memory TTL cache with stale-while-revalidate, per serverless instance.
//     Makes the second request on a warm instance instant.
// L2: a Postgres `admin_cache` table (created by bootstrap). Survives cold
//     starts and is shared across all function instances, so a value computed
//     by the warmup cron (or any instance) is served instantly everywhere.
//
// If the DB is unavailable, L2 is skipped and L1 alone is used — the dashboard
// still works, just without cross-instance persistence.
//
// NOTE: this cache lives in the function instance's memory, so it does not
// survive cold starts or span instances. For cross-instance persistence use
// Upstash Redis (swap the store below). A cron warmup keeps it populated.
type Entry = { value: unknown; expiresAt: number; refreshing: boolean };

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const store = new Map<string, Entry>();
const refreshing = new Set<string>();
const TTL_MS = Number(process.env.ADMIN_CACHE_TTL_MS || 60_000);
const now = () => Date.now();

// ─── L2 (Postgres) ─────────────────────────────────────────────────────────
async function l2Get(key: string): Promise<{ value: unknown; expiresAt: number } | null> {
  if (!db) return null;
  try {
    const res: any = await db.execute(
      sql`SELECT value, expires_at FROM admin_cache WHERE key = ${key}`,
    );
    const rows = res?.rows ?? [];
    if (!rows.length) return null;
    const expiresAt = Number(rows[0].expires_at);
    if (!Number.isFinite(expiresAt)) return null;
    return { value: rows[0].value, expiresAt };
  } catch (e) {
    console.error("[adminCache] l2 get failed", key, e);
    return null;
  }
}

async function l2Set(key: string, value: unknown, expiresAt: number): Promise<void> {
  if (!db) return;
  try {
    await db.execute(sql`
      INSERT INTO admin_cache (key, value, expires_at)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${expiresAt})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at
    `);
  } catch (e) {
    console.error("[adminCache] l2 set failed", key, e);
  }
}

async function l2Delete(key: string): Promise<void> {
  if (!db) return;
  try {
    await db.execute(sql`DELETE FROM admin_cache WHERE key = ${key}`);
  } catch {
    /* non-fatal */
  }
}

function cacheSet(key: string, value: unknown): void {
  const expiresAt = now() + TTL_MS;
  store.set(key, { value, expiresAt, refreshing: false });
  void l2Set(key, value, expiresAt);
}

// Hydrate L1 from L2 when we have no in-memory entry (e.g. cold start on a
// fresh instance that the warmup cron already populated).
async function hydrate(key: string): Promise<Entry | undefined> {
  if (store.has(key)) return store.get(key);
  const h = await l2Get(key);
  if (h && h.expiresAt > now()) {
    const entry: Entry = { value: h.value, expiresAt: h.expiresAt, refreshing: false };
    store.set(key, entry);
    return entry;
  }
  if (h) void l2Delete(key);
  return undefined;
}

export async function warmCache(key: string, compute: () => Promise<unknown>): Promise<boolean> {
  try {
    const v = await compute();
    cacheSet(key, v);
    return true;
  } catch (e) {
    console.error("[adminCache] warm failed", key, e);
    return false;
  }
}

/**
 * Bounded variant for cold-start safety.
 *
 * On a fresh serverless instance the in-memory cache is empty, so a naive
 * `serveCached` would block the request while the full (expensive) dashboard
 * query runs — and on a cold DB connection that can exceed the platform's
 * function timeout, producing the "server took too long" error the client sees.
 *
 * This variant races the compute against `timeoutMs`. Outcomes:
 *   - fresh   → valid cache hit (L1 or L2), return immediately.
 *   - stale   → return the stale value now, refresh in the background.
 *   - warming → the expensive compute is already in flight (started by this or
 *               a concurrent request); return `{ status: "warming" }` WITHOUT
 *               waiting. The background compute keeps running and will populate
 *               the cache, so the next retry hits a warm entry.
 *   - timeout → compute did not finish within `timeoutMs`; return "warming" and
 *               let the still-running compute populate the cache in the
 *               background (a subsequent retry then succeeds).
 *
 * The caller should respond 503 "warming up" on "warming" so the client knows
 * to retry shortly.
 */
export async function serveCachedBounded<T>(
  key: string,
  compute: () => Promise<T>,
  timeoutMs = 20_000,
): Promise<{ value: T | undefined; status: "fresh" | "stale" | "warming" }> {
  const hit = await hydrate(key);
  if (hit && hit.expiresAt > now()) return { value: hit.value as T, status: "fresh" };
  if (hit && hit.expiresAt <= now() && !hit.refreshing) {
    hit.refreshing = true;
    Promise.resolve()
      .then(compute)
      .then((v) => cacheSet(key, v))
      .catch((e) => {
        console.error("[adminCache] background refresh failed", key, e);
        if (hit) hit.refreshing = false;
      });
    return { value: hit.value as T, status: "stale" };
  }
  if (hit && hit.refreshing) {
    // Cold compute already in flight for this key — don't double-run it.
    return { value: undefined, status: "warming" };
  }
  // Cold start: kick off the compute and race it against the timeout.
  const entry: Entry = { value: undefined, expiresAt: now() + TTL_MS, refreshing: true };
  store.set(key, entry);
  refreshing.add(key);
  let finished = false;
  let val: T | undefined;
  let err: unknown;
  const p = Promise.resolve()
    .then(compute)
    .then((v) => {
      finished = true;
      val = v;
      cacheSet(key, v);
    })
    .catch((e) => {
      err = e;
      store.delete(key);
      void l2Delete(key);
    })
    .finally(() => {
      refreshing.delete(key);
    });
  await Promise.race([p, new Promise((r) => setTimeout(r, timeoutMs))]);
  if (finished) return { value: val, status: "fresh" };
  if (err) {
    // Compute failed with no cache to fall back to. Surface as "warming" so the
    // client's existing backoff retries (and a cron/warmup can repopulate) rather
    // than hitting a hard 500 that shows a scary error on first load.
    console.error("[adminCache] compute failed", key, err);
    return { value: undefined, status: "warming" };
  }
  return { value: undefined, status: "warming" };
}
