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
