'use strict';
/**
 * audit/parse-inline.cjs
 * Extracts translatable string pairs from UI source files.
 *
 * Recognised shapes:
 *   A. `lang === 'am' ? 'AM' : 'EN'`      (inline ternary — the dominant shape)
 *   B. `{ en: 'EN', am: 'AM' }`           (inline locale object)
 *   C. `t('EN', 'AM')`                   (local i18n helper on newer screens)
 *   D. `name: 'EN', nameAm: 'AM'`        (static data rows, e.g. bank list)
 *   E. Amharic literal with no EN sibling on the line (one-sided string)
 *
 * Every entry keeps its `file:line` anchor and the raw source line so a
 * reviewer can open it directly. Nothing is translated or normalised here.
 */
const { ETHIOPIC, CENTRAL, LABEL_FILES, screenFor, walk, decodeLiteral, brokenReason } = require('./common.cjs');

/** Read a quoted literal starting at `i`, else null. */
function readLiteral(text, i) {
  const q = text[i];
  if (q !== "'" && q !== '"' && q !== '`') return null;
  let out = '';
  for (let j = i + 1; j < text.length; j++) {
    const c = text[j];
    if (c === '\\') { out += c + (text[j + 1] || ''); j++; continue; }
    if (c === q) return { raw: out, end: j };
    if (c === '\n') return null;
    out += c;
  }
  return null;
}

/** `? <lit> : <lit>` immediately after position `i`. */
function ternaryAt(text, i) {
  let j = i;
  while (j < text.length && /\s/.test(text[j])) j++;
  if (text[j] !== '?') return null;
  j++;
  while (j < text.length && /\s/.test(text[j])) j++;
  const amLit = readLiteral(text, j);
  if (!amLit) return null;
  j = amLit.end + 1;
  while (j < text.length && /\s/.test(text[j])) j++;
  if (text[j] !== ':') return null;
  j++;
  while (j < text.length && /\s/.test(text[j])) j++;
  const enLit = readLiteral(text, j);
  if (!enLit) return null;
  return { am: decodeLiteral(amLit.raw), en: decodeLiteral(enLit.raw), end: enLit.end };
}

/** All `lang === 'am'` style guard offsets on a line. */
function guardOffsets(line) {
  const out = [];
  const re = /(?:\b(?:lang|l|language)\s*===\s*(['"])am\1|\blang\s*!==\s*(['"])en\2|\bam\s*===\s*lang\b|\blang\s*===\s*am\b)/g;
  for (const m of line.matchAll(re)) out.push({ index: m.index, end: m.index + m[0].length });
  return out;
}

/** `t('EN', 'AM')` calls. */
function tHelperPairs(line) {
  const out = [];
  const re = /(^|[^\w.])t\(/g;
  for (const m of line.matchAll(re)) {
    let i = m.index + m[0].length;
    while (/\s/.test(line[i])) i++;
    const a = readLiteral(line, i);
    if (!a) continue;
    let j = a.end + 1;
    while (/\s/.test(line[j])) j++;
    if (line[j] !== ',') continue;
    j++;
    while (/\s/.test(line[j])) j++;
    const b = readLiteral(line, j);
    if (!b) continue;
    const en = decodeLiteral(a.raw);
    const am = decodeLiteral(b.raw);
    if (ETHIOPIC.test(am) || ETHIOPIC.test(en)) out.push({ en, am, kind: 't-helper' });
  }
  return out;
}

/** `{ en: '..', am: '..' }` in either key order, plus `nameAm` data rows. */
function objectPairs(line) {
  const out = [];
  const grab = (key) => {
    const re = new RegExp(`\\b${key}\\s*:\\s*`, 'g');
    for (const m of line.matchAll(re)) {
      const lit = readLiteral(line, m.index + m[0].length);
      if (lit) return decodeLiteral(lit.raw);
    }
    return null;
  };
  const en = grab('en');
  const am = grab('am');
  if (en !== null && am !== null && (ETHIOPIC.test(en) || ETHIOPIC.test(am))) {
    out.push({ en, am, kind: 'locale-object' });
  }
  const name = grab('name');
  const nameAm = grab('nameAm');
  if (name !== null && nameAm !== null) out.push({ en: name, am: nameAm, kind: 'data-row' });
  return out;
}

/** Every Amharic literal on the line, with its char span. */
function amharicLiterals(line) {
  const out = [];
  for (let i = 0; i < line.length; i++) {
    if (!/['"`]/.test(line[i])) continue;
    const lit = readLiteral(line, i);
    if (!lit) continue;
    const val = decodeLiteral(lit.raw);
    if (ETHIOPIC.test(val)) out.push({ value: val, from: i, to: lit.end + 1 });
    i = lit.end;
  }
  return out;
}

/** Assign a review status. Corruption always wins over provenance. */
function classify(am, file) {
  const broken = brokenReason(am);
  if (broken) return { status: '[NEEDS-FIX]', reason: broken };
  if (file === CENTRAL.grouped) return { status: '[DRAFT-REVIEWED-PENDING]', reason: null };
  if (LABEL_FILES.has(file)) return { status: '[DRAFT-REVIEWED-PENDING]', reason: null };
  return { status: '[NEVER-REVIEWED]', reason: null };
}

function mk(file, line, code, en, am, kind, cls) {
  return {
    file, line, code, en, am, kind,
    status: cls.status,
    reason: cls.reason ? `${cls.reason.token} — ${cls.reason.note}` : null,
    screen: screenFor(file),
  };
}

module.exports = {
  readLiteral, ternaryAt, amharicLiterals, objectPairs, tHelperPairs, guardOffsets,
};

