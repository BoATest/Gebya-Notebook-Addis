const fs = require('fs');

function inspectFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=== ${filePath} (lines: ${lines.length}) ===`);
  lines.forEach((l, i) => {
    if (l.includes('{ en:') || l.includes('am:')) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
}

inspectFile('artifacts/gebya/src/labels/onboarding.js');
inspectFile('artifacts/gebya/src/labels/settings.js');
inspectFile('artifacts/gebya/src/labels/shared.js');
inspectFile('artifacts/gebya/src/labels/transactions.js');
inspectFile('artifacts/gebya/src/components/settings/groupedLabels.js');
