'use strict';
/**
 * audit/render.cjs — markdown rendering for the review packet.
 * Pure formatting: takes already-classified entries and emits the sheet.
 */
const { cell } = require('./common.cjs');

const STATUS_ORDER = ['[NEEDS-FIX]', '[DRAFT-REVIEWED-PENDING]', '[NEVER-REVIEWED]', '[VERIFIED]', '[ENGLISH-ONLY]'];

const STATUS_GLOSS = {
  '[NEEDS-FIX]': 'Objectively broken bytes. Re-derive the Amharic from the English anchor — **do not guess a reading**.',
  '[DRAFT-REVIEWED-PENDING]': 'Composed during R1/R2 and already on a shortlist in `NEW_AMHARIC_STRINGS.md` / `R2-LABELS-DRAFT.md`.',
  '[NEVER-REVIEWED]': 'Live in the UI with no dictionary backing and no documented review record.',
  '[VERIFIED]': 'Amharic matches a reviewed context-dictionary value verbatim.',
  '[ENGLISH-ONLY]': 'English string with no Amharic sibling — the Amharic UI falls back to English.',
};

function table(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  return rows.length ? [head, sep, body].join('\n') : `${head}\n${sep}\n| _(none)_ |${' |'.repeat(headers.length - 1)}`;
}

function anchor(e) {
  return `\`${e.file.replace('artifacts/gebya/', '')}:${e.line}\``;
}

