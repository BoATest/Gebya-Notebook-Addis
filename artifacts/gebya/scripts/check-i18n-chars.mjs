// check-i18n-chars.mjs — CI guard against non-Ethiopic characters leaking
// into the app source. Caught real bugs: CJK glyphs and a stray Bengali
// letter at the start of an Amharic label (fixed in commit fefcbbe).
//
// SCOPE (widened): the app ships exactly two writing systems — ASCII/Latin
// and Ethiopic. So the rule is inverted: instead of blocklisting the CJK
// ranges we happen to know about, we flag ANY character that is a letter or
// number outside ASCII + Ethiopic. That catches *every* foreign script
// (Bengali, Cyrillic, Greek, Arabic, Thai, Devanagari, ...) without a
// blocklist that needs extending every time a new slip appears.
//
// Emoji and typographic punctuation (·, —, →, ‘, ✓, ZWJ/ZWNJ) are NOT
// letters or numbers, so they stay allowed — otherwise every emoji in the
// UI would trip the guard.
//
// Exits non-zero on a hit, listing file, line, column, codepoint and a
// trimmed excerpt so the offender is obvious in CI output.
//
// Run: pnpm lint:i18n   (wired into .github/workflows/ci.yml)
//
// Optional: pass paths to sweep somewhere else (one-time repo audit):
//   node scripts/check-i18n-chars.mjs ../gebya/tests ../api-server/src

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url));

// The only two scripts we ship: ASCII/Latin plus the Ethiopic blocks
// (U+1200–U+137F Ethiopic, U+1380–U+139F Supplement, U+2D80–U+2DDF Extended,
// U+AB00–U+AB2F Extended-A).
const ALLOWED = /[\u0000-\u007F\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;

// Always-flag blocks: CJK Unified + Ext A, Kana, Hangul syllables, CJK
// compat, and Fullwidth/Halfwidth forms. Kept explicit so the original CJK
// sweep behaviour is preserved even for chars that are not letters (e.g.
// full-width punctuation).
const FOREIGN_BLOCK = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF]/;

// Any letter or number, in any script.
const ANY_ALNUM = /[\p{L}\p{N}]/u;

// Deliberate, non-script symbols we use on purpose in the UI. These are
// typography/math, not a foreign writing system, so they are allowed
// everywhere. Kept to an explicit, reviewed list so a NEW foreign character
// always fails the build.
const DELIBERATE_SYMBOLS = new Set([
  '\u00BD', // ½  FRACTION ONE HALF — "½ Partial payment"
  '\u2139', // ℹ  INFORMATION SOURCE — info icon
  '\u03A3', // Σ  GREEK CAPITAL SIGMA — sum notation in comments
]);

// Gate B: the legacy-code allowlist was REMOVED (temporary by design).
// The writers are fixed and both migrations (server ensureSchema purge +
// Dexie version-28 upgrade) clear persisted rows. Any non-ASCII+Ethiopic
// character in scope now fails the check — no exceptions. The array stays
// (empty) so the skip mechanism itself survives for genuine future needs.
const ALLOWED_SNIPPETS = [];

function isOffender(ch) {
  if (ALLOWED.test(ch)) return false;           // ASCII or Ethiopic — always fine
  if (DELIBERATE_SYMBOLS.has(ch)) return false; // reviewed UI symbol
  if (FOREIGN_BLOCK.test(ch)) return true;      // known-damage blocks
  return ANY_ALNUM.test(ch);                    // any other script's letter/number
}

/** Returns the matching allowlist entry for a line, if any. */
function allowlistEntryFor(line) {
  return ALLOWED_SNIPPETS.find((a) => line.includes(a.snippet));
}

/** "U+09A8" style label for CI output. */
function codepointLabel(ch) {
  return `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
}

function listFiles(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      out.push(...listFiles(full, exts));
    } else if (exts.test(name)) {
      out.push(full);
    }
  }
  return out;
}

// Default = app source only (the CI contract). Extra CLI paths widen the
// sweep for one-time audits without changing the guard.
const cliPaths = process.argv.slice(2);
const extraMode = cliPaths.length > 0;
const exts = extraMode
  ? /\.(js|jsx|ts|tsx|mjs|cjs|html|md|json)$/
  : /\.(js|jsx)$/;
const targets = extraMode ? cliPaths.map((p) => resolve(p)) : [SRC_DIR];

const offenders = [];
const allowlisted = [];
for (const target of targets) {
  let isDir = false;
  try { isDir = statSync(target).isDirectory(); } catch { continue; }
  const files = isDir ? listFiles(target, exts) : [target];

  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const allowedHere = allowlistEntryFor(line);
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (!isOffender(ch)) continue;
        if (allowedHere) {
          allowlisted.push({
            file: relative(process.cwd(), file).split(sep).join('/'),
            line: i + 1,
            cp: codepointLabel(ch),
            reason: allowedHere.reason,
          });
        } else {
          offenders.push({
            file: relative(process.cwd(), file).split(sep).join('/'),
            line: i + 1,
            col: c + 1,
            cp: codepointLabel(ch),
            text: line.trim().slice(0, 100),
          });
        }
        break; // one report per line is enough to locate the problem
      }
    }
  }
}

if (offenders.length > 0) {
  console.error(` i18n check FAILED: ${offenders.length} line(s) contain characters outside ASCII + Ethiopic.\n`);
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}:${o.col}  ${o.cp}`);
    console.error(`      ${o.text}`);
  }
  console.error('\nAmharic UI strings must contain only Ethiopic/Latin characters.');
  console.error('Emoji and punctuation (·, —, →, ✓) are fine — letters and');
  console.error('numbers from other scripts are not. If the character is inside');
  console.error('a comment, fix it too: it usually means a copy/paste or encoding');
  console.error('slip that will reach users next.');
  process.exit(1);
}

if (allowlisted.length > 0) {
  console.log(`ℹ ${allowlisted.length} known line(s) allowlisted (needs migration, not a copy fix):`);
  for (const a of allowlisted) {
    console.log(`  ${a.file}:${a.line}  ${a.cp} — ${a.reason}`);
  }
}

console.log('✓ i18n check passed: no characters outside ASCII + Ethiopic in scope');
