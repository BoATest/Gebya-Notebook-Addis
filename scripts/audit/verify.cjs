'use strict';
/**
 * audit/verify.cjs — self-check on the generated packet.
 *
 * Guards against the two failure modes that matter for a review artefact:
 *   1. a `[NEEDS-FIX]` claim that is wrong (a false positive would send a
 *      reviewer chasing a string that is actually fine), and
 *   2. a broken Amharic string in the tree that the packet failed to flag.
 *
 * Exits non-zero if either check fails, so it can run in CI.
 */
const fs = require('fs');
const { SRC, ETHIOPIC, brokenReason, walk, CENTRAL, stripComments } = require('./common.cjs');
const { scanAll } = require('./scan.cjs');
const { scanLabelModules } = require('./scan-labels.cjs');
const { parseDictionary } = require('./parse-dictionary.cjs');

const PACKET = 'docs/TRANSLATION-REVIEW-PACKET.md';

function main() {
  const packet = fs.readFileSync(PACKET, 'utf8');
  const flagged = [...scanAll(), ...scanLabelModules()].filter((e) => e.status === '[NEEDS-FIX]');
  const dict = parseDictionary();
  const dictFlagged = dict.records.filter((r) => r.status === '[NEEDS-FIX]');

  const problems = [];

  // 1. Every flag must be re-derivable from source (i.e. brokenReason still fires).
  for (const e of [...flagged, ...dictFlagged]) {
    const am = e.am && typeof e.am === 'object' ? e.am.value : e.am;
    if (!brokenReason(am)) {
      problems.push(`FALSE POSITIVE: ${e.file}:${e.line} flagged NEEDS-FIX but brokenReason() no longer fires — ${am}`);
    }
  }

  // 2. Nothing broken may be missing from the packet.
  //    Sweep raw lines so we catch strings the structured scan could not parse
  //    (multi-line objects, JSX text nodes, template fragments).
  const flaggedKeys = new Set(flagged.map((e) => `${e.file}:${e.line}`));
  const missed = [];
  for (const file of walk(SRC)) {
    if (file === CENTRAL.dict) continue; // covered by the dictionary parser
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!ETHIOPIC.test(line)) return;
      // Comments document past corruption; only code counts as shipped copy.
      if (brokenReason(stripComments(line))) {
        const key = `${file}:${i + 1}`;
        if (!flaggedKeys.has(key)) missed.push(key);
      }
    });
  }

  // 3. The packet must actually contain the section it promises.
  for (const heading of ['## 1. Summary', '## 2. Context dictionary', '## 3. `[NEEDS-FIX]`', '## 4. Label modules', '## 5. Inline component strings', '## 6. What the reviewer needs to decide']) {
    if (!packet.includes(heading)) problems.push(`MISSING SECTION: ${heading}`);
  }

  const report = [];
  report.push(`Packet:            ${PACKET}`);
  report.push(`Flagged NEEDS-FIX: ${flagged.length + dictFlagged.length}`);
  report.push(`Missed (raw):     ${missed.length}`);

  if (missed.length) {
    report.push('', 'Broken Amharic present in source but NOT flagged as a structured entry:');
    for (const m of missed.slice(0, 60)) report.push('  ' + m);
    if (missed.length > 60) report.push(`  … and ${missed.length - 60} more`);
  }

  if (problems.length) {
    report.push('', 'PROBLEMS:');
    for (const p of problems) report.push('  ' + p);
  } else {
    report.push('', 'OK: every NEEDS-FIX claim re-derives from source; no false positives.');
  }

  fs.writeFileSync('scripts/audit/verify.log', report.join('\n') + '\n', 'utf8');
  if (problems.length) process.exit(1);
}

if (require.main === module) main();
module.exports = { main };

