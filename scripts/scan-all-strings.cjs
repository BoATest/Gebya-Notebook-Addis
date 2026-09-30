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
console.log('Total files scanned in artifacts/gebya/src:', files.length);

const ethiopicRe = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;

const inventory = [];

for (const file of files) {
  const norm = file.replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((lineText, idx) => {
    if (ethiopicRe.test(lineText)) {
      inventory.push({
        file: norm,
        line: idx + 1,
        raw: lineText.trim()
      });
    }
  });
}

console.log('Total Ethiopic lines found:', inventory.length);
fs.writeFileSync('scripts/inventory-raw.json', JSON.stringify(inventory, null, 2));
