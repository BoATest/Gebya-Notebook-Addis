import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import * as schema from "@workspace/db/schema";
import { getTableColumns, getTableName } from "drizzle-orm";

// --- BOOTSTRAP_FILES: migration SQL made idempotent (CREATE TABLE IF NOT EXISTS) ---
const root = process.argv[2] || "lib/db";
const drizzleDir = join(root, "drizzle");
const migrationsDir = join(root, "migrations");
const drizzleFiles = readdirSync(drizzleDir).filter((f) => f.endsWith(".sql")).sort();
const migrationFiles = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
const files = [
  ...drizzleFiles.map((f) => join(drizzleDir, f)),
  ...migrationFiles.map((f) => join(migrationsDir, f)),
];
const contents = files.map((f) =>
  readFileSync(f, "utf8")
    .replace(/CREATE TABLE\s+"/g, 'CREATE TABLE IF NOT EXISTS "')
    .replace(/CREATE INDEX\s+"/g, 'CREATE INDEX IF NOT EXISTS "')
    .replace(/CREATE UNIQUE INDEX\s+"/g, 'CREATE UNIQUE INDEX IF NOT EXISTS "')
);

// --- BOOTSTRAP_ALTERS: one ADD COLUMN IF NOT EXISTS per column in the live
// drizzle schema. This is the SOURCE OF TRUTH for what the app queries, so it
// converges any table (even one created by an older/incomplete migration) to
// match the code. Types are mapped loosely and columns are added nullable so
// the statement never fails on existing rows. ---
function mapType(col: any): string {
  const ct: string = col?.columnType || "";
  if (/Serial|Integer|SmallInt|BigInt/.test(ct)) return "bigint";
  if (/Boolean/.test(ct)) return "boolean";
  if (/Real|Double|Numeric|Decimal/.test(ct)) return "double precision";
  if (/Timestamp/.test(ct)) return "timestamp with time zone";
  if (/Date/.test(ct)) return "date";
  if (/Json/.test(ct)) return "jsonb";
  if (/Uuid/.test(ct)) return "uuid";
  if (/Bytea/.test(ct)) return "bytea";
  if (/Text|Varchar|Char|Citext/.test(ct)) return "text";
  return "text";
}

const alters: string[] = [];
const seen = new Set<string>();
for (const table of Object.values(schema as any)) {
  if (!table || typeof table !== "object") continue;
  let cols: Record<string, any>;
  let tableName: string;
  try {
    cols = getTableColumns(table);
    tableName = getTableName(table);
  } catch {
    continue;
  }
  if (!cols || Object.keys(cols).length === 0) continue;
  for (const [colName, col] of Object.entries(cols)) {
    const key = `${tableName}.${colName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    alters.push(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${colName}" ${mapType(col)};`);
  }
}

const outPath = process.argv[3] || "artifacts/api-server/src/bootstrap.ts";
const out =
  `// AUTO-GENERATED. Two layers:\n` +
  `//  BOOTSTRAP_FILES  - migration SQL (idempotent) to CREATE missing tables.\n` +
  `//  BOOTSTRAP_ALTERS - one ADD COLUMN IF NOT EXISTS per column in the live\n` +
  `//    drizzle schema (@workspace/db/schema) to CONVERGE any existing table\n` +
  `//    whose columns drifted from the code. ensureSchema runs both at request\n` +
  `//    time, where DATABASE_URL + network are available.\n` +
  `export const BOOTSTRAP_FILES: string[] = ${JSON.stringify(contents, null, 2)};\n\n` +
  `export const BOOTSTRAP_ALTERS: string[] = ${JSON.stringify(alters, null, 2)};\n`;

writeFileSync(outPath, out);
console.log(`Generated ${outPath}: ${contents.length} files, ${alters.length} schema-derived column-alter statements.`);
