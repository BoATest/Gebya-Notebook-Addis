'use strict';
/**
 * audit/scan.cjs — walks every UI source file and emits translatable entries
 * with `file:line` anchors. Deduplicates: a literal consumed by a paired
 * extraction (ternary / t-helper / locale object) is not also reported as a
 * one-sided Amharic literal.
 */
const fs = require('fs');
const { ETHIOPIC, CENTRAL, walk, screenFor, brokenReason, CENTRAL_FILES, LABEL_FILES, stripComments } = require('./common.cjs');
const { readLiteral, ternaryAt, amharicLiterals, objectPairs, tHelperPairs, guardOffsets } = require('./parse-inline.cjs');

function classify(am, file) {
  const broken = brokenReason(am);
  if (broken) return { status: '[NEEDS-FIX]', reason: `${broken.token} — ${broken.note}` };
  if (file === CENTRAL.grouped || LABEL_FILES.has(file)) {
    return { status: '[DRAFT-REVIEWED-PENDING]', reason: null };
  }
  return { status: '[NEVER-REVIEWED]', reason: null };
}

function entry(file, line, code, en, am, kind) {
  const cls = classify(am, file);
  return {
    file, line, code, en, am, kind,
    status: cls.status,
    reason: cls.reason,
    screen: screenFor(file),
  };
}

function scanAll() {
  const out = [];
  for (const file of walk('artifacts/gebya/src')) {
    if (file === CENTRAL.dict) continue; // dictionary is parsed separately
    const lines = fs.readFileSync(file, 'utf8').split('\n');

    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      if (!ETHIOPIC.test(raw)) continue;
      // Comments mention broken tokens when documenting a past fix (e.g.
      // `// ⚠ MUST-FIX applied (was የይምት)`). Scan code only; keep the original
      // line for the reviewer's reference.
      const code = stripComments(raw);
      if (!ETHIOPIC.test(code)) continue;
      const lineNo = idx + 1;
      const consumed = []; // [from, to] spans already attributed to a pair
      const pairedAm = new Set();
      const pairedEn = new Set();

      // A. inline ternary
      for (const g of guardOffsets(code)) {
        const t = ternaryAt(code, g.end);
        if (!t) continue;
        consumed.push([g.end, t.end]);
        pairedAm.add(t.am);
        pairedEn.add(t.en);
        out.push(entry(file, lineNo, raw.trim(), t.en, t.am, 'inline-ternary'));
      }

      // C. t('EN', 'AM')
      for (const p of tHelperPairs(code)) {
        pairedAm.add(p.am);
        pairedEn.add(p.en);
        out.push(entry(file, lineNo, raw.trim(), p.en, p.am, 't-helper'));
      }

      // B / D. locale object and static data rows
      for (const p of objectPairs(code)) {
        pairedAm.add(p.am);
        pairedEn.add(p.en);
        out.push(entry(file, lineNo, raw.trim(), p.en, p.am, p.kind));
      }

      // E. one-sided Amharic literal
      for (const lit of amharicLiterals(code)) {
        if (pairedAm.has(lit.value) || pairedEn.has(lit.value)) continue;
        if (consumed.some(([a, b]) => lit.from >= a && lit.to <= b + 1)) continue;
        out.push(entry(file, lineNo, raw.trim(), null, lit.value, 'amharic-only'));
      }
    }
  }
  return out;
}

module.exports = { scanAll, classify, entry, CENTRAL_FILES };
