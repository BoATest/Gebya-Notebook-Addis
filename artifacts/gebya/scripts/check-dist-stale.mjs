// check-dist-stale.mjs — CI GATE (api-server job): fails when the committed
// bundle is older than the source it was built from.
//
// Lesson (fourth silent-guard incident): manual "remember to rebuild"
// procedures decay; gates don't. The Vercel deploy intentionally ships the
// COMMITTED bundle (install is skipped; api/[...route].ts imports
// dist/index.mjs), so a stale commit silently ships old server code — exactly
// what happened to the Gate D parser fix until it was caught by hand.
//
// Strategy: signature-agnostic. Esbuild's minified symbol names are not
// stable, so instead of grepping for feature strings, REBUILD the current
// source and compare bytes (sha256) against the committed bundle. build.ts
// writes to dist/ directly, so the committed bytes are backed up and restored
// afterwards — a FAILED gate (or a build crash) must never rewrite the
// working tree. Comment-only source edits are invisible to the output (the
// minifier strips comments) and therefore correctly pass: the gate exists to
// catch OUTPUT drift, i.e. behavior that would reach production.
//
// Usage (from artifacts/api-server): node ../gebya/scripts/check-dist-stale.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const distDir = resolve(process.argv[2] || 'dist');
const committedPath = join(distDir, 'index.mjs');

if (!existsSync(committedPath)) {
  console.error(`✗ dist-stale gate: bundle not found at ${committedPath}`);
  process.exit(1);
}

const committedBytes = readFileSync(committedPath);
const committedHash = createHash('sha256').update(committedBytes).digest('hex').slice(0, 16);
const committedSize = committedBytes.length;

let freshHash;
let freshSize;
try {
  execFileSync('pnpm', ['run', 'build'], { stdio: 'pipe', shell: true });
  const fresh = readFileSync(committedPath);
  freshHash = createHash('sha256').update(fresh).digest('hex').slice(0, 16);
  freshSize = fresh.length;
} finally {
  // Restore the committed bytes no matter what — the gate REPORTS, it never
  // rewrites the tree (CI and local runs both stay clean).
  writeFileSync(committedPath, committedBytes);
}

console.log(
  `dist-stale gate: committed=${committedSize}B/${committedHash} rebuilt=${freshSize}B/${freshHash}`,
);
if (freshHash !== committedHash) {
  console.error(
    '✗ STALE BUNDLE — committed dist/index.mjs does not match a fresh build ' +
    'of the current source. Run: pnpm --filter @workspace/api-server build, ' +
    'then commit the rebuilt dist/index.mjs. (Vercel ships the COMMITTED ' +
    'bundle; a stale one silently ships old server code.)',
  );
  process.exit(1);
}
console.log('✓ dist-stale gate passed: committed bundle is current');