function counts(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

function renderPacket(ctx) {
  const { dict, inline, labels, byStatus, byScreen, byKind, needsFix } = ctx;
  const L = [];

  L.push('# Translation Review Packet — Gebya Notebook');
  L.push('');
  L.push('**Scope:** every Amharic (Ge\'ez) user-facing string in `artifacts/gebya/src`, with its English anchor and a `file:line` reference.');
  L.push('');
  L.push('**What this is:** an audit sheet for owner + Merkato shopkeeper sign-off. It changes nothing.');
  L.push('');
  L.push('- No source file was modified to produce this document.');
  L.push('- No Amharic was composed, machine-translated, or "improved" — strings are reproduced byte-exactly as they exist in the tree.');
  L.push('- Where a string is broken, the packet says so and stops. The reviewer re-derives it from the English anchor.');
  L.push('');
  L.push('**How to regenerate:** `node scripts/audit/build.cjs`');
  L.push('');

  // ---------------------------------------------------------------- summary
  L.push('## 1. Summary');
  L.push('');
  L.push(`Total catalogued entries: **${ctx.all.length}**`);
  L.push('');
  L.push(table(['Review status', 'Entries', 'Meaning'], counts(byStatus).map(([k, v]) => [
    `\`${k}\``, String(v), cell(STATUS_GLOSS[k]),
  ])));
  L.push('');
  L.push('### By source shape');
  L.push('');
  L.push(table(['Shape', 'Entries'], counts(byKind).map(([k, v]) => [`\`${k}\``, String(v)])));
  L.push('');
  L.push('### By screen');
  L.push('');
  L.push(table(['Screen', 'Entries'], counts(byScreen).map(([k, v]) => [cell(k), String(v)])));
  L.push('');

  // ------------------------------------------------------------ dictionary
  L.push('## 2. Context dictionary (`src/context/dictionaries.js`)');
  L.push('');
  L.push(table(['Map', 'Keys', 'Source lines'], [
    ['`EN`', String(dict.counts.EN), '1–431'],
    ['`AM`', String(dict.counts.AM), '443–863'],
    ['`EN_OVERRIDES`', String(dict.counts.EN_OVERRIDES), '865–1072'],
    ['`AM_OVERRIDES`', String(dict.counts.AM_OVERRIDES), '1074–1674'],
  ]));
  L.push('');
  const revised = dict.records.filter((r) => r.revised);
  const amAdded = dict.records.filter((r) => r.amAddedByOverride);
  const enAdded = dict.records.filter((r) => r.enAddedByOverride);
  L.push(`- **${amAdded.length}** keys exist only in \`AM_OVERRIDES\` (not in base \`AM\`) — these are the newest additions and have had the least review time.`);
  L.push(`- **${enAdded.length}** keys exist only in \`EN_OVERRIDES\`.`);
  L.push(`- **${revised.length}** keys have an \`AM_OVERRIDES\` value that *differs* from the base \`AM\` value. These are deliberate revisions; each one is a term decision someone already made.`);
  L.push('');
  L.push('### 2.1 Keys revised by `AM_OVERRIDES` (base value → override)');
  L.push('');
  L.push(table(['Key', 'Base AM', 'Override AM', 'AM line'], sortByKey(revised).map((r) => [
    `\`${r.key}\``, cell(r.baseAm && r.baseAm.value), cell(r.overAm && r.overAm.value), r.overAm ? String(r.overAm.line) : '—',
  ])));
  L.push('');
  L.push('### 2.2 Keys added only by `AM_OVERRIDES`');
  L.push('');
  L.push(table(['Key', 'EN', 'AM', 'AM line'], sortByKey(amAdded).map((r) => [
    `\`${r.key}\``, cell(r.en && r.en.value), cell(r.am && r.am.value), r.am ? String(r.am.line) : '—',
  ])));
  L.push('');
  L.push('### 2.3 Dictionary entries with no Amharic value');
  L.push('');
  const noAm = dict.records.filter((r) => !r.am);
  L.push(noAm.length ? table(['Key', 'EN', 'EN line'], noAm.map((r) => [
    `\`${r.key}\``, cell(r.en && r.en.value), r.en ? String(r.en.line) : '—',
  ])) : '_No dictionary key lacks an Amharic value._');
  L.push('');

  // ------------------------------------------------------------- needs fix
  L.push('## 3. `[NEEDS-FIX]` — broken Amharic (highest priority)');
  L.push('');
  L.push('These strings are live in the shipped UI and are **not valid Amharic**. Each row gives the English anchor so the reviewer can re-derive the whole sentence — patching the broken word in place will not produce correct copy.');
  L.push('');
  L.push('> Owner instruction on record: *do NOT guess readings.* The intent is unrecoverable without a reviewer.');
  L.push('');
  if (needsFix.length) {
    const byFile = {};
    for (const e of needsFix) (byFile[e.file] = byFile[e.file] || []).push(e);
    for (const [file, list] of Object.entries(byFile).sort()) {
      L.push(`### \`${file.replace('artifacts/gebya/', '')}\` — ${list.length} occurrence${list.length === 1 ? '' : 's'}`);
      L.push('');
      L.push(table(['Anchor', 'Current Amharic (broken)', 'English anchor', 'Defect'], list.map((e) => [
        anchor(e), cell(e.am), cell(e.en), cell(e.reason),
      ])));
      L.push('');
    }
  } else {
    L.push('_No broken Amharic found._');
    L.push('');
  }

  // ---------------------------------------------------------------- labels
  L.push('## 4. Label modules (`src/labels/*`, `groupedLabels.js`)');
  L.push('');
  L.push('These modules are the extraction programme\'s controlled surface. `src/labels/*` entries are **byte-locked** by unit tests against the inline strings they replaced, so their wording is frozen but unratified. `groupedLabels.js` is a draft holding composed strings that are explicitly **not** approved.');
  L.push('');
  L.push(table(['Module', 'Entries', 'Status'], Object.entries(groupBy(labels, 'file')).map(([f, list]) => [
    `\`${f.replace('artifacts/gebya/', '')}\``, String(list.length), cell(uniqueStatuses(list)),
  ])));
  L.push('');
  L.push('### 4.1 Every label entry');
  L.push('');
  L.push(table(['Anchor', 'Status', 'English', 'Amharic', 'Raw source'], labels.map((e) => [
    anchor(e), e.status, cell(e.en), cell(e.am), cell(e.code),
  ])));
  L.push('');

  // -------------------------------------------------- inline unreviewed
  L.push('## 5. Inline component strings');
  L.push('');
  L.push('Every Amharic string rendered directly from a component, store or util — not from the dictionary. These are the bulk of the app\'s user-facing copy.');
  L.push('');
  L.push(table(['Shape', 'Entries', 'Note'], [
    ['`inline-ternary`', String(byKind['inline-ternary'] || 0), "`lang === 'am' ? '…' : '…'` — both halves live at the call site."],
    ['`t-helper`', String(byKind['t-helper'] || 0), "`t('EN', 'AM')` — the newer local helper; same problem, different syntax."],
    ['`locale-object`', String(byKind['locale-object'] || 0), '`{ en, am }` object literal at the call site.'],
    ['`data-row`', String(byKind['data-row'] || 0), 'Static data rows such as the bank list.'],
    ['`amharic-only`', String(byKind['amharic-only'] || 0), '**No English sibling on the line** — Amharic-only literal, or a template/interpolated string.'],
  ]));
  L.push('');
  L.push('### 5.1 Amharic-only strings (no English anchor on the line)');
  L.push('');
  L.push('These carry the most review risk: without an English sibling the reviewer must work from the surrounding code to know what the string is supposed to say.');
  L.push('');
  const amOnly = inline.filter((e) => e.kind === 'amharic-only');
  L.push(table(['Anchor', 'Status', 'Screen', 'Amharic', 'Raw source'], sortEntries(amOnly).map((e) => [
    anchor(e), e.status, cell(e.screen), cell(e.am), cell(e.code),
  ])));
  L.push('');
  L.push('### 5.2 Paired inline strings');
  L.push('');
  L.push(table(['Anchor', 'Status', 'Shape', 'Screen', 'English', 'Amharic'], sortEntries(inline.filter((e) => e.kind !== 'amharic-only')).map((e) => [
    anchor(e), e.status, `\`${e.kind}\``, cell(e.screen), cell(e.en), cell(e.am),
  ])));
  L.push('');

  // ------------------------------------------------------------ next steps
  L.push('## 6. What the reviewer needs to decide');
  L.push('');
  L.push('Ordered by blast radius, not by effort.');
  L.push('');
  L.push(table(['Priority', 'Work', 'Why'], [
    ['1', `Re-derive the ${needsFix.length} broken strings in section 3`,
      'Shipped UI shows non-Amharic to every Amharic user who signs in. The password surface alone is on the login path.'],
    ['2', `Ratify the ${labels.length} label entries in section 4`,
      'They are byte-locked by tests, so changing wording is a deliberate act with test fallout.'],
    ['3', `Settle terminology across the ${byKind['inline-ternary'] + (byKind['t-helper'] || 0)} inline pairs`,
      'The same English word is translated several different ways in different screens. This is the drift that only a human can settle.'],
    ['4', `Give the ${byKind['amharic-only'] || 0} Amharic-only strings an English anchor`,
      'No sibling means no review is possible. Either add the EN half or accept these as translator-owned copy.'],
    ['5', 'Decide register: Latin vs Ethiopic numerals in Amharic copy',
      'Already an open question in `R2-LABELS-DRAFT.md` for the unsynced-records block. It is not isolated to that block.'],
  ]));
  L.push('');
  L.push('## 7. Guard rails already in place');
  L.push('');
  L.push('| Check | Command | What it protects |');
  L.push('| --- | --- | --- |');
  L.push('| Script guard | `pnpm --filter gebya lint:i18n` | `check-i18n-chars.mjs` fails the build on any character outside ASCII + Ethiopic. This catches foreign-script slips (Bengali, Cyrillic, CJK) but **not** wrong Amharic, which is why this packet exists. |');
  L.push('| Label byte-identity | `tests/labels-*.spec.ts` | Freezes the exact bytes in `src/labels/*` so extraction cannot silently reword copy. |');
  L.push('| Design regression | `tests/design-regression-smoke.spec.ts` | Snapshot-level UI coverage. |');
  L.push('');
  L.push('---');
  L.push('');
  L.push('_Generated by `scripts/audit/build.cjs`. Reproduce with `node scripts/audit/build.cjs`._');

  return L.join('\n') + '\n';
}

function groupBy(list, key) {
  const out = {};
  for (const item of list) {
    const k = typeof key === 'function' ? key(item) : item[key];
    (out[k] = out[k] || []).push(item);
  }
  return out;
}

function uniqueStatuses(list) {
  return [...new Set(list.map((e) => e.status))].join(', ');
}

function sortEntries(list) {
  return [...list].sort((a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || String(a.en).localeCompare(String(b.en)));
}

function sortByKey(list) {
  return [...list].sort((a, b) => a.key.localeCompare(b.key));
}

module.exports = { renderPacket, table, anchor, counts, STATUS_ORDER, STATUS_GLOSS };
