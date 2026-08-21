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
import { BOOTSTRAP_FILES } from "./bootstrap";
import { sql } from "drizzle-orm";

let pending: Promise<void> | null = null;

function splitSqlStatements(source: string): string[] {
  return source
    .split("\n")
    .map((line) => line.replace(/(^|\s)--.*$/, "$1"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function ensureSchema(): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    if (!db) {
      console.warn("[migrate] db not configured; skipping ensureSchema");
      return;
    }
    try {
      // Full schema bootstrap (only if the core "users" table is missing).
      // This creates every table on a fresh production database that was
      // never migrated. BOOTSTRAP_FILES are the committed Drizzle migrations,
      // made idempotent. Runs here — at request time, where DATABASE_URL and
      // network are guaranteed — unlike build time.
      //
      // NOTE: drizzle's db.execute funnels through client.query(text, params).
      // When a params array is supplied (even empty) node-postgres uses the
      // extended protocol, which rejects multiple statements. So we must run
      // ONE statement per db.execute call.
      let needsBootstrap = false;
      try {
        await db.execute(sql`SELECT 1 FROM "users" LIMIT 1`);
      } catch {
        needsBootstrap = true;
      }

      if (needsBootstrap) {
        let okCount = 0;
        let failCount = 0;
        for (const fileSql of BOOTSTRAP_FILES) {
          for (const stmt of splitSqlStatements(fileSql)) {
            try {
              await db.execute(sql.raw(stmt));
              okCount++;
            } catch (e) {
              failCount++;
              console.error("[migrate] bootstrap statement failed:", e instanceof Error ? e.message : String(e));
            }
          }
        }
        console.log(`[migrate] schema bootstrap complete: ${okCount} ok, ${failCount} failed`);
      }

      await db.execute(sql`
        ALTER TABLE "businesses"
        ADD COLUMN IF NOT EXISTS "phone_required" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "approval_required" boolean NOT NULL DEFAULT false
        `);
      console.log("[migrate] businesses schema ensured (phone_required, approval_required)");

      await db.execute(sql`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "password_hash" text,
        ADD COLUMN IF NOT EXISTS "password_set_at" timestamp with time zone,
        ADD COLUMN IF NOT EXISTS "password_attempts" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "password_locked_until" timestamp with time zone
        `);
      console.log("[migrate] users schema ensured (password_hash, password_set_at, password_attempts, password_locked_until)");

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "platform_admin_members" (
          "id" serial PRIMARY KEY NOT NULL,
          "phone" text NOT NULL,
          "added_by_phone" text,
          "note" text,
          "created_at" timestamp DEFAULT now() NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "platform_admin_members_phone_unique" ON "platform_admin_members" USING btree ("phone");
        `);
      console.log("[migrate] platform_admin_members ensured");
    } catch (e) {
      console.error("[migrate] ensureSchema failed:", e instanceof Error ? e.message : String(e));
    }
  })();
  return pending;
}
