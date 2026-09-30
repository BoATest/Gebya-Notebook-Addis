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
const ethiopicRe = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;

const findings = [];

files.forEach(file => {
  const norm = file.replace(/\\/g, '/');
  // Skip dictionaries.js and labels folder from this specific search as we already have them mapped
  if (norm.includes('src/context/dictionaries.js') || 
      norm.includes('src/labels/') || 
      norm.includes('src/components/settings/groupedLabels.js')) {
    return;
  }

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((l, idx) => {
    if (ethiopicRe.test(l)) {
      findings.push({
        file: norm,
        line: idx + 1,
        code: l.trim()
      });
    }
  });
});

console.log('Total non-centralized Ethiopic lines:', findings.length);

// Analyze common patterns:
// 1. Ternary: lang === 'am' ? '...' : '...'
// 2. Object: { en: '...', am: '...' }
// 3. Raw JSX text or string literal: '...' or >...<
let ternaries = 0;
let objects = 0;
let others = 0;

findings.forEach(f => {
  if (/lang\s*===\s*['"]am['"]|lang\s*!==\s*['"]am['"]|\bl\s*===\s*['"]am['"]/.test(f.code)) {
    ternaries++;
  } else if (/\{\s*en\s*:|am\s*:/.test(f.code)) {
    objects++;
  } else {
    others++;
  }
});

console.log({ ternaries, objects, others });

// Group by file
const fileGroups = {};
findings.forEach(f => {
  fileGroups[f.file] = (fileGroups[f.file] || 0) + 1;
});

const sortedFiles = Object.entries(fileGroups).sort((a,b) => b[1] - a[1]);
console.log('Top files:');
sortedFiles.slice(0, 30).forEach(([f, count]) => console.log(`${count}: ${f}`));
