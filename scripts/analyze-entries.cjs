const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) res = res.concat(walk(p));
    else if (/\.(jsx?|tsx?)$/.test(item)) res.push(p);
  }
  return res;
}

const files = walk('artifacts/gebya/src');
const dictModule = require('../artifacts/gebya/src/context/dictionaries.js');

// Known reviewed sets:
// 1. dictionaries.js (AM: 406 keys, AM_OVERRIDES: 528 keys)
// 2. labels (onboarding, settings, transactions, shared)
// 3. groupedLabels.js (draft reviewed pending)
// 4. NEW_AMHARIC_STRINGS.md items
// 5. Corruptions / mojibake / insults ([NEEDS-FIX])

const parsedDict = require('./parse-dictionaries.cjs'); // enDict, amDict, enOverrides, amOverrides
