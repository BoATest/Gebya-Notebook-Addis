// Script to add itemized-page features to TransactionForm sale branch
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'TransactionForm.jsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find all occurrences of the comment markers
let phoneCommentIndices = [];
let dueDateCommentIndices = [];

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed === '{/* Phone */}') {
    phoneCommentIndices.push(i);
  }
  if (trimmed === '{/* Due date */}') {
    dueDateCommentIndices.push(i);
  }
}

console.log('Phone comment indices:', phoneCommentIndices);
console.log('Due date comment indices:', dueDateCommentIndices);

// The first Phone comment (index 402) is in the credit section of the sale branch
// The second Phone comment (index 675) is in the expense/credit branch
// The first Due date comment (index 494) is in the partial section of the sale branch
// The second Due date comment (index 690) is in the expense/credit branch

const creditPhoneIdx = phoneCommentIndices[0]; // Credit section in sale branch
let partialDueDateIdx = dueDateCommentIndices[0]; // Partial section in sale branch

console.log('Credit Phone comment at line (0-indexed):', creditPhoneIdx);
console.log('Partial Due date comment at line (0-indexed):', partialDueDateIdx);

// The features block to insert
const featuresLines = [
  '',
  '            {/* Recent credit customers — quick-select chips (matches ItemizedSaleView) */}',
  '            {!customerQuery && !customerMatch && recentCreditCustomers.length > 0 && (',
  '              <div className="flex flex-wrap gap-1.5 mt-1.5">',
  '                {recentCreditCustomers.map(c => (',
  '                  <button',
  '                    key={c.id}',
  '                    type="button"',
  '                    onClick={() => { setCustomerMatch(c); setCustomerQuery(c.display_name || c.name || \'\'); }}',
  '                    className="px-2.5 py-1.5 text-[11px] font-bold border press-scale"',
  '                    style={{ borderColor: \'#edeae5\', borderRadius: \'var(--radius-sm)\', minHeight: \'34px\', background: \'#fff\' }}',
  '                  >',
  '                    {c.display_name || c.name}',
  '                  </button>',
  '                ))}',
  '              </div>',
  '            )}',
  '',
  '            {/* Customer summary when selected (matches ItemizedSaleView) */}',
  '            {customerMatch && (',
  '              <div className="flex items-center gap-2 px-2.5 py-1.5 mt-1.5" style={{ background: \'rgba(22,163,74,0.06)\', borderRadius: \'var(--radius-sm)\', minHeight: \'34px\' }}>',
  '                <span className="text-[13px] font-bold flex-1">{customerMatch.display_name || customerMatch.name}</span>',
  '                {customerMatch.phone && <span className="text-[10px]" style={{ color: \'#6b7280\' }}>{customerMatch.phone}</span>}',
  '                <button',
  '                  type="button"',
  '                  onClick={() => { setCustomerMatch(null); setCustomerQuery(\'\'); }}',
  '                  className="text-[12px] font-bold press-scale px-1" style={{ color: \'#9ca3af\', minHeight: \'30px\' }}',
  '                >',
  '                  ✕',
  '                </button>',
  '              </div>',
  '            )}',
  '',
  '            {/* Previous balance (matches ItemizedSaleView) */}',
  '            {customerMatch && (',
  '              <div className="mt-1.5">',
  '                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: \'#6b7280\' }}>',
  '                  {lang === \'am\' ? \'የቀድሞ ዱቤ\' : \'Previous balance\'}',
  '                </span>',
  '                <div className="text-[11px] font-bold" style={{ color: \'#C4883A\' }}>',
  '                  {fmt(customerMatch.balance || 0)} {lang === \'am\' ? \'ብር\' : \'birr\'}',
  '                </div>',
  '              </div>',
  '            )}',
];

// Insert features into credit section (before the Phone comment)
if (creditPhoneIdx >= 0) {
  lines.splice(creditPhoneIdx, 0, ...featuresLines);
  console.log('Credit section: features inserted at line', creditPhoneIdx);
  // Update the partial index since we inserted lines
  partialDueDateIdx += featuresLines.length;
} else {
  console.log('WARNING: Credit section Phone comment not found!');
}

// Insert features into partial section (before the Due date comment)
if (partialDueDateIdx >= 0) {
  lines.splice(partialDueDateIdx, 0, ...featuresLines);
  console.log('Partial section: features inserted at line', partialDueDateIdx);
} else {
  console.log('WARNING: Partial section Due date comment not found!');
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('TransactionForm.jsx updated!');
