'use strict';
/**
 * audit/scan-labels.cjs
 * Label modules (`src/labels/*`, `components/settings/groupedLabels.js`) store
 * entries as objects, and an object's `en` and `am` keys are often on DIFFERENT
 * lines:
 *
 *     signOutBody: {
 *       en: 'You will need your phone number to sign in again.',
 *       am: 'እንደገና ለመግባት የስልክ ቁጥርዎ ያስፈልጋል።',
 *     },
 *
 * A line-by-line scan cannot pair those, so this module walks brace-delimited
 * objects and pairs keys within each one. Function-valued entries (Rule 6 of the
 * labels contract) are reported with the raw source so the reviewer sees the
 * interpolation shape rather than a flattened string.
 */
const fs = require('fs');
const { CENTRAL, LABEL_FILES, screenFor, decodeLiteral, brokenReason, stripComments } = require('./common.cjs');

const KEY = /\b(en|am)\s*:\s*/g;

/** Pair `en:` / `am:` keys that live inside the same object literal. */
function pairObjects(text) {
  const pairs = [];
  let depth = 0;
  let objStart = -1;
  const stack = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') { stack.push(i); depth++; continue; }
    if (c === '}') { stack.pop(); depth--; continue; }
    if (c !== 'e' && c !== 'a') continue;
    KEY.lastIndex = i;
    const m = KEY.exec(text);
    if (!m || m.index !== i) continue;
    // Only count keys at the depth of the innermost object we are tracking.
    if (stack.length !== depth) continue;
    const objStartIdx = stack[stack.length - 1];
    const body = text.slice(i + m[0].length);
    const val = readValue(body);
    if (!val) continue;
    if (val.kind === 'string') {
      pairs.push({ en: m[1] === 'en' ? val.value : null, am: m[1] === 'am' ? val.value : null, line: lineOf(text, i), objStart: objStartIdx });
    } else {
      pairs.push({ en: m[1] === 'en' ? `‹${val.kind}› ${val.preview}` : null, am: m[1] === 'am' ? `‹${val.kind}› ${val.preview}` : null, line: lineOf(text, i), objStart: objStartIdx });
    }
  }
  // Merge the key-level records into per-object pairs, keyed by the
  // ENCLOSING object's opening brace so `en` and `am` land in one record even
  // when they sit on different lines.
  const byObject = new Map();
  for (const p of pairs) {
    if (!byObject.has(p.objStart)) byObject.set(p.objStart, { en: null, am: null, line: p.line });
    const slot = byObject.get(p.objStart);
    if (p.en !== null) { slot.en = p.en; slot.line = p.line; }
    if (p.am !== null) { slot.am = p.am; if (slot.en === null) slot.line = p.line; }
  }
  return [...byObject.values()].filter((p) => p.en !== null || p.am !== null);
}

function readValue(text) {
  const q = text[0];
  if (q === "'" || q === '"' || q === '`') {
    for (let j = 1; j < text.length; j++) {
      if (text[j] === '\\') { j++; continue; }
      if (text[j] === q) return { kind: 'string', value: decodeLiteral(text.slice(1, j)) };
    }
    return null;
  }
  if (text[0] === '(') {
    const end = matchParen(text);
    return { kind: 'fn', preview: collapse(text.slice(0, end + 1)) };
  }
  return null;
}

function matchParen(text) {
  let d = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') d++;
    else if (text[i] === ')') { d--; if (d === 0) return i; }
  }
  return text.length - 1;
}

function collapse(s) { return s.replace(/\s+/g, ' ').slice(0, 160); }
function lineOf(text, idx) { return text.slice(0, idx).split('\n').length; }

function scanLabelModules() {
  const out = [];
  for (const file of LABEL_FILES) {
    out.push(...scanFile(file));
  }
  out.push(...scanFile(CENTRAL.grouped));
  return out;
}

function scanFile(file) {
  // Comments in these modules record past fixes (e.g. "was የይምት = insult"),
  // so pair keys against code with comments blanked out.
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const code = stripComments(text);
  const out = [];

  for (const pair of pairObjects(code)) {
    const am = pair.am;
    const broken = am ? brokenReason(am) : null;
    const status = broken
      ? '[NEEDS-FIX]'
      : '[DRAFT-REVIEWED-PENDING]';
    out.push({
      file,
      line: pair.line,
      code: (lines[pair.line - 1] || '').trim(),
      en: pair.en,
      am: pair.am,
      kind: 'label-object',
      status,
      reason: broken ? `${broken.token} — ${broken.note}` : null,
      screen: screenFor(file),
    });
  }
  return out;
}

module.exports = { scanLabelModules, pairObjects, scanFile };
