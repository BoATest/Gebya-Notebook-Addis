import { requireDb } from "@workspace/db";
import { bankUsers, bankDataShares, businesses, transactions, customers, customerTransactions } from "@workspace/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { verifyJwt } from "./auth.js";

export async function getBankUserFromToken(req: any): Promise<{ bankUser: typeof bankUsers.$inferSelect; token: string } | null> {
  const authHeader = req.headers.authorization || "";
  const token = String(authHeader).replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const decoded = verifyJwt(token);
  if (!decoded || !decoded.userId) return null;

  const rows = await requireDb().select()
    .from(bankUsers)
    .where(eq(bankUsers.id, decoded.userId))
    .limit(1);

  return rows[0] ? { bankUser: rows[0], token } : null;
}

export async function buildReportPayload(businessId: number, share: typeof bankDataShares.$inferSelect) {
  const [bizRows, txRows, custRows, custTxRows] = await Promise.all([
    requireDb().select().from(businesses).where(eq(businesses.id, businessId)).limit(1),
    requireDb().select().from(transactions).where(and(eq(transactions.businessId, businessId), isNull(transactions.deletedAt))),
    requireDb().select().from(customers).where(eq(customers.businessId, businessId)),
    requireDb().select().from(customerTransactions).where(eq(customerTransactions.businessId, businessId)),
  ]);

  const biz = bizRows[0];
  if (!biz) return null;

  const customerSummaries: any[] = [];
  const customerIds = [...new Set(custTxRows.map((t) => t.customerId).filter(Boolean))];

  for (const cid of customerIds) {
    const credits = custTxRows.filter((t) => t.customerId === cid && t.type === "credit_add");
    const payments = custTxRows.filter((t) => t.customerId === cid && t.type === "payment");

    const totalCredit = credits.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalPaid = payments.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const outstanding = totalCredit - totalPaid;

    if (totalCredit <= 0) continue;

    const customer = custRows.find((c) => c.id === cid);
    const oldestCredit = credits.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))[0];
    const daysSinceOldest = oldestCredit
      ? Math.floor((Date.now() - oldestCredit.createdAt) / (24 * 60 * 60 * 1000))
      : 0;

    const summary: any = {
      customer_id: cid,
      total_credit_extended: totalCredit,
      total_repaid: totalPaid,
      outstanding_balance: outstanding,
      repayment_rate: totalCredit > 0 ? Math.round((totalPaid / totalCredit) * 100) : 0,
      credit_count: credits.length,
      payment_count: payments.length,
      oldest_credit_days: daysSinceOldest,
    };

    if (share.shareCustomerData) {
      summary.display_name = customer?.displayName || customer?.name || `Customer ${cid}`;
      summary.phone = customer?.phoneNumber;
    }

    customerSummaries.push(summary);
  }

  customerSummaries.sort((a, b) => b.outstanding_balance - a.outstanding_balance);

  const monthlySummary: any[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = monthDate.getTime();
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const monthTxs = txRows.filter((t) => t.createdAt >= monthStart && t.createdAt <= monthEnd);
    const monthSales = monthTxs.filter((t) => t.type === "sale").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const monthExpenses = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const monthCredit = custTxRows.filter((t) => t.type === "credit_add" && t.createdAt >= monthStart && t.createdAt <= monthEnd).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const monthPayments = custTxRows.filter((t) => t.type === "payment" && t.createdAt >= monthStart && t.createdAt <= monthEnd).reduce((s, t) => s + (Number(t.amount) || 0), 0);

    monthlySummary.push({
      month: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`,
      total_sales_birr: monthSales,
      total_expenses_birr: monthExpenses,
      net_birr: monthSales - monthExpenses,
      credit_extended_birr: monthCredit,
      credit_repaid_birr: monthPayments,
      transaction_count: monthTxs.length,
    });
  }

  const totalSales = txRows.filter((t) => t.type === "sale").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpenses = txRows.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalCreditExtended = custTxRows.filter((t) => t.type === "credit_add").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalCreditRepaid = custTxRows.filter((t) => t.type === "payment").reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return {
    report_version: 1,
    generated_at: new Date().toISOString(),
    shop: {
      shop_id: businessId,
      name: biz.name,
    },
    impact_metrics: {
      total_transactions: txRows.length,
      total_sales_birr: totalSales,
      total_expenses_birr: totalExpenses,
      total_credit_extended_birr: totalCreditExtended,
      total_credit_repaid_birr: totalCreditRepaid,
      credit_recovery_rate: totalCreditExtended > 0 ? Math.round((totalCreditRepaid / totalCreditExtended) * 100) : 0,
      unique_customers: customerIds.length,
    },
    monthly_summary: monthlySummary,
    customer_summaries: customerSummaries,
    summary: {
      total_customers_with_credit: customerSummaries.length,
      total_outstanding_birr: customerSummaries.reduce((s, c) => s + c.outstanding_balance, 0),
      average_repayment_rate: customerSummaries.length > 0
        ? Math.round(customerSummaries.reduce((s, c) => s + c.repayment_rate, 0) / customerSummaries.length)
        : 0,
      months_of_history: monthlySummary.filter((m) => m.transaction_count > 0).length,
    },
  };
}
