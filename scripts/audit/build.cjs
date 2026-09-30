'use strict';
/**
 * audit/build.cjs — produces the anchored bilingual review packet.
 *
 * Outputs
 *   docs/TRANSLATION-REVIEW-PACKET.md   review sheet (no source is modified)
 *   scripts/audit/summary.json          machine-readable rollup
 *
 * Run:  node scripts/audit/build.cjs
 */
const fs = require('fs');
const { parseDictionary } = require('./parse-dictionary.cjs');
const { scanAll } = require('./scan.cjs');
const { scanLabelModules } = require('./scan-labels.cjs');
const { cell, brokenReason, screenFor, CENTRAL, ETHIOPIC } = require('./common.cjs');
const { renderPacket } = require('./render.cjs');

const OUT_MD = 'docs/TRANSLATION-REVIEW-PACKET.md';
const OUT_JSON = 'scripts/audit/summary.json';

const STATUS_ORDER = ['[NEEDS-FIX]', '[DRAFT-REVIEWED-PENDING]', '[NEVER-REVIEWED]', '[VERIFIED]'];

const STATUS_GLOSS = {
  '[NEEDS-FIX]': 'Objectively broken bytes. A human must re-derive the Amharic from the English anchor. **Do not guess a reading.**',
  '[DRAFT-REVIEWED-PENDING]': 'Amharic was composed during R1/R2 and is already on a review shortlist in `docs/NEW_AMHARIC_STRINGS.md` or `docs/R2-LABELS-DRAFT.md`.',
  '[NEVER-REVIEWED]': 'Live in the UI, no dictionary backing, no documented review record. Treated as unreviewed pending owner sign-off.',
  '[VERIFIED]': 'Present in the reviewed context dictionary (`AM` / `AM_OVERRIDES`).',
  '[ENGLISH-ONLY]': 'English string with no Amharic sibling — the Amharic UI falls back to English here.',
};

function countBy(list, key) {
  const out = {};
  for (const item of list) {
    const k = typeof key === 'function' ? key(item) : item[key];
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function table(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `|${headers.map(() => '---').join('|')}|`;
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  return [head, sep, body].join('\n');
}

function sortEntries(list) {
  return [...list].sort((a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || String(a.en).localeCompare(String(b.en)));
}

function main() {
  const dict = parseDictionary();
  const inline = sortEntries(scanAll());
  const labels = sortEntries(scanLabelModules());

  // An inline Amharic string that matches a dictionary value verbatim is
  // dictionary-backed vocabulary, so it is treated as verified rather than as
  // a fresh composition.
  const dictAm = new Set();
  for (const rec of dict.records) if (rec.am) dictAm.add(rec.am.value);
  for (const e of inline) {
    if (e.status === '[NEEDS-FIX]') continue;
    if (e.am && dictAm.has(e.am)) { e.status = '[VERIFIED]'; e.dictBacked = true; }
    else if (e.status === '[NEVER-REVIEWED]') e.dictBacked = false;
  }
  for (const e of labels) if (!e.reason) e.dictBacked = Boolean(e.am && dictAm.has(e.am));

  // Dictionary layer statuses.
  for (const rec of dict.records) {
    if (!rec.am) { rec.status = '[ENGLISH-ONLY]'; rec.reason = null; continue; }
    const broken = brokenReason(rec.am.value);
    if (broken) { rec.status = '[NEEDS-FIX]'; rec.reason = `${broken.token} — ${broken.note}`; continue; }
    rec.status = '[VERIFIED]';
    rec.reason = null;
  }

  const all = [...inline, ...labels, ...dict.records.map((r) => ({ ...r, screen: 'Context dictionaries (global)' }))];
  const byStatus = countBy(all, 'status');
  const byScreen = countBy(all, 'screen');
  const byKind = countBy(all, (e) => e.kind || 'dictionary-key');
  const needsFix = sortEntries([...inline, ...labels].filter((e) => e.status === '[NEEDS-FIX]'));

  const md = renderPacket({ dict, inline, labels, byStatus, byScreen, byKind, needsFix, all });
  fs.writeFileSync(OUT_MD, md, 'utf8');

  fs.writeFileSync(OUT_JSON, JSON.stringify({
    generatedFor: 'Gebya Notebook — bilingual (EN/AM) string audit',
    dictionaryCounts: dict.counts,
    dictionaryRecords: dict.records.length,
    inlineEntries: inline.length,
    labelEntries: labels.length,
    byStatus, byKind, byScreen,
    needsFixCount: needsFix.length,
  }, null, 2), 'utf8');

  console.log(`Wrote ${OUT_MD}`);
  console.log(`Wrote ${OUT_JSON}`);
  console.log('Total entries:', all.length);
  console.log('By status:', byStatus);
  console.log('Needs-fix anchors:', needsFix.length);
}

module.exports = { main };

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
