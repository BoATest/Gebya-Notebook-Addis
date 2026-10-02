/**
 * Required unit tests for the money 2dp epsilon rule (MIGRATION_PLAN Amendment 1).
 * Proves: 0.1, 1.1, 10.15, 99.99 PASS; 10.155 FAILS; non-finite FAILS.
 * The naive exact-equality form (Math.round(v*100) === v*100) would FAIL 0.1 —
 * these tests encode why the epsilon form is mandatory.
 */
import { describe, it, expect } from "vitest";
import { isMoney2dp, roundMoney, toMoneyNumber } from "./money";

describe("isMoney2dp — epsilon-based 2dp acceptance", () => {
  it("accepts valid 2dp values that exact-equality would reject (float noise)", () => {
    // 1.1 * 100 === 110.00000000000001 in IEEE-754 — the whole point of the epsilon.
    expect(1.1 * 100).not.toBe(110); // guard: demonstrates the float hazard exists
    expect(isMoney2dp(0.1)).toBe(true);
    expect(isMoney2dp(1.1)).toBe(true);
    expect(isMoney2dp(10.15)).toBe(true);
    expect(isMoney2dp(99.99)).toBe(true);
  });

  it("accepts integers, zero, and large birr amounts within numeric(12,2) range", () => {
    expect(isMoney2dp(0)).toBe(true);
    expect(isMoney2dp(150)).toBe(true);
    expect(isMoney2dp(9999999999.99)).toBe(true); // numeric(12,2) max
  });

  it("accepts numeric strings (drizzle numeric-as-string shape)", () => {
    expect(isMoney2dp("150.50")).toBe(true);
    expect(isMoney2dp("0.1")).toBe(true);
    expect(isMoney2dp("99.99")).toBe(true);
  });

  it("rejects more than 2 decimal places", () => {
    expect(isMoney2dp(10.155)).toBe(false);
    expect(isMoney2dp(0.001)).toBe(false);
    expect(isMoney2dp("10.155")).toBe(false);
  });

  it("rejects non-finite and non-numeric input", () => {
    expect(isMoney2dp(NaN)).toBe(false);
    expect(isMoney2dp(Infinity)).toBe(false);
    expect(isMoney2dp(-Infinity)).toBe(false);
    expect(isMoney2dp("abc")).toBe(false);
    expect(isMoney2dp("")).toBe(false);      // Number("") === 0 is a silent trap
    expect(isMoney2dp("   ")).toBe(false);
  });
});

describe("roundMoney / toMoneyNumber", () => {
  it("rounds to 2dp half-away-from-zero (mirrors PG ROUND(numeric,2))", () => {
    expect(roundMoney(10.155)).toBe(10.16);
    expect(roundMoney(10.154)).toBe(10.15);
    expect(roundMoney(0.1)).toBe(0.1);
    expect(roundMoney(1.005)).toBe(1.01); // classic float trap
    expect(roundMoney(-10.155)).toBe(-10.16); // symmetric negatives
    expect(roundMoney(2.675)).toBe(2.68); // 2.675*100 = 267.49999999999997 unnormalized
  });

  it("coerces numeric strings and neutralizes garbage", () => {
    expect(toMoneyNumber("150.50")).toBe(150.5);
    expect(toMoneyNumber("abc")).toBe(0);
    expect(toMoneyNumber(null)).toBe(0);
    expect(toMoneyNumber(undefined)).toBe(0);
    expect(toMoneyNumber(Infinity)).toBe(0);
  });
});
