/**
 * R2.1 batch 2 contract test — onboarding.* labels (OnboardingScreen.jsx).
 *
 * Locks:
 *   1. BYTE-IDENTITY — every entry equals the exact inline bytes it replaced.
 *      Fixtures are GENERATED from the pre-refactor file (05fa092 — the file
 *      itself was last touched at 974292b) by scripts/gen-labels-fixtures.mjs,
 *      which reads git bytes inside node (no shell, no re-encoding) and runs
 *      mojibake + Ethiopic sanity gates. The committed fixture IS the
 *      provenance; nothing here reads git at runtime (shallow CI clones).
 *   2. Rule 5 (inverted toggle) enforced literally: entry.am holds the bytes of
 *      the inline `lang === 'am' ?` branch — for langToggleLabel/Text those
 *      bytes are the TARGET-language strings ('Switch to English'/'English').
 *   3. Dual-render collapse — the visible JSX text nodes of the pre-refactor
 *      renderEnglishOptions/renderAmharicOptions pair equal the module's
 *      ownerTitle/ownerSub/joinTitle/joinSub entries index-for-index.
 *   4. TERNARY-FREE consumer — whitespace/quote-tolerant pattern
 *      (closes the whitespace loophole ahead of batch 3).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { onboarding } from '../src/labels/onboarding';
import { PRE_TERNARIES, PRE_DUAL_TEXT } from './fixtures/labels-onboarding-pre.mjs';

// vitest runs with the package root as cwd (see vitest.config.ts include).
const ROOT = process.cwd();

// Fixture order == inline order; each index maps to one module entry.
const TERNARY_KEYS = [
  'kicker',            // L45
  'offlineToast',      // L189
  'langToggleLabel',   // L220 — INVERTED (rule 5)
  'langToggleText',    // L222 — INVERTED (rule 5)
  'chooseType',        // L250
  'back',              // L288
  'formTitle',         // L309
  'nameLabel',         // L315
  'namePlaceholder',   // L322 — EN side was a t.* lookup (resolved in fixture)
  'nameError',         // L333
  'phoneLabel',        // L341
  'phoneError',        // L362
  'saving',            // L391
  'startCta',          // L392
] as const;

describe('onboarding labels — byte-identity against pre-refactor fixture', () => {
  it('fixture captured every inline ternary site (14)', () => {
    expect(PRE_TERNARIES.length).toBe(14);
  });

  it('every ternary entry equals its inline bytes', () => {
    expect(onboarding).toBeDefined();
    PRE_TERNARIES.forEach((site: any, i: number) => {
      const key = TERNARY_KEYS[i];
      const entry = (onboarding as any)[key];
      expect(entry, `module entry missing for ${key}`).toBeDefined();
      // Rule 5: entry.am === inline am-branch bytes even when those bytes are
      // the target-language string; entry.en === inline else-branch bytes.
      expect(entry.am, `${key}.am`).toBe(site.am);
      expect(entry.en, `${key}.en`).toBe(site.en);
    });
  });

  it('dual-render visible text pairs equal the option-card entries', () => {
    const en = PRE_DUAL_TEXT.filter((t: any) => t.fn === 'renderEnglishOptions').map((t: any) => t.value);
    const am = PRE_DUAL_TEXT.filter((t: any) => t.fn === 'renderAmharicOptions').map((t: any) => t.value);
    expect(en.length).toBe(4);
    expect(am.length).toBe(4);
    const keys = ['ownerTitle', 'ownerSub', 'joinTitle', 'joinSub'];
    keys.forEach((k, i) => {
      expect((onboarding as any)[k].en, `${k}.en`).toBe(en[i]);
      expect((onboarding as any)[k].am, `${k}.am`).toBe(am[i]);
    });
  });
});

describe('onboarding consumer is ternary-free', () => {
  it('OnboardingScreen.jsx contains zero lang === am selections', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/OnboardingScreen.jsx'), 'utf8');
    // Whitespace + quote tolerant: closes the loophole for batch 3's family.
    const hits = src.match(/lang\s*===\s*['"]am['"]/g) || [];
    expect(hits, `must consume the labels module (found ${hits.length} inline ternaries)`).toEqual([]);
  });
});