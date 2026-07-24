import { customerTransactions } from "../schema/customer_transactions";
import { sql, type SQL } from "drizzle-orm";

export function customerBalanceExpression(): SQL<number> {
  return sql<number>`SUM(
    CASE
      WHEN ${customerTransactions.type} = 'credit_add' THEN ${customerTransactions.amount}
      WHEN ${customerTransactions.type} = 'payment' THEN -${customerTransactions.amount}
      WHEN ${customerTransactions.type} = 'reversal' THEN -${customerTransactions.amount}
      ELSE 0
    END
  )`;
}
