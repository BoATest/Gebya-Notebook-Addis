/**
 * R2.1 pilot contract test — settings.* labels (ReadinessHero + PlanPanel).
 *
 * Locks:
 *   1. Shape contract — every entry is { en, am }; values are plain strings
 *      or parameterized functions (extraction rule 2), nothing else.
 *   2. BYTE-IDENTITY — each entry equals the exact inline string it replaced
 *      (the originals below are copied verbatim from the pre-refactor files;
 *      zero term decisions).
 *   3. The consumers contain ZERO `lang === 'am'` ternaries — the per-batch
 *      report requirement, enforced mechanically instead of by grep-by-hand.
 *   4. The parameterized entry reproduces the template bytes for both locales.
 *
 * PROVENANCE: fixtures captured from 216ab40^ (the PRE-refactor files). A
 * one-off audit (2026-09-17, git show read byte-faithfully inside node)
 * compared every (en, am) entry pair set-wise: 27/27 static pairs identical
 * + the progressOf template pair reproduced — zero added, zero missing.
 * The locks are static on purpose: CI runs shallow clones, so nothing here
 * reads git at runtime.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LABELS } from '../src/labels';
import { settings } from '../src/labels/settings';

// vitest runs with the package root as cwd (see vitest.config.ts include).
const ROOT = process.cwd();

function walkEntries(node, path = '') {
  // Returns [path, entry] for every { en, am } leaf.
  const out = [];
  if (Array.isArray(node)) {
    node.forEach((v, i) => out.push(...walkEntries(v, `${path}[${i}]`)));
    return out;
  }
  if (node && typeof node === 'object' && ('en' in node || 'am' in node)) {
    out.push([path, node]);
    return out;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) out.push(...walkEntries(v, path ? `${path}.${k}` : k));
  }
  return out;
}

describe('labels module contract (R2.1 pilot: settings.*)', () => {
  it('every entry is { en, am } with string-or-function values', () => {
    const entries = walkEntries(settings);
    expect(entries.length).toBeGreaterThan(20);
    for (const [path, entry] of entries) {
      expect(Object.keys(entry).sort(), path).toEqual(['am', 'en']);
      expect(typeof entry.en === 'string' || typeof entry.en === 'function', `${path}.en`).toBe(true);
      expect(typeof entry.am === 'string' || typeof entry.am === 'function', `${path}.am`).toBe(true);
      // A parameterized entry is parameterized in BOTH locales or neither.
      expect(typeof entry.en, `${path} locale-kind parity`).toBe(typeof entry.am);
      // Rule 6 (Batch 2 ruling): function entries take at most ONE parameter —
      // a single named object when there are multiple interpolations. A
      // positional multi-arg function is rejected mechanically.
      if (typeof entry.en === 'function') {
        expect(entry.en.length, `${path} rule-6 arity`).toBeLessThanOrEqual(1);
        expect(entry.am.length, `${path} rule-6 arity`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('registry exposes live namespaces; queued ones are not yet present', () => {
    expect(Object.keys(LABELS).sort()).toEqual(['onboarding', 'settings']);
  });

  it('BYTE-IDENTITY: readiness entries equal the exact inline originals', () => {
    const r = settings.readiness;
    expect(r.setName).toEqual({ en: 'Set shop name', am: 'የሱቅ ስም ያስገቡ' });
    expect(r.setPhone).toEqual({ en: 'Add shop phone number', am: 'የስልክ ቁጥር ያስገቡ' });
    expect(r.setUpChannel).toEqual({ en: 'Set up a payment channel', am: 'የክፍያ መንገድ ያዋቅሩ' });
    expect(r.addItems).toEqual({ en: 'Add items to catalog', am: 'እቃዎች ያስገቡ' });
    expect(r.addRecurring).toEqual({ en: 'Add recurring expenses', am: 'ወርሃዊ ወጪ ይመዝግቡ' });
    expect(r.ctaAdd).toEqual({ en: 'Add ›', am: 'ያስገቡ ›' });
    expect(r.ctaSetup).toEqual({ en: 'Setup ›', am: 'ያዋቅሩ ›' });
    expect(r.ctaRecord).toEqual({ en: 'ይመዝግቡ ›', am: 'ይመዝግቡ ›' }); // wrong-ish EN — byte-identical by contract
    expect(r.allSetUp).toEqual({ en: 'All set up', am: 'ሁሉም ተዋቅሯል' });
    expect(r.details).toEqual({ en: 'Details', am: 'ተጨማሪ' });
    expect(r.shopFallback).toEqual({ en: 'Shop', am: 'ሱቅ' });
  });

  it('BYTE-IDENTITY: plan entries equal the exact inline originals', () => {
    const p = settings.plan;
    expect(p.plusStaff).toEqual({ en: 'Unlimited staff members', am: 'ያልተገደበ ሰራተኞች' });
    expect(p.plusTx).toEqual({ en: 'Unlimited monthly transactions', am: 'ያልተገደበ ወርሃዊ ግብይቶች' });
    expect(p.plusReports).toEqual({ en: 'Advanced reports & analytics', am: 'የላቀ ሪፖርቶች እና ትንታኔ' });
    expect(p.plusMulti).toEqual({ en: 'Multi-shop management', am: 'ባለብዙ ሱቅ አስተዳደር' });
    expect(p.plusSupport).toEqual({ en: 'Priority support', am: 'ቅድሚያ ድጋፍ' });
    expect(p.freeTitle).toEqual({ en: 'Free Plan', am: 'ነፃ ፕላን' });
    expect(p.freeSubtitle).toEqual({ en: 'Limited staff and reports', am: 'የሰራተኞች እና የሪፖርት ገደቦች አሉ' });
    expect(p.staffLabel).toEqual({ en: 'Staff', am: 'ሰራተኞች' });
    expect(p.txLabel).toEqual({ en: 'Monthly tx', am: 'ወርሃዊ ግብይቶች' });
    expect(p.upgradeCta).toEqual({ en: 'Upgrade to Plus', am: 'ወደ Plus አሻሽል' });
    expect(p.upgradeNow).toEqual({ en: 'Upgrade Now', am: 'ወደ Plus አሻሽል' }); // shared AM — pre-existing
    expect(p.upgrading).toEqual({ en: 'Upgrading...', am: 'በመስራት ላይ...' });
    expect(p.upgradedToast).toEqual({ en: 'Upgraded to Gebya Plus! 🎉', am: 'ወደ Gebya Plus ተሻሽሏል! 🎉' });
    expect(p.upgradeFailedToast).toEqual({ en: 'Something went wrong', am: 'እባክዎ እንደገና ይሞክሩ' });
    expect(p.modalTagline).toEqual({ en: 'Unlock everything and scale your business', am: 'ሁሉንም ገደቦች ይክፈቱ እና የንግድዎን አቅም ይጨምሩ' });
    expect(p.deviceNote).toEqual({ en: 'Tied to this device. No payment is taken.', am: 'ከዚህ ስልክ ጋር የተያያዘ ነው። ምንም ክፍያ አይጠየቅም።' });
  });

  it('parameterized progressOf reproduces the template bytes (extraction rules 2 + 6)', () => {
    expect(settings.readiness.progressOf.en({ done: 3, total: 5 })).toBe('3 of 5 set up');
    expect(settings.readiness.progressOf.am({ done: 3, total: 5 })).toBe('3 ከ 5 ተዋቅሯል');
    expect(settings.readiness.progressOf.en({ done: 0, total: 5 })).toBe('0 of 5 set up');
    expect(settings.readiness.progressOf.am({ done: 5, total: 5 })).toBe('5 ከ 5 ተዋቅሯል');
  });

  it('CONSUMERS ARE TERNARY-FREE: touched files contain zero lang === am branches', () => {
    const consumers = [
      'src/components/settings/ReadinessHero.jsx',
      'src/components/settings/PlanPanel.jsx',
    ];
    for (const rel of consumers) {
      const src = readFileSync(resolve(ROOT, rel), 'utf8');
      // Whitespace- and quote-tolerant (Batch 3 pre-guidance): catches
      // `lang==='am'`, `lang === "am"`, `lang  ===  'am'` etc., not just the
      // canonical spacing.
      const hits = src.match(/lang\s*===\s*['"]am['"]/g) || [];
      expect(hits, `${rel} must consume the labels module (found ${hits.length} inline ternaries)`).toEqual([]);
    }
  });
});
