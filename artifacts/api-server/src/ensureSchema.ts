// One-time, idempotent DB schema bootstrap.
//
// The committed Drizzle migrations (lib/db/drizzle + lib/db/migrations) were
// never applied to the live production database, so tables were missing and
// sign-in/sync 500'd. We apply them here at request time, where DATABASE_URL
// and network are available (Vercel build-time push is unreliable because the
// env var is not present during the build).
//
// Two layers:
//   * BOOTSTRAP_FILES  - the migration SQL, made idempotent (CREATE TABLE IF
//     NOT EXISTS). Creates tables that don't exist yet.
//   * BOOTSTRAP_ALTERS - one ADD COLUMN IF NOT EXISTS per declared column.
//     Converges an existing-but-incomplete table (e.g. a table that was
//     already present but missing columns a later migration should have added,
//     which is exactly what broke sign-in: the users table existed without
//     the telegram_link_token column).
//
// NOTE: drizzle db.execute funnels through client.query(text, params). When a
// params array is supplied (even empty) node-postgres uses the extended
// protocol, which rejects multiple statements. So we run ONE statement per
// db.execute call. Failures are logged and swallowed so the API stays up.
//
// Schema convergence check: we verify the notification_preferences table has
// a known column before running ALTERs. If it does, the schema is already
// converged and we skip all ~400 ALTER statements, cutting cold-start latency
// by several seconds.
import { db } from "@workspace/db";
import { BOOTSTRAP_FILES, BOOTSTRAP_ALTERS } from "./bootstrap";
import { sql } from "drizzle-orm";

let pending: Promise<void> | null = null;

let schemaConverged = false;

async function checkSchemaConverged(): Promise<boolean> {
  try {
    if (!db) return false;
    const res: any = await db.execute(
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'notification_preferences' AND column_name = 'quietHoursStart'`,
    );
    return (res?.rows ?? []).length > 0;
  } catch {
    return false;
  }
}

function splitSqlStatements(source: string): string[] {
  const dollarSegments: string[] = [];
  let s = source.replace(/\$\$([\s\S]*?)\$\$/g, (m) => {
    dollarSegments.push(m);
    return " D" + (dollarSegments.length - 1) + " ";
  });
  s = s
    .split("\n")
    .map((line) => line.replace(/(^|\s)--.*$/g, "$1"))
    .join("\n");
  return s
    .split(";")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .map((stmt) => stmt.replace(/ D(\d+) /g, (_match, i) => dollarSegments[Number(i)]));
}

async function runStatement(
  client: NonNullable<typeof db>,
  stmt: string,
  ok: { n: number },
  fail: { n: number },
  label: string,
): Promise<void> {
  try {
    await client.execute(sql.raw(stmt.replace(/;\s*$/, "")));
    ok.n++;
  } catch (e) {
    fail.n++;
    console.error("[migrate] " + label + " failed:", e instanceof Error ? e.message : String(e));
  }
}

export function ensureSchema(): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    if (!db) {
      console.warn("[migrate] db not configured; skipping ensureSchema");
      return;
    }
    try {
      const ok = { n: 0 };
      const fail = { n: 0 };

      // Schema convergence check: skip ~400 ALTERs if already converged
      if (!schemaConverged) {
        schemaConverged = await checkSchemaConverged();
      }
      if (!schemaConverged) {
        // Column convergence: always run (idempotent, cheap once applied). This
        // guarantees every column the app expects exists, even if a prior
        // bootstrap left a table incomplete.
        for (const stmt of BOOTSTRAP_ALTERS) {
          await runStatement(db, stmt, ok, fail, "alter");
        }
        schemaConverged = true;
      }

      // Full table creation, only when the core table is missing.
      let needsBootstrap = false;
      try {
        await db.execute(sql`SELECT 1 FROM "users" LIMIT 1`);
      } catch {
        needsBootstrap = true;
      }

      if (needsBootstrap) {
        for (const fileSql of BOOTSTRAP_FILES) {
          for (const stmt of splitSqlStatements(fileSql)) {
            await runStatement(db, stmt, ok, fail, "bootstrap statement");
          }
        }
      }

      console.log("[migrate] schema ensure complete: " + ok.n + " ok, " + fail.n + " failed" + (schemaConverged ? " (skipped ALTERs)" : ""));
    } catch (e) {
      console.error("[migrate] ensureSchema failed:", e instanceof Error ? e.message : String(e));
    }
  })();
  return pending;
}
