// check-i18n-chars.mjs — CI guard against non-Ethiopic characters leaking
// into the app source. This caught real user-facing bugs: Chinese '孙悟' and
// Korean '딧' rendered inside Amharic UI strings (fixed in commit fefcbbe).
//
// Scans every .js/.jsx file under src/ for CJK / Japanese kana / Hangul
// characters and exits non-zero if any are found, listing file, line, and a
// trimmed excerpt so the offender is obvious in CI output.
//
// Run: pnpm lint:i18n   (wired into .github/workflows/ci.yml)

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url));

// CJK Unified Ideographs + Extension A, Kana, Hangul syllables, CJK compat.
const FOREIGN = /[\u3400-\u4DBF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\uF900-\uFAFF]/;

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else if (/\.(js|jsx)$/.test(name)) out.push(full);
  }
  return out;
}

const offenders = [];
for (const file of listFiles(SRC_DIR)) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (FOREIGN.test(lines[i])) {
      offenders.push({
        file: relative(process.cwd(), file).split(sep).join('/'),
        line: i + 1,
        text: lines[i].trim().slice(0, 100),
      });
    }
  }
}

if (offenders.length > 0) {
  console.error(`✗ i18n check FAILED: ${offenders.length} line(s) contain foreign (CJK/Kana/Hangul) characters.\n`);
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}: ${o.text}`);
  }
  console.error('\nAmharic UI strings must contain only Ethiopic/Latin characters.');
  console.error('If the character is inside a comment, fix it too — it usually');
  console.error('means a copy/paste or encoding slip that will reach users next.');
  process.exit(1);
}

console.log('✓ i18n check passed: no CJK/Kana/Hangul characters in src/');
