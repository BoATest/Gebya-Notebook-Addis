const fs = require('fs');
const dict = fs.readFileSync('artifacts/gebya/src/context/dictionaries.js', 'utf8');
const lines = dict.split('\n');

// 1. EN dictionary (lines 1 to 431)
const enDict = {};
for (let i = 0; i < 431; i++) {
  const line = lines[i];
  const m = line.match(/^\s*(\w+)\s*:\s*(['"`])(.*)\2\s*,?\s*$/);
  if (m) {
    enDict[m[1]] = { line: i + 1, val: m[3] };
  }
}

// 2. AM dictionary (lines 443 to 863)
const amDict = {};
for (let i = 442; i < 863; i++) {
  const line = lines[i];
  const m = line.match(/^\s*(\w+)\s*:\s*(['"`])(.*)\2\s*,?\s*$/);
  if (m) {
    amDict[m[1]] = { line: i + 1, val: m[3] };
  }
}

// Check weekdays on line 167 (EN) and line 606 (AM)
// sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat'
const daysEn = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const daysAmVals = { sun: 'እሁድ', mon: 'ሰኞ', tue: 'ማክሰኞ', wed: 'ረቡዕ', thu: 'ሐሙስ', fri: 'አርብ', sat: 'ቅዳሜ' };
const daysEnVals = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };
daysEn.forEach(d => {
  if (!enDict[d]) enDict[d] = { line: 167, val: daysEnVals[d] };
  if (!amDict[d]) amDict[d] = { line: 606, val: daysAmVals[d] };
});

// 3. EN_OVERRIDES (lines 865 to 1072)
const enOverrides = {};
for (let i = 864; i < 1072; i++) {
  const line = lines[i];
  const m = line.match(/^\s*(\w+)\s*:\s*(['"`])(.*)\2\s*,?\s*$/);
  if (m) {
    enOverrides[m[1]] = { line: i + 1, val: m[3] };
  }
}

// 4. AM_OVERRIDES (lines 1074 to 1674)
const amOverrides = {};
for (let i = 1073; i < 1674; i++) {
  const line = lines[i];
  const m = line.match(/^\s*(\w+)\s*:\s*(['"`])(.*)\2\s*,?\s*$/);
  if (m) {
    if (!amOverrides[m[1]]) {
      amOverrides[m[1]] = { line: i + 1, val: m[3] };
    }
  }
}

console.log('enDict:', Object.keys(enDict).length);
console.log('amDict:', Object.keys(amDict).length);
console.log('enOverrides:', Object.keys(enOverrides).length);
console.log('amOverrides:', Object.keys(amOverrides).length);

// Compare with exported modules
const dictModule = require('../artifacts/gebya/src/context/dictionaries.js');
console.log('dictModule.EN:', Object.keys(dictModule.EN).length);
console.log('dictModule.AM:', Object.keys(dictModule.AM).length);
console.log('dictModule.EN_OVERRIDES:', Object.keys(dictModule.EN_OVERRIDES).length);
console.log('dictModule.AM_OVERRIDES:', Object.keys(dictModule.AM_OVERRIDES).length);

// Find any keys in dictModule not captured by our parse
const missingInEn = Object.keys(dictModule.EN).filter(k => !enDict[k]);
const missingInAm = Object.keys(dictModule.AM).filter(k => !amDict[k]);
const missingInEnOver = Object.keys(dictModule.EN_OVERRIDES).filter(k => !enOverrides[k]);
const missingInAmOver = Object.keys(dictModule.AM_OVERRIDES).filter(k => !amOverrides[k]);

console.log('Missing in enDict parse:', missingInEn);
console.log('Missing in amDict parse:', missingInAm);
console.log('Missing in enOverrides parse:', missingInEnOver);
console.log('Missing in amOverrides parse:', missingInAmOver);
