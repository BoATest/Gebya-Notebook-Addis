// find-orphans.mjs
// Lists .js/.jsx/.ts/.tsx source files under src/ that are never imported.
// Fails (exit 1) when NEW orphans appear beyond the ALLOWED_ORPHANS baseline
// (a comma-separated list in env, to acknowledge known-dead files during cleanup).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['src', 'tests'].map((d) => join(ROOT, d));
const ENTRY_FILES = new Set(['main.jsx', 'main.tsx', 'App.jsx', 'index.html', 'sw.js', 'vite.config.ts']);

function listFiles(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) out.push(...listFiles(full));
    else if (/\.(js|jsx|ts|tsx|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

const allFiles = SCAN_DIRS.flatMap(listFiles);
const srcFiles = allFiles.filter((f) => !f.includes(`${sep}tests${sep}`));

const contents = new Map();
for (const f of allFiles) {
  try { contents.set(f, readFileSync(f, 'utf8')); } catch { contents.set(f, ''); }
}
try { contents.set(join(ROOT, 'index.html'), readFileSync(join(ROOT, 'index.html'), 'utf8')); } catch {}

// Collect every import-like reference string across the codebase.
// Matches: import ... from '...Name', import('...Name'), require('...Name')
const IMPORT_RE = /import(?:All|Meta)?(?:\s[^=\n]*?from)?\s*['"]([^'"]+)['"]/g;
const LAZY_RE = /import\(['"]([^'"]+)['"]\)/g;
let allRefs = new Set();
for (const text of contents.values()) {
  let m;
  while ((m = IMPORT_RE.exec(text))) allRefs.add(m[1]);
  while ((m = LAZY_RE.exec(text))) allRefs.add(m[1]);
}

const orphans = [];
for (const file of srcFiles) {
  const base = file.split(sep).pop();
  if (ENTRY_FILES.has(base)) continue;
  // A file is "referenced" if any import path ends with this file's basename
  // (with or without extension) — e.g. '../context/LangContext' matches
  // LangContext.jsx, and '../staff/StaffPage' matches StaffPage.jsx.
  const baseNoExt = base.replace(/\.(js|jsx|ts|tsx|mjs)$/, '');
  const ext = base.match(/\.(js|jsx|ts|tsx|mjs)$/)?.[0] || '.js';
  let referenced = false;
  for (const ref of allRefs) {
    if (ref === baseNoExt || ref === base) { referenced = true; break; }
    // path/stem.ext or path/stem
    const refParts = ref.split('/');
    const refBase = refParts[refParts.length - 1];
    if (refBase === base || refBase === baseNoExt) { referenced = true; break; }
    if (refBase === baseNoExt + ext) { referenced = true; break; }
  }
  if (!referenced) orphans.push(relative(ROOT, file).split(sep).join('/'));
}

const allowed = (process.env.ALLOWED_ORPHANS || '').split(',').filter(Boolean);
const newOrphans = orphans.filter((o) => !allowed.includes(o));

if (orphans.length === 0) {
  console.log('No orphan source files - everything under src/ is referenced.');
} else {
  const flag = newOrphans.length ? 'NEW' : 'existing';
  console.log(`${orphans.length} orphan candidate(s) [${flag} beyond baseline]:`);
  for (const o of orphans) console.log(`  ${o}`);
  if (newOrphans.length) {
    console.log('\nNEW orphans not in ALLOWED_ORPHANS:');
    for (const o of newOrphans) console.log(`  ${o}`);
    process.exit(1);
  } else {
    console.log('\n(All orphans acknowledged via ALLOWED_ORPHANS baseline - not failing.)');
  }
}
