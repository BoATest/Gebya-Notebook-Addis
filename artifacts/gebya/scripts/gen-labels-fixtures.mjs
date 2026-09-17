#!/usr/bin/env node
/**
 * gen-labels-fixtures.mjs — mechanical provenance fixtures for R2.1 batches.
 *
 * Reads the PRE-refactor bytes of a consumer DIRECTLY from git
 * (execFileSync → Buffer → utf8; no shell redirection — shell piping is what
 * mojibake'd the first attempt) and writes a STATIC fixture module that the
 * batch's byte-lock spec imports. Tests never read git at runtime (shallow CI
 * clones); the committed fixture bytes ARE the provenance.
 *
 * Usage (from artifacts/gebya):
 *   node scripts/gen-labels-fixtures.mjs <ns> <gitRef> <srcFile> [expectTernaries]
 *   node scripts/gen-labels-fixtures.mjs onboarding 05fa092 src/components/OnboardingScreen.jsx 15
 *
 * Output: tests/fixtures/labels-<ns>-pre.mjs exporting
 *   PRE_TERNARIES [{ line, am, en, enDict }] — `lang === 'am' ? A : B` sites
 *   PRE_DUAL      [{ fn, line, value }]      — literals inside dual-render fns
 *
 * Sanity gates (exit 1 on violation):
 *   - no UTF-8 double-encoding (mojibake) markers in any extracted string
 *   - every am-branch string is Ethiopic unless listed in ASCII_AM_OK
 *     (inverted target-language toggle strings — the only legitimate case)
 *   - PRE_TERNARIES.length === expectTernaries (when the 4th arg is > 0)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GEO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const [, , ns, ref, srcFile, expectArg] = process.argv;
if (!ns || !ref || !srcFile) {
  console.error('usage: node scripts/gen-labels-fixtures.mjs <ns> <gitRef> <srcFile> [expectTernaries]');
  process.exit(1);
}
const EXPECT = Number(expectArg || 0);

// ── git bytes, decoded exactly once (no shell, no re-encoding) ──────────────
const pre = execFileSync(
  'git',
  ['show', `${ref}:artifacts/gebya/${srcFile}`],
  { cwd: GEO_ROOT, maxBuffer: 64 * 1024 * 1024 },
).toString('utf8');

const unescape = (s) => s.replace(/\\(['"\\])/g, '$1');
const STR = String.raw`(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")`;
const HEAD = String.raw`lang\s*===\s*['"]am['"]\s*\?\s*`;
// groups: 1|2 = am-branch literal, 3|4 = en-branch literal, 5 = t.<key> lookup
const RE = new RegExp(`${HEAD}${STR}${String.raw`\s*:\s*`}(?:${STR}|\\bt\\.([A-Za-z0-9_]+)\\b)`, 'g');

const ASCII_AM_OK = ['Switch to English', 'English']; // inverted toggle sites only
const ETHIOPIC = /[\u1200-\u137F]/;
const MOJIBAKE = /[\u00C0-\u024F]{2,}/; // runs of Latin-Ext letters = double-encoded bytes

const PRE_TERNARIES = [];
let m;
while ((m = RE.exec(pre)) !== null) {
  const line = pre.slice(0, m.index).split('\n').length;
  const am = unescape(m[1] ?? m[2] ?? '');
  const enDictKey = m[5] ?? null;
  const en = enDictKey ? null : unescape(m[3] ?? m[4] ?? '');
  if (MOJIBAKE.test(am) || (en && MOJIBAKE.test(en))) {
    console.error(`mojibake at line ${line}: ${JSON.stringify({ am, en })}`);
    process.exit(1);
  }
  if (!ETHIOPIC.test(am) && !ASCII_AM_OK.includes(am)) {
    console.error(`am-branch not Ethiopic at line ${line}: ${JSON.stringify(am)} — add to ASCII_AM_OK only if it is an inverted toggle string`);
    process.exit(1);
  }
  PRE_TERNARIES.push({ line, am, en, enDict: enDictKey ? `t.${enDictKey}` : null });
}

// ── t.<key> sites → resolve the EN bytes from the pre-refactor dictionary ───
function gitShow(path) {
  return execFileSync('git', ['show', `${ref}:artifacts/gebya/${path}`], {
    cwd: GEO_ROOT, maxBuffer: 64 * 1024 * 1024,
  }).toString('utf8');
}
if (PRE_TERNARIES.some((t) => t.enDict)) {
  const dictSrc = gitShow('src/context/dictionaries.js');
  for (const item of PRE_TERNARIES) {
    if (!item.enDict) continue;
    const key = item.enDict.slice(2);
    const keyRe = new RegExp(`\\b${key}\\b\\s*:\\s*${STR}`, 'g');
    let enHit = null;
    let km;
    while ((km = keyRe.exec(dictSrc)) !== null) {
      const v = unescape(km[1] ?? km[2] ?? '');
      if (!ETHIOPIC.test(v)) { enHit = v; break; }
    }
    if (enHit == null) {
      console.error(`UNRESOLVED dict key ${item.enDict} — no non-Ethiopic value in dictionaries.js`);
      process.exit(1);
    }
    item.en = enHit;
    item.enDict = `${item.enDict} → '${enHit}'`;
  }
}

// ── dual-render function literals (renderEnglishOptions/renderAmharicOptions) ─
function extractFn(src, name) {
  const at = src.indexOf(`function ${name}`);
  if (at === -1) return null;
  const open = src.indexOf('{', at);
  if (open === -1) return null;
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') {
      depth--;
      if (depth === 0) return src.slice(at, j + 1);
    }
  }
  return src.slice(at);
}

const PRE_DUAL = [];
for (const fn of ['renderEnglishOptions', 'renderAmharicOptions']) {
  const body = extractFn(pre, fn);
  if (!body) continue;
  const fnStartLine = pre.slice(0, pre.indexOf(`function ${fn}`)).split('\n').length;
  const litRe = new RegExp(STR, 'g');
  let lm;
  while ((lm = litRe.exec(body)) !== null) {
    const value = unescape(lm[1] ?? lm[2] ?? '');
    if (!value || MOJIBAKE.test(value)) continue;
    const line = fnStartLine + body.slice(0, lm.index).split('\n').length - 1;
    PRE_DUAL.push({ fn, line, value });
  }
}

// ── dual-render VISIBLE TEXT — bare JSX text nodes (the quoted-literal scan
// above only catches attributes; the option-card copy lives as JSX text like
// `>Shop Owner<`). Lettered nodes only: at least one Latin/Ethiopic letter, so
// emoji (🏪) and whitespace are skipped. These feed the dual-collapse locks. ──
const LETTERED = /[A-Za-z\u1200-\u137F]/;
const PRE_DUAL_TEXT = [];
for (const fn of ['renderEnglishOptions', 'renderAmharicOptions']) {
  const body = extractFn(pre, fn);
  if (!body) continue;
  const fnStartLine = pre.slice(0, pre.indexOf(`function ${fn}`)).split('\n').length;
  const textRe = />((?:[^<>{}]|\n)+)</g;
  let tm;
  while ((tm = textRe.exec(body)) !== null) {
    const value = tm[1].trim();
    if (!value || !LETTERED.test(value) || MOJIBAKE.test(value)) continue;
    const line = fnStartLine + body.slice(0, tm.index).split('\n').length - 1;
    PRE_DUAL_TEXT.push({ fn, line, value });
  }
}

// ── write the static fixture ────────────────────────────────────────────────
const out = `/**
 * GENERATED by scripts/gen-labels-fixtures.mjs — do not edit by hand.
 * Provenance: captured from ${ref}:${srcFile} (pre-refactor bytes read
 * byte-faithfully out of git inside node). Static on purpose: CI runs
 * shallow clones, so tests import THIS file, never git.
 * Regenerate: node scripts/gen-labels-fixtures.mjs ${ns} ${ref} ${srcFile} ${EXPECT || '<count>'}
 */
