// One-time, idempotent DB schema bootstrap.
//
// The committed Drizzle baseline migration (lib/db/drizzle/0000_baseline_current_schema.sql)
// predates the `phone_required` / `approval_required` columns that the current
// `businesses` schema (lib/db/src/schema/businesses.ts) and the createShop
// handler expect. On existing live databases those columns are never added, so
// INSERTs generated from the schema fail with "column ... does not exist".
//
// This runs an idempotent ALTER TABLE on first request. It executes on Vercel's
// network (where the DB IS reachable), is a no-op once columns exist, and never
// blocks application boot: failures are logged and swallowed so the API stays
// up (and so the real underlying error is visible in logs).
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let pending: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    if (!db) {
      console.warn("[migrate] db not configured; skipping ensureSchema");
      return;
    }
    try {
      await db.execute(sql`
        ALTER TABLE "businesses"
        ADD COLUMN IF NOT EXISTS "phone_required" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "approval_required" boolean NOT NULL DEFAULT false
      `);
      console.log("[migrate] businesses schema ensured (phone_required, approval_required)");
    } catch (e) {
      console.error("[migrate] ensureSchema failed:", e instanceof Error ? e.message : String(e));
    }
  })();
  return pending;
}
