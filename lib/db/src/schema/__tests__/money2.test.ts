/**
 * Money schema migration (0007) — epsilon 2dp guard tests.
 *
 * Plan amendment #1: Math.round(v*100) === v*100 is WRONG for IEEE-754
 * (0.1*100 === 10.000000000000002). The epsilon form
 * Math.abs(v*100 - Math.round(v*100)) < 1e-6 must accept 0.1, 1.1, 10.15, 99.99
 * and reject 10.155.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { money2 } from "../transactions.js";

// The exact predicate shipped inside money2 (kept in sync by test failure if drift):
const epsilon2dp = (v: number) => Number.isFinite(v) && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;

describe("money2 zod schema — epsilon 2dp rule", () => {
  it("ACCEPTS valid 2dp numbers that IEEE-754 equality would reject", () => {
    for (const v of [0.1, 1.1, 10.15, 99.99, 0.01, 150.5, 1234567.89]) {
      const r = money2.safeParse(v);
      expect(r.success, `expected ${v} to PASS`).toBe(true);
      if (r.success) expect(r.data).toBe(v);
    }
  });

  it("ACCEPTS numeric strings and converts them to numbers", () => {
    for (const [input, expected] of [["150.50", 150.5], ["0.1", 0.1], ["99.99", 99.99]] as const) {
      const r = money2.safeParse(input);
      expect(r.success, `expected string ${input} to PASS`).toBe(true);
      if (r.success) expect(r.data).toBe(expected);
    }
  });

  it("REJECTS values with more than 2 decimal places", () => {
    for (const v of [10.155, 0.001, 1.234, 99.999]) {
      const r = money2.safeParse(v);
      expect(r.success, `expected ${v} to FAIL`).toBe(false);
    }
  });

  it("REJECTS NaN, Infinity, and garbage strings", () => {
    expect(money2.safeParse(Number.NaN).success).toBe(false);
    expect(money2.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
    expect(money2.safeParse("abc").success).toBe(false);
    expect(money2.safeParse("").success).toBe(false);
  });

  it("predicate directly: 1.1*100 !== Math.round(1.1*100) proves plain equality was wrong", () => {
    // Documents WHY the epsilon form is mandatory (measured in this runtime):
    // 1.1*100 === 110.00000000000001, so Math.round(v*100) === v*100 would reject 1.1.
    expect(1.1 * 100).not.toBe(Math.round(1.1 * 100));
    expect(epsilon2dp(1.1)).toBe(true);
    expect(epsilon2dp(10.155)).toBe(false);
  });
});
