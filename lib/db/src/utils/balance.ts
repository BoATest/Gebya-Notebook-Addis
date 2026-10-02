import { customerTransactions } from "../schema/customer_transactions";
import { sql, type SQL } from "drizzle-orm";

/**
 * Customer balance expression. After migration 0007 the amount column is
 * numeric(12,2): PG SUM(numeric) returns a numeric, which the driver delivers
 * as a STRING. The ::float8 cast keeps the declared SQL<number> honest at the
 * boundary so every downstream consumer (reminder scheduler, /sync/balance-check)
 * receives a real JS number without per-site wrapping.
 */
export function customerBalanceExpression(): SQL<number> {
  return sql<number>`COALESCE(SUM(
    CASE
      WHEN ${customerTransactions.type} = 'credit_add' THEN ${customerTransactions.amount}
      WHEN ${customerTransactions.type} = 'payment' THEN -${customerTransactions.amount}
      WHEN ${customerTransactions.type} = 'reversal' THEN -${customerTransactions.amount}
      ELSE 0
    END
  ), 0)::float8`;
}
