/**
 * Bank analytics API routes.
 *
 * Merchant endpoints:
 *   POST   /analytics/share          — grant a bank access to your data
 *   DELETE /analytics/share/:id      — revoke access
 *   GET    /analytics/shares         — list your active shares
 *
 * Bank endpoints:
 *   GET    /analytics/shop/:businessId  — get a shop's report (requires consent)
 *   GET    /analytics/shops             — list all shops you have access to
 *
 * Admin endpoints:
 *   GET    /analytics/aggregate         — cross-shop aggregation for NBE/DFI
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  bankUsers,
  bankDataShares,
  bankReportSnapshots,
} from "@workspace/db/schema/bank_analytics";
import {
  transactions,
  customers,
  customerTransactions,
  businesses,
} from "@workspace/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireDeviceContext, type DeviceContext } from "./rbac.js";
import { verifyJwt } from "./auth.js";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────

async function getBankUserFromToken(req: any): Promise<{ bankUser: typeof bankUsers.$inferSelect; token: string } | null> {
  const authHeader = req.headers.authorization || "";
  const token = String(authHeader).replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const decoded = verifyJwt(token);
  if (!decoded || !decoded.userId) return null;

  // Check if this userId maps to a bank_user
  const rows = await db
    .select()
    .from(bankUsers)
    .where(eq(bankUsers.id, decoded.userId))
    .limit(1);

  return rows[0] ? { bankUser: rows[0], token } : null;
}

async function buildReportPayload(businessId: number, share: typeof bankDataShares.$inferSelect) {
  const [bizRows, txRows, custRows, custTxRows] = await Promise.all([
    db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1),
    db.select().from(transactions).where(eq(transactions.businessId, businessId)),
    db.select().from(customers).where(eq(customers.businessId, businessId)),
    db.select().from(customerTransactions).where(eq(customerTransactions.businessId, businessId)),
  ]);

  const biz = bizRows[0];
  if (!biz) return null;

  // --- Per-customer credit summary ---
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

    // Only include PII if merchant opted in
    if (share.shareCustomerData) {
      summary.display_name = customer?.displayName || customer?.name || `Customer ${cid}`;
      summary.phone = customer?.phoneNumber || customer?.phone;
    }

    customerSummaries.push(summary);
  }

  customerSummaries.sort((a, b) => b.outstanding_balance - a.outstanding_balance);

  // --- Monthly summary (last 6 months) ---
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

  // --- Impact metrics ---
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

// ── Merchant endpoints ─────────────────────────────────────────────────────

// POST /analytics/share — grant a bank access
router.post("/share", async (req, res) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });

  const { bankName, bankUserId, shareSalesData, shareCreditData, shareCustomerData, notes, expiresAt } = req.body;
  if (!bankName || typeof bankName !== "string") {
    return res.status(400).json({ error: "bankName is required" });
  }

  // Check for existing active share
  const existing = await db
    .select()
    .from(bankDataShares)
    .where(and(
      eq(bankDataShares.businessId, ctx.businessId),
      eq(bankDataShares.bankName, bankName),
      eq(bankDataShares.status, "active"),
    ))
    .limit(1);

  if (existing.length > 0) {
    // Update existing share
    await db
      .update(bankDataShares)
      .set({
        shareSalesData: shareSalesData ?? existing[0].shareSalesData,
        shareCreditData: shareCreditData ?? existing[0].shareCreditData,
        shareCustomerData: shareCustomerData ?? existing[0].shareCustomerData,
        notes: notes ?? existing[0].notes,
        expiresAt: expiresAt ? new Date(expiresAt) : existing[0].expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(bankDataShares.id, existing[0].id));

    return res.json({ ok: true, shareId: existing[0].id, updated: true });
  }

  const [share] = await db
    .insert(bankDataShares)
    .values({
      businessId: ctx.businessId,
      bankName,
      bankUserId: bankUserId || null,
      shareSalesData: shareSalesData ?? true,
      shareCreditData: shareCreditData ?? true,
      shareCustomerData: shareCustomerData ?? false,
      notes: notes || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  return res.json({ ok: true, shareId: share.id });
});

// DELETE /analytics/share/:id — revoke access
router.delete("/share/:id", async (req, res) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });

  const shareId = Number(req.params.id);
  if (!Number.isInteger(shareId)) return res.status(400).json({ error: "Invalid share ID" });

  const share = await db
    .select()
    .from(bankDataShares)
    .where(and(
      eq(bankDataShares.id, shareId),
      eq(bankDataShares.businessId, ctx.businessId),
    ))
    .limit(1);

  if (share.length === 0) return res.status(404).json({ error: "Share not found" });

  await db
    .update(bankDataShares)
    .set({ status: "revoked", consentRevokedAt: new Date(), updatedAt: new Date() })
    .where(eq(bankDataShares.id, shareId));

  return res.json({ ok: true });
});

// GET /analytics/shares — list merchant's shares
router.get("/shares", async (req, res) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });

  const shares = await db
    .select()
    .from(bankDataShares)
    .where(eq(bankDataShares.businessId, ctx.businessId))
    .orderBy(desc(bankDataShares.createdAt));

  return res.json({ shares });
});

// ── Bank endpoints ─────────────────────────────────────────────────────────

// GET /analytics/shop/:businessId — get a shop's report (requires consent)
router.get("/shop/:businessId", async (req, res) => {
  const bankInfo = await getBankUserFromToken(req);
  if (!bankInfo) return res.status(401).json({ error: "Unauthorized — bank token required" });

  const businessId = Number(req.params.businessId);
  if (!Number.isInteger(businessId)) return res.status(400).json({ error: "Invalid business ID" });

  // Verify consent exists and is active
  const share = await db
    .select()
    .from(bankDataShares)
    .where(and(
      eq(bankDataShares.businessId, businessId),
      eq(bankDataShares.bankName, bankInfo.bankUser.bankName),
      eq(bankDataShares.status, "active"),
    ))
    .limit(1);

  if (share.length === 0) {
    return res.status(403).json({ error: "No active consent from this shop" });
  }

  // Check expiry
  if (share[0].expiresAt && new Date(share[0].expiresAt) < new Date()) {
    return res.status(403).json({ error: "Consent has expired" });
  }

  // Build fresh report or use cached
  const payload = await buildReportPayload(businessId, share[0]);
  if (!payload) return res.status(404).json({ error: "Shop not found" });

  return res.json(payload);
});

// GET /analytics/shops — list all shops the bank has access to
router.get("/shops", async (req, res) => {
  const bankInfo = await getBankUserFromToken(req);
  if (!bankInfo) return res.status(401).json({ error: "Unauthorized — bank token required" });

  const shares = await db
    .select({
      shareId: bankDataShares.id,
      businessId: bankDataShares.businessId,
      bankName: bankDataShares.bankName,
      shareSalesData: bankDataShares.shareSalesData,
      shareCreditData: bankDataShares.shareCreditData,
      shareCustomerData: bankDataShares.shareCustomerData,
      consentGivenAt: bankDataShares.consentGivenAt,
      expiresAt: bankDataShares.expiresAt,
    })
    .from(bankDataShares)
    .where(and(
      eq(bankDataShares.bankName, bankInfo.bankUser.bankName),
      eq(bankDataShares.status, "active"),
    ))
    .orderBy(desc(bankDataShares.consentGivenAt));

  // Enrich with business names
  const enriched = [];
  for (const s of shares) {
    const biz = await db.select().from(businesses).where(eq(businesses.id, s.businessId)).limit(1);
    enriched.push({
      ...s,
      shop_name: biz[0]?.name || "Unknown",
    });
  }

  return res.json({ shops: enriched });
});

// ── Admin / NBE aggregation ───────────────────────────────────────────────

// GET /analytics/aggregate — cross-shop metrics (admin only)
router.get("/aggregate", async (req, res) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });
  if (ctx.role !== "owner") return res.status(403).json({ error: "Admin only" });

  // Aggregate across all shops
  const allTx = await db.select().from(transactions);
  const allCustTx = await db.select().from(customerTransactions);
  const allCustomers = await db.select().from(customers);
  const allBiz = await db.select().from(businesses);

  const totalSales = allTx.filter((t) => t.type === "sale").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpenses = allTx.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalCredit = allCustTx.filter((t) => t.type === "credit_add").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalRepaid = allCustTx.filter((t) => t.type === "payment").reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return res.json({
    aggregate: {
      shops_onboarded: allBiz.length,
      total_transactions: allTx.length,
      total_sales_birr: totalSales,
      total_expenses_birr: totalExpenses,
      total_credit_extended_birr: totalCredit,
      total_credit_repaid_birr: totalRepaid,
      credit_recovery_rate: totalCredit > 0 ? Math.round((totalRepaid / totalCredit) * 100) : 0,
      unique_customers: new Set(allCustTx.map((t) => t.customerId).filter(Boolean)).size,
      generated_at: new Date().toISOString(),
    },
  });
});

export default router;
