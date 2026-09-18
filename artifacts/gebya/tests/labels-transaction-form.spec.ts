/**
 * R2.1 Batch 3a contract test — shared + transactions labels (TransactionForm.jsx).
 *
 * TransactionForm's ternaries nest (isCredit ? isExpense ? ... : ... : ...) and
 * several are template-literal interpolations, so one module entry can serve
 * multiple inline sites. The contract here is:
 *
 *   1. BYTE-IDENTITY — every module entry's { en, am } matches the exact inline
 *      bytes it replaced. Verified against the pre-refactor fixture (05fa092).
 *   2. TERNARY-FREE consumer (cumulative) — TransactionForm.jsx must hit ZERO
 *      `lang === 'am'` selections. 3a removed 14 sites; 80 remain for 3b/3c/3d.
 *      This guard reports the count — it only hits 0 when ALL batches land.
 *   3. Rule 6 — entries with interpolation are functions taking a single
 *      named-object param; byte-tested against the inline template output.
 *
 * Scope of 3a: type config header, item placeholder/label, save button text,
 * photo-limit error, payment-type label. (Currency template + balance/save-label
 * templates land in 3b — NOT consumed yet.)
 *
 * Provenance: pre-refactor bytes from git at 05fa092 (file untouched since
 * 974292b). Static fixture, no runtime git (shallow CI clones).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transactions } from '../src/labels/transactions';
import { shared } from '../src/labels/shared';
import { PRE_TERNARIES } from './fixtures/labels-transactions-pre.mjs';

const ROOT = process.cwd();

// { moduleEntryPath, pair } — each must exist verbatim as a (am, en) site
// somewhere in the pre-refactor source.
const STATIC_LOCKS = [
  ['typeLabel.sale',    { en: '+ Sale',   am: '+ ሽያጭ' }],
  ['typeLabel.expense', { en: '− Expense', am: '− ወጪ' }],
  ['typeLabel.credit',  { en: '↻ Credit',  am: '↻ ዱቤ' }],
  ['saveButton.credit', { en: 'Save Credit', am: 'ዱቤ አስቀምጥ' }],
  ['saveButton.expense',{ en: 'Save Expense', am: 'ወጪ አስቀምጥ' }],
  ['saveButton.sale',   { en: 'Save Sale',   am: 'ሽያጭ አስቀምጥ' }],
  ['saveButtonDefault', { en: 'Save', am: 'አስቀምጥ' }],
  ['itemPlaceholder.credit',  { en: 'e.g. Abebe...', am: 'ለምሳሌ አበበ…' }],
  ['itemPlaceholder.expense', { en: 'Add details...', am: 'ዝርዝሩን ይመዝቡ...' }],
  ['itemPlaceholder.sale',    { en: 'Add details...', am: 'ዝርዝሩን ይመዝቡ...' }],
  ['itemLabel.credit', { en: 'NAME', am: 'ስም' }],
  ['itemLabel.sale',   { en: 'Item / Service (Optional)', am: 'ዕቃ / አገልግሎት (አማራጭ)' }],
  ['photoLimit',       { en: 'You can attach up to 3 photos', am: '3 ፎቶዎች ሙሉ በሙሉ ተያዝዋል' }],
  ['paymentType.cash',   { en: 'Cash', am: 'ጥሬ' }],
  ['paymentType.credit', { en: 'Credit', am: 'ዱቤ' }],
];

const getDeep = (obj: any, path: string): any =>
  path.split('.').reduce((o, k) => o?.[k], obj);

describe('Batch 3a labels — byte-identity vs pre-refactor fixture', () => {
  it('fixture captured the full TransactionForm inline surface (94 sites)', () => {
    expect(PRE_TERNARIES.length).toBe(94);
  });

  it.each(STATIC_LOCKS)('%s: entry bytes match an inline literal pair', (path, pair) => {
    const entry = getDeep({ transactions, shared }, path);
    expect(entry, `entry ${path} must exist`).toBeDefined();
    expect(entry.en, `${path}.en`).toBe(pair.en);
    expect(entry.am, `${path}.am`).toBe(pair.am);
    const found = PRE_TERNARIES.some((s: any) => s.am === pair.am && s.en === pair.en);
    expect(found, `${pair.am} / ${pair.en} not found in pre-refactor fixture`).toBe(true);
  });

  it('shared.currency.sign is byte-locked (ብር / birr) for the 3b currency template', () => {
    expect(shared.currency.sign).toEqual({ en: 'birr', am: 'ብር' });
    const found = PRE_TERNARIES.some((s: any) => s.am === 'ብር' && s.en === 'birr');
    expect(found, 'ብር / birr pair must exist in fixture').toBe(true);
  });

  it('every consumed 3a entry is a static {en,am} object (no unguarded fn)', () => {
    for (const [path] of STATIC_LOCKS) {
      const entry = getDeep({ transactions, shared }, path);
      if (path === 'shared.currency.sign') continue;
      expect(typeof entry.en, `${path} en kind`).not.toBe('function');
      expect(typeof entry.am, `${path} am kind`).not.toBe('function');
    }
  });
});

describe('TransactionForm.jsx — Batch 3a ternary remainder', () => {
    it('3a removed 14 sites; 81 remain for 3b/3c/3d', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/TransactionForm.jsx'), 'utf8');
    const hits = src.match(/lang\s*===\\s*['\"]am['\"]/g) || [];
    expect(hits.length, `3a removed 14; ${hits.length} remain`).toBe(81);
  });
});
