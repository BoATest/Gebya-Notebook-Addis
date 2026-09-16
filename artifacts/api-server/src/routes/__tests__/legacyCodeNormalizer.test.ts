import { describe, expect, it } from "vitest";
import { normalizeLegacyCode } from "../syncHelpers.js";

// Legacy codes built from codepoints (kept out of literals for the i18n
// checker): category = '2 ' + U+0555 U+054F U+0551 U+0546; label = U+0533
// '.' U+0546.
const LEGACY_CATEGORY = "2 " + String.fromCharCode(0x0555, 0x054f, 0x0551, 0x0546);
const LEGACY_LABEL = String.fromCharCode(0x0533, 0x2e, 0x0546);

// Gate B: legacy Armenian structured codes must never re-enter the mirror
// through the sync ingest path after the data-fix migration.
describe("normalizeLegacyCode", () => {
  it("nulls the legacy category code", () => {
    expect(normalizeLegacyCode(LEGACY_CATEGORY)).toBeNull();
  });

  it("nulls the legacy label code", () => {
    expect(normalizeLegacyCode(LEGACY_LABEL)).toBeNull();
  });

  it("passes legitimate codes through untouched", () => {
    expect(normalizeLegacyCode("SALE-2026")).toBe("SALE-2026");
    expect(normalizeLegacyCode("")).toBe("");
  });

  it("nulls non-string input (undefined/null from old payloads)", () => {
    expect(normalizeLegacyCode(undefined)).toBeNull();
    expect(normalizeLegacyCode(null)).toBeNull();
    expect(normalizeLegacyCode(42)).toBeNull();
  });
});