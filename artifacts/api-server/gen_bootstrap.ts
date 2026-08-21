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

// --- BOOTSTRAP_ALTERS: one ADD COLUMN IF NOT EXISTS per column the app may
// query. Source of truth is TWO places, both de-duplicated:
//   1. The live drizzle schema (@workspace/db/schema).
//   2. The CREATE TABLE definitions inside the migration SQL (BOOTSTRAP_FILES).
// Why both? The deployed bundle can drift from lib/db/src (e.g. a column was
// removed from source but still referenced by already-built code, or vice
// versa). Parsing the complete CREATE TABLE SQL guarantees every column the
// migrations declare also exists in the live DB. Columns are added nullable so
// the statement never fails on existing rows. ---

// Extract (table, column, type) triples from a CREATE TABLE statement. Types are
// taken verbatim from the SQL and constraints (NOT NULL / DEFAULT / REFERENCES /
// etc.) are stripped so the ADD COLUMN is always nullable.
function parseCreateTableColumns(
  sql: string,
): { table: string; columns: { name: string; type: string }[] }[] {
  const out: { table: string; columns: { name: string; type: string }[] }[] = [];
  // Find each CREATE TABLE block with paren-aware scanning so column types
  // that contain parentheses (e.g. varchar(32), numeric(12, 2)) don't
  // prematurely terminate the body match.
  const startRe = /CREATE TABLE(?: IF NOT EXISTS)?\s+"([^"]+)"/g;
  let sm: RegExpExecArray | null;
  while ((sm = startRe.exec(sql)) !== null) {
    const table = sm[1];
    let i = sql.indexOf("(", sm.index);
    if (i < 0) continue;
    let depth = 0;
    let end = -1;
    for (let j = i; j < sql.length; j++) {
      if (sql[j] === "(") depth++;
      else if (sql[j] === ")") {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end < 0) continue;
    const body = sql.slice(i + 1, end);
    const columns: { name: string; type: string }[] = [];
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      // Column lines start with a double-quoted identifier; constraint lines
      // (PRIMARY KEY, CONSTRAINT, FOREIGN KEY, CHECK, UNIQUE, INDEX) do not.
      const colMatch = line.match(/^"([^"]+)"\s+([\s\S]+?)(?:,|$)/);
      if (!colMatch) continue;
      const name = colMatch[1];
      let type = colMatch[2].trim();
      // Cut the type off before any constraint/default keyword.
      type = type
        .split(/\s+(?:NOT NULL|NULL|DEFAULT|PRIMARY KEY|UNIQUE|REFERENCES|CHECK|COLLATE)/)[0]
        .trim();
      if (type) columns.push({ name, type });
    }
    if (columns.length) out.push({ table, columns });
  }
  return out;
}

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
const addAlter = (table: string, col: string, type: string) => {
  const key = `${table}.${col}`;
  if (seen.has(key)) return;
  seen.add(key);
  alters.push(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col}" ${type};`);
};

// 1) live schema
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
    addAlter(tableName, colName, mapType(col));
  }
}

// 2) migration CREATE TABLE SQL (complete, authoritative for the DB shape)
for (const fileSql of contents) {
  for (const { table, columns } of parseCreateTableColumns(fileSql)) {
    for (const { name, type } of columns) {
      addAlter(table, name, type);
    }
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
