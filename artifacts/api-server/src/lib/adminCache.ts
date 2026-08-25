// In-memory TTL cache with stale-while-revalidate, shared per warm serverless
// instance. After the first successful compute, subsequent requests return
// instantly from cache; when the entry goes stale it is served once more while
// a background refresh repopulates it. This removes most DB load from the
// admin dashboard and makes the first warm-instance response instant.
//
// NOTE: this cache lives in the function instance's memory, so it does not
// survive cold starts or span instances. For cross-instance persistence use
// Upstash Redis (swap the store below). A cron warmup keeps it populated.
type Entry = { value: unknown; expiresAt: number; refreshing: boolean };

const store = new Map<string, Entry>();
const TTL_MS = Number(process.env.ADMIN_CACHE_TTL_MS || 60_000);
const now = () => Date.now();

export async function serveCached<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > now()) return hit.value as T;
  if (hit && !hit.refreshing) {
    hit.refreshing = true;
    Promise.resolve()
      .then(compute)
      .then((v) => store.set(key, { value: v, expiresAt: now() + TTL_MS, refreshing: false }))
      .catch((e) => {
        console.error("[adminCache] background refresh failed", key, e);
        if (hit) hit.refreshing = false;
      });
    return hit.value as T;
  }
  const v = await compute();
  store.set(key, { value: v, expiresAt: now() + TTL_MS, refreshing: false });
  return v;
}

export async function warmCache(key: string, compute: () => Promise<unknown>): Promise<boolean> {
  try {
    const v = await compute();
    store.set(key, { value: v, expiresAt: now() + TTL_MS, refreshing: false });
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
 *   - fresh   → valid cache hit, return immediately.
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
  const hit = store.get(key);
  if (hit && hit.expiresAt > now()) return { value: hit.value as T, status: "fresh" };
  if (hit && hit.expiresAt <= now() && !hit.refreshing) {
    hit.refreshing = true;
    Promise.resolve()
      .then(compute)
      .then((v) => store.set(key, { value: v, expiresAt: now() + TTL_MS, refreshing: false }))
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
  let finished = false;
  let val: T | undefined;
  let err: unknown;
  const p = Promise.resolve()
    .then(compute)
    .then((v) => {
      finished = true;
      val = v;
      entry.value = v;
      entry.refreshing = false;
    })
    .catch((e) => {
      err = e;
      entry.refreshing = false;
    });
  await Promise.race([p, new Promise((r) => setTimeout(r, timeoutMs))]);
  if (finished) return { value: val, status: "fresh" };
  if (err) {
    store.delete(key);
    throw err;
  }
  return { value: undefined, status: "warming" };
}