export const PRE_TERNARIES = ${JSON.stringify(PRE_TERNARIES, null, 2)};

export const PRE_DUAL = ${JSON.stringify(PRE_DUAL, null, 2)};

export const PRE_DUAL_TEXT = ${JSON.stringify(PRE_DUAL_TEXT, null, 2)};
`;
const outFile = resolve(GEO_ROOT, 'artifacts/gebya/tests/fixtures', `labels-${ns}-pre.mjs`);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, out, 'utf8');

if (EXPECT > 0 && PRE_TERNARIES.length !== EXPECT) {
  console.error(`TERNARY COUNT MISMATCH: extracted ${PRE_TERNARIES.length}, expected ${EXPECT}`);
  process.exit(1);
}
console.log(`OK ${outFile}`);
console.log(`ternaries=${PRE_TERNARIES.length} dual_literals=${PRE_DUAL.length} dual_text=${PRE_DUAL_TEXT.length}`);
PRE_TERNARIES.forEach((t, i) =>
  console.log(`${String(i + 1).padStart(2)}. L${t.line} am=${JSON.stringify(t.am)} en=${t.enDict ?? JSON.stringify(t.en)}`),
);
for (const d of PRE_DUAL) console.log(`dual ${d.fn} L${d.line}: ${JSON.stringify(d.value)}`);
