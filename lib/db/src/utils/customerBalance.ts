/**
 * Customer balance utility for the reminder system.
 *
 * Computes outstanding balances per customer from the transaction ledger
 * and enriches them with Telegram context so the reminder scheduler can
 * operate as a closed, self-sufficient pipeline.
 */

import { customers } from "../schema/customers.js";
import { customerTransactions } from "../schema/customer_transactions.js";
import { customerBalanceExpression } from "./balance.js";
import { eq, sql, type SQL, type SQLWrapper } from "drizzle-orm";

// Inline EligibleCustomer to avoid circular dependency with api-server
export interface EligibleCustomer {
  customerId: number;
  customerName: string;
  balance: number;
  dueDate: number | null;
  customerCreatedAt: number;
  chatId: string;
  updatesEnabled: boolean;
  telegramLanguage: "am" | "en";
  reminderConfig: {
    id: string;
    shopId: number;
    customerId: number;
    frequency: "daily" | "weekly" | "disabled";
    lastReminderSentAt: number | null;
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
  };
}

/**
 * Raw balance row calculated from the transaction ledger.
 */
export interface CustomerBalanceRow {
  customerId: number;
  balance: number;
  dueDate: number | null;
  createdAt: number;
}

/**
 * Enriched customer row with Telegram session data.
 */
export interface CustomerWithTelegram {
  customerId: number;
  name: string | null;
  balance: number;
  dueDate: number | null;
  createdAt: number;
  chatId: string | null;
  telegramUsername: string | null;
  telegramNotifyEnabled: boolean;
}

/**
 * Options for fetching customer balances.
 */
export interface CustomerBalanceOptions {
  /** Only return customers with balance strictly > 0 */
  onlyPositiveBalance?: boolean;
  /** Business ID to scope (required in production) */
  businessId?: number;
}

/**
 * Calculate outstanding balances per customer from the transaction ledger.
 *
 * Balance = sum(credits) - sum(payments)
 *
 * @param db - Drizzle database instance
 * @param options - Filter options
 * @returns Array of customers with their current balance
 */
export async function getCustomerBalances(
  db: any,
  options: CustomerBalanceOptions = {}
): Promise<CustomerBalanceRow[]> {
  const { onlyPositiveBalance = true } = options;
  const balanceExpr = customerBalanceExpression();

  const baseQuery = db
    .select({
      customerId: sql<number>`COALESCE(${customerTransactions.customerId}, 0)`.as("customer_id"),
      balance: balanceExpr.as("balance"),
      dueDate: sql<number | null>`MAX(${customerTransactions.dueDate})`.as("due_date"),
      createdAt: sql<number>`MIN(${customerTransactions.createdAt})`.as("created_at"),
    })
    .from(customerTransactions)
    .groupBy(customerTransactions.customerId)
    .having(onlyPositiveBalance ? sql`${balanceExpr} > 0` : undefined);

  const rows = await baseQuery as CustomerBalanceRow[];

  // Filter positive balances if not done via HAVING
  if (!onlyPositiveBalance) {
    return rows.filter((r) => r.balance > 0);
  }

  return rows;
}

/**
 * Enrich customer balances with Telegram session data so they match EligibleCustomer.
 */
export function enrichWithTelegram(
  row: CustomerBalanceRow,
  customer: CustomerWithTelegram
): EligibleCustomer {
  return {
    customerId: row.customerId,
    customerName: customer.name ?? `Customer ${row.customerId}`,
    balance: row.balance,
    dueDate: row.dueDate,
    customerCreatedAt: row.createdAt,
    chatId: customer.chatId ?? "",
    updatesEnabled: Boolean(customer.chatId && customer.telegramNotifyEnabled),
    telegramLanguage: customer.telegramUsername?.toLowerCase().startsWith("am") ? "am" : "en",
    reminderConfig: {
      id: `cfg-${row.customerId}`,
      shopId: 0, // filled by caller
      customerId: row.customerId,
      frequency: "daily",
      lastReminderSentAt: null,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  };
}