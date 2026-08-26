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
import { requireDb } from "@workspace/db";
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
import { eq, and, gte, lte, sql, desc, isNull } from "drizzle-orm";
import { requireDeviceContext, type DeviceContext } from "./rbac.js";
import { verifyJwt } from "./auth.js";
import { getBankUserFromToken, buildReportPayload } from "./analyticsHelpers.js";

const router = Router();


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
  const existing = await requireDb().select()
    .from(bankDataShares)
    .where(and(
      eq(bankDataShares.businessId, ctx.businessId),
      eq(bankDataShares.bankName, bankName),
      eq(bankDataShares.status, "active"),
    ))
    .limit(1);

  if (existing.length > 0) {
    // Update existing share
    await requireDb().update(bankDataShares)
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

  const [share] = await requireDb().insert(bankDataShares)
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

  const share = await requireDb().select()
    .from(bankDataShares)
    .where(and(
      eq(bankDataShares.id, shareId),
      eq(bankDataShares.businessId, ctx.businessId),
    ))
    .limit(1);

  if (share.length === 0) return res.status(404).json({ error: "Share not found" });

  await requireDb().update(bankDataShares)
    .set({ status: "revoked", consentRevokedAt: new Date(), updatedAt: new Date() })
    .where(eq(bankDataShares.id, shareId));

  return res.json({ ok: true });
});

// GET /analytics/shares — list merchant's shares
router.get("/shares", async (req, res) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });

  const shares = await requireDb().select()
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
  const share = await requireDb().select()
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

  const shares = await requireDb().select({
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
    const biz = await requireDb().select().from(businesses).where(eq(businesses.id, s.businessId)).limit(1);
    enriched.push({
      ...s,
      shop_name: biz[0]?.name || "Unknown",
    });
  }

  return res.json({ shops: enriched });
});

export default router;
