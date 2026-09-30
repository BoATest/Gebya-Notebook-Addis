'use strict';
/**
 * audit/parse-dictionary.cjs
 * Parses artifacts/gebya/src/context/dictionaries.js into key records with
 * exact 1-based line anchors for the EN, AM, EN_OVERRIDES and AM_OVERRIDES maps.
 */
const fs = require('fs');
const { SRC, decodeLiteral } = require('./common.cjs');

const KEY_LINE = /^\s*([A-Za-z_$][\w$]*)\s*:\s*(['"`])((?:\\.|(?!\2)[\s\S])*)\2\s*,?\s*$/;

const DAY_EN = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };
const DAY_AM = { sun: 'እሁድ', mon: 'ሰኞ', tue: 'ማክሰኞ', wed: 'ረቡዕ', thu: 'ሐሙስ', fri: 'አርብ', sat: 'ቅዳሜ' };

function parseDictionary() {
  const file = `${SRC}/context/dictionaries.js`;
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  const blocks = {
    EN: { from: 0, to: 431 },
    AM: { from: 442, to: 863 },
    EN_OVERRIDES: { from: 864, to: 1072 },
    AM_OVERRIDES: { from: 1073, to: 1674 },
  };

  const maps = {};
  for (const [name, b] of Object.entries(blocks)) {
    const map = new Map();
    for (let i = b.from; i < b.to; i++) {
      const m = lines[i].match(KEY_LINE);
      if (m && !map.has(m[1])) map.set(m[1], { line: i + 1, value: decodeLiteral(m[3]) });
    }
    maps[name] = map;
  }

  // Weekday keys sit inside a nested object and do not match KEY_LINE.
  for (const d of Object.keys(DAY_EN)) {
    if (!maps.EN.has(d)) maps.EN.set(d, { line: 167, value: DAY_EN[d] });
    if (!maps.AM.has(d)) maps.AM.set(d, { line: 606, value: DAY_AM[d] });
  }

  const keys = new Set([
    ...maps.EN.keys(), ...maps.AM.keys(),
    ...maps.EN_OVERRIDES.keys(), ...maps.AM_OVERRIDES.keys(),
  ]);

  const records = [...keys].sort().map((key) => {
    const baseEn = maps.EN.get(key) || null;
    const baseAm = maps.AM.get(key) || null;
    const overEn = maps.EN_OVERRIDES.get(key) || null;
    const overAm = maps.AM_OVERRIDES.get(key) || null;
    return {
      key,
      en: overEn || baseEn,
      am: overAm || baseAm,
      baseEn, baseAm, overEn, overAm,
      origin: [baseEn && 'EN', overEn && 'EN_OVERRIDES', baseAm && 'AM', overAm && 'AM_OVERRIDES']
        .filter(Boolean).join(' + '),
      // An override that changes the base value is a revision, not a duplicate.
      revised: Boolean(baseAm && overAm && baseAm.value !== overAm.value),
      amAddedByOverride: Boolean(overAm && !baseAm),
      enAddedByOverride: Boolean(overEn && !baseEn),
    };
  });

  return { file, maps, records, counts: Object.fromEntries(Object.entries(maps).map(([k, m]) => [k, m.size])) };
}

module.exports = { parseDictionary };
