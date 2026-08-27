/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { computeCustomerCreditPerformance } from "../creditPerformance.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

function txn(partial: {
  customerId: number;
  type: string;
  amount: number;
  createdAt: number;
  dueDate?: number | null;
}) {
  return { dueDate: null, ...partial };
}

describe("computeCustomerCreditPerformance", () => {
  it("computes on-time rate for settled credits with due dates", () => {
    const rows = [
      // Credit due in 10 days, paid in 2 days → on time
      txn({ customerId: 1, type: "credit_add", amount: 500, createdAt: NOW - 20 * DAY, dueDate: NOW - 10 * DAY }),
      txn({ customerId: 1, type: "payment", amount: 500, createdAt: NOW - 18 * DAY }),
      // Credit due 5 days ago, paid 1 day late
      txn({ customerId: 1, type: "credit_add", amount: 300, createdAt: NOW - 15 * DAY, dueDate: NOW - 5 * DAY }),
      txn({ customerId: 1, type: "payment", amount: 300, createdAt: NOW - 4 * DAY }),
    ];
    const [c] = computeCustomerCreditPerformance(rows, [{ id: 1, displayName: "Abebe", name: null }], NOW);
    expect(c.on_time_eligible).toBe(2);
    expect(c.on_time_count).toBe(1);
    expect(c.on_time_rate_percent).toBe(50);
    // avg pay: (2 + 11) / 2 = 6.5 → rounds to 7 days
    expect(c.avg_pay_days).toBe(7);
    expect(c.outstanding_birr).toBe(0);
  });

  it("excludes credits without due dates from on-time stats", () => {
    const rows = [
      txn({ customerId: 2, type: "credit_add", amount: 100, createdAt: NOW - 9 * DAY }),
      txn({ customerId: 2, type: "payment", amount: 100, createdAt: NOW - 8 * DAY }),
    ];
    const [c] = computeCustomerCreditPerformance(rows, [], NOW);
    expect(c.on_time_eligible).toBe(0);
    expect(c.on_time_rate_percent).toBeNull();
    expect(c.avg_pay_days).toBe(1);
  });

  it("flags overdue duration from the oldest past-due unsettled credit", () => {
    const rows = [
      txn({ customerId: 3, type: "credit_add", amount: 400, createdAt: NOW - 30 * DAY, dueDate: NOW - 26 * DAY }),
    ];
    const [c] = computeCustomerCreditPerformance(rows, [], NOW);
    expect(c.outstanding_birr).toBe(400);
    expect(c.overdue_amount_birr).toBe(400);
    expect(c.overdue_days).toBe(26);
    expect(c.on_time_rate_percent).toBeNull();
  });

  it("allocates payments FIFO and treats overpayment as prepay", () => {
    const rows = [
      txn({ customerId: 4, type: "credit_add", amount: 100, createdAt: NOW - 5 * DAY, dueDate: NOW - 3 * DAY }),
      txn({ customerId: 4, type: "payment", amount: 250, createdAt: NOW - 4 * DAY }),
      txn({ customerId: 4, type: "credit_add", amount: 100, createdAt: NOW - 2 * DAY, dueDate: NOW + 5 * DAY }),
    ];
    const [c] = computeCustomerCreditPerformance(rows, [], NOW);
    // First credit settled by FIFO; 150 prepay covers the second credit fully.
    expect(c.outstanding_birr).toBe(-50); // 200 credit - 250 paid
    expect(c.on_time_eligible).toBe(2);
    expect(c.on_time_count).toBe(2);
  });

  it("subtracts reversals from outstanding but ignores them in lifecycle", () => {
    const rows = [
      txn({ customerId: 5, type: "credit_add", amount: 300, createdAt: NOW - 6 * DAY }),
      txn({ customerId: 5, type: "payment", amount: 100, createdAt: NOW - 5 * DAY }),
      txn({ customerId: 5, type: "reversal", amount: 50, createdAt: NOW - 4 * DAY }),
    ];
    const [c] = computeCustomerCreditPerformance(rows, [], NOW);
    expect(c.outstanding_birr).toBe(150);
    expect(c.on_time_eligible).toBe(0);
    expect(c.transaction_count).toBe(3);
  });

  it("separates customers and sorts by outstanding desc", () => {
    const rows = [
      txn({ customerId: 10, type: "credit_add", amount: 100, createdAt: NOW - 3 * DAY }),
      txn({ customerId: 11, type: "credit_add", amount: 900, createdAt: NOW - 3 * DAY }),
      txn({ customerId: 11, type: "payment", amount: 400, createdAt: NOW - 2 * DAY }),
    ];
    const out = computeCustomerCreditPerformance(
      rows,
      [{ id: 10, displayName: "Small", name: null }, { id: 11, displayName: null, name: "Big" }],
      NOW,
    );
    expect(out.map((c) => c.customer_id)).toEqual([11, 10]);
    expect(out[0].display_name).toBe("Big");
    expect(out[0].outstanding_birr).toBe(500);
    expect(out[1].display_name).toBe("Small");
  });

  it("returns [] for rows without customer ids", () => {
    expect(
      computeCustomerCreditPerformance(
        [{ customerId: null, type: "payment", amount: 5, createdAt: NOW }],
        [],
        NOW,
      ),
    ).toEqual([]);
  });
});
