// @ts-nocheck
/**
 * Platform Admin Dashboard — API Routes
 *
 * Endpoints:
 *   GET  /admin/overview          — aggregate metrics
 *   GET  /admin/shops             — shop health table
 *   GET  /admin/shops/:businessId — single-shop detail (transactions, credit, staff, devices, bank shares)
 *   GET  /admin/features          — feature adoption
 *   POST /admin/broadcast         — send notification to all shops (or single shop via business_id)
 *   POST /admin/push-all          — send push to all subscribed devices (or single shop via business_id)
 *   GET  /admin/export-shops      — CSV export
 */
import { Router } from "express";
import { db, warmDb } from "@workspace/db";
import { warmCache, serveCachedBounded } from "../lib/adminCache.js";
import { maskPhone, daysAgo, computeOverview, computeShops, computeFrictions, computeFeatures } from "./adminCompute.js";
import { safeEqual } from "../lib/secure.js";
import {
  users,
  businesses,
  businessMembers,
  devices,
  transactions,
  customers,
  customerTransactions,
  suppliers,
  supplierTransactions,
  staffMembers,
  snapshots,
  otps,
  invites,
  notifications,
  pushSubscriptions,
  bankDataShares,
  adminShopLogs,
} from "@workspace/db/schema";
import { eq, and, gt, desc, inArray, sql } from "drizzle-orm";
import { verifyJwt } from "./auth.js";
import { isPlatformAdminUser, listAdminMembers, addAdminMember, removeAdminMember } from "../services/platformAdmin.js";
import { getQuotaInfo, resetQuota } from "../services/smsQuota.js";
import { checkAdminRateLimit } from "../lib/adminRateLimit.js";
import { isSmsEnabled, sendSms } from "../services/smsSender.js";
import { sendTelegramTextMessage, getTelegramBotUsername } from "../services/telegramBotService.js";
import { sendEmail, isEmailConfigured } from "../services/emailService.js";

const router = Router();

async function requireAdmin(req: any) {
  const authHeader = (req.headers as any).authorization || (req.headers as any).Authorization || "";
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = String(headerValue).replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const decoded = verifyJwt(token);
  if (!decoded || !decoded.userId) return null;
  const userRows = await db
    .select({ phoneNumber: users.phoneNumber, email: users.email })
    .from(users)
    .where(eq(users.id, decoded.userId))
    .limit(1);
  const user = userRows[0];
  if (!user || !(await isPlatformAdminUser(user))) return null;
  const memberRows = await db
    .select({ role: businessMembers.role, businessId: businessMembers.businessId })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, decoded.userId), eq(businessMembers.active, true)))
    .limit(1);
  return { userId: decoded.userId, businessId: memberRows[0]?.businessId ?? null, phone: user.phoneNumber };
}

async function insertAdminLog(entry: {
  businessId: number;
  adminPhone: string | null;
  type: string;
  channel?: string | null;
  title?: string | null;
  body?: string | null;
  status?: string | null;
}) {
  const [row] = await db.insert(adminShopLogs).values(entry).returning();
  return row;
}

export { requireAdmin };



router.get("/overview", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  try {
    const { value, status } = await serveCachedBounded("admin:overview", computeOverview);
    if (status === "warming") return res.status(503).json({ error: "warming up", retryAfter: 3 });
    return res.json(value);
  } catch (e) {
    console.error("[admin/overview]", e);
    return res.status(500).json({ error: "Internal server error", request_id: res.locals.requestId });
  }
});

// ─── GET /admin/shops ──────────────────────────────────────────────────

router.get("/shops", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  try {
    const key = `admin:shops:${Number(req.query.limit) || ""}:${Number(req.query.offset) || 0}:${String(req.query.q || "").toString().trim().toLowerCase()}`;
    const { value, status } = await serveCachedBounded(key, () => computeShops(req));
    if (status === "warming") return res.status(503).json({ error: "warming up", retryAfter: 3 });
    return res.json(value);
  } catch (e) {
    console.error("[admin/shops]", e);
    return res.status(500).json({ error: "Internal server error", request_id: res.locals.requestId });
  }
});

// ─── Team members (dynamic platform-admin allowlist) ──────────────────────
router.get("/members", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  const members = await listAdminMembers();
  return res.json({ ok: true, members });
});

router.post("/members", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  const { phone, email, note } = req.body ?? {};
  if (!phone && !email) return res.status(400).json({ error: "phone or email is required" });
  const result = await addAdminMember({ phone: phone || null, email: email || null, addedByPhone: ctx.phone, note });
  if (!result.ok) return res.status(400).json({ error: "Invalid Ethiopian phone number" });
  return res.json({ ok: true, status: result.status, member: result.member });
});

router.delete("/members/:id", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });
  const removed = await removeAdminMember(id);
  if (!removed) return res.status(404).json({ error: "Member not found" });
  return res.json({ ok: true, removed });
});

// ─── GET /admin/shops/:businessId ──────────────────────────────────────────
router.get("/shops/:businessId", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  try {
  const businessIdNum = Number(req.params.businessId);
  if (!Number.isInteger(businessIdNum)) {
    return res.status(400).json({ error: "Invalid businessId" });
  }

  const [bizRow, ownerMemberRows, bizTxns, bizCustTxns, bizCustomers, bizStaff, bizDevices, bizShares] = await Promise.all([
    db.select().from(businesses).where(eq(businesses.id, businessIdNum)).limit(1),
    db.select({ role: businessMembers.role, userId: businessMembers.userId, displayName: businessMembers.displayName }).from(businessMembers).where(eq(businessMembers.businessId, businessIdNum)),
    db.select().from(transactions).where(eq(transactions.businessId, businessIdNum)),
    db.select().from(customerTransactions).where(eq(customerTransactions.businessId, businessIdNum)),
    db.select().from(customers).where(eq(customers.businessId, businessIdNum)),
    db.select().from(staffMembers).where(eq(staffMembers.businessId, businessIdNum)),
    db.select().from(devices).where(eq(devices.shopId, businessIdNum)),
    db.select().from(bankDataShares).where(eq(bankDataShares.businessId, businessIdNum)),
  ]);

  const biz = bizRow[0];
  if (!biz) return res.status(404).json({ error: "Shop not found" });

  const owner = ownerMemberRows.find(m => m.role === 'owner') || ownerMemberRows[0];
  const ownerUser = owner ? await db.select({ phoneNumber: users.phoneNumber, telegramChatId: users.telegramChatId, createdAt: users.createdAt }).from(users).where(eq(users.id, owner.userId)).limit(1).then(r => r[0] || null) : null;

  const bizTxnsFiltered = bizTxns;
  const totalSales = bizTxnsFiltered.filter(t => t.type === 'sale').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpenses = bizTxnsFiltered.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const lastTxn = bizTxnsFiltered.length > 0 ? bizTxnsFiltered.reduce((m, t) => Math.max(m, t.createdAt || 0), 0) : null;

  const totalCredit = bizCustTxns.filter(t => t.type === 'credit_add').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalPaid = bizCustTxns.filter(t => t.type === 'payment').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalReversed = bizCustTxns.filter(t => t.type === 'reversal').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const outstandingCredit = Math.max(totalCredit - totalPaid - totalReversed, 0);

  const custBalances: Record<number, { credit: number; paid: number; reversed: number; dueDate: number | null }> = {};
  for (const ct of bizCustTxns) {
    const cid = ct.customerId;
    if (!cid) continue;
    if (!custBalances[cid]) custBalances[cid] = { credit: 0, paid: 0, reversed: 0, dueDate: null };
    if (ct.type === 'credit_add') custBalances[cid].credit += Number(ct.amount || 0);
    if (ct.type === 'payment') custBalances[cid].paid += Number(ct.amount || 0);
    if (ct.type === 'reversal') custBalances[cid].reversed += Number(ct.amount || 0);
    if (ct.dueDate && (!custBalances[cid].dueDate || ct.dueDate > custBalances[cid].dueDate)) {
      custBalances[cid].dueDate = Number(ct.dueDate) || null;
    }
  }
  const now = Date.now();
  const overdueCustomers = Object.values(custBalances).filter(b => b.dueDate && b.dueDate < now && b.credit - b.paid - b.reversed > 0);
  const totalOverdueExposure = overdueCustomers.reduce((s, b) => s + (b.credit - b.paid - b.reversed), 0);

  const recentSnapshots = await db.select().from(snapshots).where(eq(snapshots.userId, biz.ownerUserId)).orderBy(snapshots.createdAt, 'desc').limit(5);

  const customerTelegramLinked = bizCustomers.filter(c => c.telegramChatId).length;
  let quota = { count: 0, limit: 0 };
  try { quota = await getQuotaInfo(businessIdNum); } catch {}
  const deliveryFailures = bizCustTxns.filter(t => t.telegramDeliveryState && t.telegramDeliveryState !== 'sent').length;

  const logRows = await db.select().from(adminShopLogs).where(eq(adminShopLogs.businessId, businessIdNum)).orderBy(desc(adminShopLogs.createdAt)).limit(100);
  const notes = logRows.filter(r => r.type === 'note').map(r => ({ id: r.id, body: r.body, createdAt: r.createdAt?.toISOString() || null, adminPhone: r.adminPhone || null }));
  const log = logRows.filter(r => r.type !== 'note').map(r => ({ id: r.id, type: r.type, channel: r.channel, title: r.title, body: r.body, status: r.status, createdAt: r.createdAt?.toISOString() || null }));

  return res.json({
    ok: true,
    shop: {
      id: biz.id,
      name: biz.name,
      slug: biz.slug,
      phone: ownerUser?.phoneNumber || null,
      phoneMasked: maskPhone(ownerUser?.phoneNumber || null),
      telegramChatId: ownerUser?.telegramChatId || null,
      ownerTelegramLinked: !!ownerUser?.telegramChatId,
      preferredLang: biz.preferredLang,
      phoneRequired: biz.phoneRequired,
      approvalRequired: biz.approvalRequired,
      createdAt: biz.createdAt?.toISOString() || null,
      updatedAt: biz.updatedAt?.toISOString() || null,
      ownerCreatedAt: ownerUser?.createdAt ? new Date(ownerUser.createdAt).toISOString() : null,
    },
    comms: {
      smsEnabled: isSmsEnabled(),
      smsUsed: quota.count,
      smsLimit: quota.limit,
      ownerTelegramLinked: !!ownerUser?.telegramChatId,
      customerTelegramLinked,
      customerTelegramTotal: bizCustomers.length,
      customerTelegramAdoption: bizCustomers.length > 0 ? Math.round((customerTelegramLinked / bizCustomers.length) * 100) : 0,
      deliveryFailures,
    },
    members: ownerMemberRows.map(m => ({ role: m.role, displayName: m.displayName || null })),
    stats: {
      totalTransactions: bizTxnsFiltered.length,
      totalSales,
      totalExpenses,
      totalCredit,
      totalPaid,
      totalReversed,
      outstandingCredit,
      totalCustomers: bizCustomers.length,
      totalStaff: bizStaff.length,
      activeStaff: bizStaff.filter(s => s.active !== false).length,
      totalDevices: bizDevices.length,
      lastTransactionAt: lastTxn ? new Date(lastTxn).toISOString() : null,
      overdueCustomers: overdueCustomers.length,
      totalOverdueExposure,
    },
    bankShares: bizShares.map(s => ({ bankName: s.bankName, status: s.status, shareSalesData: s.shareSalesData, shareCreditData: s.shareCreditData, shareCustomerData: s.shareCustomerData, consentGivenAt: s.consentGivenAt?.toISOString() || null, expiresAt: s.expiresAt?.toISOString() || null })),
    recentSnapshots: recentSnapshots.map(s => ({ createdAt: s.createdAt?.toISOString() || null, sizeBytes: s.sizeBytes || 0, status: s.status || null })),
    notes,
    log,
  });
  } catch (e) {
    console.error('[admin/shops/:id]', e);
    return res.status(500).json({ error: "Internal server error", request_id: res.locals.requestId });
  }
});

// ─── Admin actions on a shop ──────────────────────────────────────────

// Reset a shop's monthly SMS quota (e.g. after a misconfiguration or as a goodwill gesture).
router.post("/shops/:businessId/reset-sms-quota", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  const businessIdNum = Number(req.params.businessId);
  if (!Number.isInteger(businessIdNum)) return res.status(400).json({ error: "Invalid businessId" });
  const rl = checkAdminRateLimit(`admin:${ctx.phone}:reset-sms-quota`, 5, 60_000);
  if (!rl.ok) return res.status(429).json({ error: "Rate limited", retryAfter: rl.retryAfterSec });
  const exists = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.id, businessIdNum)).limit(1);
  if (!exists[0]) return res.status(404).json({ error: "Shop not found" });
  await resetQuota(businessIdNum);
  await insertAdminLog({ businessId: businessIdNum, adminPhone: ctx.phone, type: 'action', channel: 'system', title: 'Reset SMS quota', status: 'ok' });
  return res.json({ ok: true, message: `SMS quota reset for shop ${businessIdNum}` });
});

// Add a private admin note for a shop.
router.post("/shops/:businessId/notes", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  const businessIdNum = Number(req.params.businessId);
  if (!Number.isInteger(businessIdNum)) return res.status(400).json({ error: "Invalid businessId" });
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  if (!note) return res.status(400).json({ error: "note is required" });
  const [row] = await db.insert(adminShopLogs).values({ businessId: businessIdNum, adminPhone: ctx.phone, type: 'note', body: note, status: 'ok' }).returning();
  return res.json({ ok: true, note: { id: row.id, body: row.body, createdAt: row.createdAt?.toISOString() || null, adminPhone: row.adminPhone || null } });
});

// Reach out to the shop owner: Telegram if linked, SMS fallback if enabled, otherwise a
// manual share link. Everything is logged to the shop's admin log.
router.post("/shops/:businessId/nudge", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  const businessIdNum = Number(req.params.businessId);
  if (!Number.isInteger(businessIdNum)) return res.status(400).json({ error: "Invalid businessId" });
  const rl = checkAdminRateLimit(`admin:${ctx.phone}:nudge`, 30, 60_000);
  if (!rl.ok) return res.status(429).json({ error: "Rate limited", retryAfter: rl.retryAfterSec });
  const biz = await db.select().from(businesses).where(eq(businesses.id, businessIdNum)).limit(1);
  if (!biz[0]) return res.status(404).json({ error: "Shop not found" });
  const ownerMember = await db.select({ userId: businessMembers.userId }).from(businessMembers).where(and(eq(businessMembers.businessId, businessIdNum), eq(businessMembers.role, 'owner'))).limit(1);
  const ownerId = ownerMember[0]?.userId;
  if (!ownerId) return res.status(404).json({ error: "Shop has no owner" });
  const ownerUser = await db.select({ phoneNumber: users.phoneNumber, telegramChatId: users.telegramChatId, displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, ownerId)).limit(1);
  const owner = ownerUser[0];
  if (!owner) return res.status(404).json({ error: "Owner not found" });

  const customMsg = typeof req.body?.message === 'string' && req.body.message.trim() ? req.body.message.trim() : null;
  const defaultMsg = `Hi ${owner.displayName || 'there'}, this is the Gebya team. Let's get your shop fully set up so your customers receive reminders automatically. Tap the link below to connect your Telegram and start getting updates.`;
  const message = customMsg || defaultMsg;

  const bot = getTelegramBotUsername();

  let channel = 'manual';
  let status = 'pending';
  let deepLink = null;
  let detail = null;
  try {
    if (owner.telegramChatId) {
      await sendTelegramTextMessage(owner.telegramChatId, message);
      channel = 'telegram';
      status = 'ok';
      detail = `Telegram sent to chat ${owner.telegramChatId}`;
    } else {
      // Owner not linked yet: mint a one-time owner link token so tapping the
      // deep link connects their Telegram to this account automatically.
      const linkToken = crypto.randomUUID();
      await db.update(users).set({ telegramLinkToken: linkToken }).where(eq(users.id, ownerId));
      deepLink = bot ? `https://t.me/${bot.replace(/^@+/, '')}?start=${encodeURIComponent(linkToken)}` : null;
      const fullMsg = deepLink ? `${message}\n\nConnect Telegram: ${deepLink}` : message;
      let reached = false;
      if (isSmsEnabled() && owner.phoneNumber) {
        const sms = await sendSms(owner.phoneNumber, fullMsg);
        if (sms?.success !== false) {
          channel = 'sms';
          status = 'ok';
          detail = sms?.error || (deepLink ? 'SMS sent with connect link' : null);
          reached = true;
        }
      }
      if (!reached && owner.email) {
        const em = await sendEmail({ to: owner.email, subject: 'Gebya — finish setting up your shop', text: fullMsg });
        if (em.success) {
          channel = 'email';
          status = 'ok';
          detail = 'Email sent with connect link';
          reached = true;
        }
      }
      if (!reached) {
        channel = 'manual';
        status = 'pending';
        detail = deepLink ? 'No SMS/email reach — share this link with the owner to connect their Telegram.' : 'Telegram/email not configured; cannot build a link.';
      }
    }
  } catch (e) {
    status = 'failed';
    detail = "Delivery failed";
  }
  await insertAdminLog({ businessId: businessIdNum, adminPhone: ctx.phone, type: 'message', channel, title: 'Owner nudge', body: message, status });
  return res.json({ ok: status !== 'failed', channel, status, deepLink, detail, message });
});

// Re-send reminders to customers of this shop whose last delivery failed.
router.post("/shops/:businessId/resend-reminders", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  const businessIdNum = Number(req.params.businessId);
  if (!Number.isInteger(businessIdNum)) return res.status(400).json({ error: "Invalid businessId" });
  const rl = checkAdminRateLimit(`admin:${ctx.phone}:resend-reminders`, 10, 60_000);
  if (!rl.ok) return res.status(429).json({ error: "Rate limited", retryAfter: rl.retryAfterSec });
  const biz = await db.select({ id: businesses.id, name: businesses.name }).from(businesses).where(eq(businesses.id, businessIdNum)).limit(1);
  if (!biz[0]) return res.status(404).json({ error: "Shop not found" });

  const failedTxns = await db
    .select()
    .from(customerTransactions)
    .where(and(eq(customerTransactions.businessId, businessIdNum), sql`${customerTransactions.telegramDeliveryState} IS NOT NULL AND ${customerTransactions.telegramDeliveryState} <> 'sent'`));
  const failedCustomerIds = [...new Set(failedTxns.map((t) => t.customerId).filter((id): id is number => typeof id === "number"))];

  const { sendReminder } = await import("../services/reminderSender.js");
  let sent = 0;
  let failed = 0;
  const details: any[] = [];
  const sentIds: number[] = [];
  const failedIds: number[] = [];

  for (const cid of failedCustomerIds) {
    const custRows = await db.select().from(customers).where(eq(customers.id, cid)).limit(1);
    const c = custRows[0];
    if (!c) continue;
    const cTxns = await db.select().from(customerTransactions).where(and(eq(customerTransactions.businessId, businessIdNum), eq(customerTransactions.customerId, cid)));
    let balance = 0;
    let dueDate: number | null = null;
    for (const t of cTxns) {
      const amt = Number(t.amount || 0);
      if (t.type === "credit_add") {
        balance += amt;
        if (t.dueDate && (dueDate == null || Number(t.dueDate) < dueDate)) dueDate = Number(t.dueDate);
      } else if (t.type === "payment") balance -= amt;
      else if (t.type === "reversal") balance -= amt;
    }
    if (balance <= 0) continue;

    const now = Date.now();
    const overdueDays = dueDate ? Math.ceil((now - dueDate) / 864e5) : 0;
    const reminder: any = {
      id: `resend-${businessIdNum}-${cid}-${now}`,
      shopId: businessIdNum,
      customerId: cid,
      chatId: c.telegramChatId || "",
      balance,
      dueDate,
      daysHeld: dueDate ? Math.max(0, Math.ceil((now - dueDate) / 864e5)) : 0,
      language: "en",  // V1: English-only rollout
      urgency: overdueDays > 0 ? "overdue" : "upcoming",
      daysUntilDue: dueDate ? Math.ceil((dueDate - now) / 864e5) : undefined,
      overdueDays: overdueDays > 0 ? overdueDays : undefined,
      queuedAt: now,
      priority: 0,
      customerName: c.displayName || c.name || undefined,
      shopName: biz[0].name || undefined,
      phoneNumber: c.phoneNumber || undefined,
    };

    let result: any;
    try {
      result = await sendReminder(reminder);
    } catch (e) {
      result = { success: false, error: "Failed to complete request" };
    }
    if (result?.success) { sent++; sentIds.push(cid); }
    else { failed++; failedIds.push(cid); }
    details.push({ customerId: cid, name: c.displayName || c.name, success: !!result?.success, error: result?.error || null });
  }

  // Batch the delivery-state flips instead of one UPDATE per customer (was N+1).
  if (sentIds.length) {
    await db
      .update(customerTransactions)
      .set({ telegramDeliveryState: "sent" })
      .where(and(eq(customerTransactions.businessId, businessIdNum), inArray(customerTransactions.customerId, sentIds), sql`${customerTransactions.telegramDeliveryState} IS NOT NULL AND ${customerTransactions.telegramDeliveryState} <> 'sent'`));
  }
  if (failedIds.length) {
    await db
      .update(customerTransactions)
      .set({ telegramDeliveryState: "failed" })
      .where(and(eq(customerTransactions.businessId, businessIdNum), inArray(customerTransactions.customerId, failedIds), sql`${customerTransactions.telegramDeliveryState} IS NOT NULL AND ${customerTransactions.telegramDeliveryState} <> 'sent'`));
  }

  await insertAdminLog({ businessId: businessIdNum, adminPhone: ctx.phone, type: 'action', channel: 'telegram', title: 'Resend failed reminders', body: `scanned=${failedCustomerIds.length} sent=${sent} failed=${failed}`, status: failed === 0 ? 'ok' : 'failed' });
  return res.json({ ok: true, scanned: failedCustomerIds.length, sent, failed, details });
});


router.get("/frictions", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  try {
    const { value, status } = await serveCachedBounded("admin:frictions", computeFrictions);
    if (status === "warming") return res.status(503).json({ error: "warming up", retryAfter: 3 });
    return res.json(value);
  } catch (e) {
    console.error("[admin/frictions]", e);
    return res.status(500).json({ error: "Internal server error", request_id: res.locals.requestId });
  }
});


router.get("/features", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  try {
    const { value, status } = await serveCachedBounded("admin:features", computeFeatures);
    if (status === "warming") return res.status(503).json({ error: "warming up", retryAfter: 3 });
    return res.json(value);
  } catch (e) {
    console.error("[admin/features]", e);
    return res.status(500).json({ error: "Internal server error", request_id: res.locals.requestId });
  }
});

// ─── POST /admin/broadcast ─────────────────────────────────────────────
router.post("/broadcast", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  const { title, body, type, business_id } = req.body;
  if (!title || typeof title !== "string" || !body || typeof body !== "string") return res.status(400).json({ error: "title and body are required" });
  const rl = checkAdminRateLimit(`admin:${ctx.phone}:broadcast`, 10, 60_000);
  if (!rl.ok) return res.status(429).json({ error: "Rate limited", retryAfter: rl.retryAfterSec });

  // Single-shop broadcast: filter ownerMembers to just the requested business
  const whereClause = business_id
    ? and(eq(businessMembers.role, "owner"), eq(businessMembers.active, true), eq(businessMembers.businessId, Number(business_id)))
    : and(eq(businessMembers.role, "owner"), eq(businessMembers.active, true));

  const ownerMembers = await db.select({ userId: businessMembers.userId, businessId: businessMembers.businessId }).from(businessMembers).where(whereClause);
  if (ownerMembers.length === 0) return res.json({ ok: true, sent: 0, message: business_id ? "Shop not found or no active owner" : "No active shops found" });

  const values = ownerMembers.map((m) => ({
    businessId: m.businessId,
    ownerUserId: m.userId,
    type: type || "announcement",
    title: title.slice(0, 255),
    body,
    read: false,
  }));
  await db.insert(notifications).values(values);

  // Best-effort email via SendGrid to every owner who has an address. Failures
  // here never break the in-app broadcast above.
  let emailSent = 0;
  let emailFailed = 0;
  let emailSkipped = ownerMembers.length;
  if (isEmailConfigured()) {
    const ownerIds = ownerMembers.map((m) => m.userId);
    const owners = await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, ownerIds));
    const withEmail = owners.filter((o) => (o.email || "").trim());
    emailSkipped = ownerMembers.length - withEmail.length;
    const results = await Promise.allSettled(
      withEmail.map((o) => sendEmail({ to: o.email as string, subject: title.slice(0, 255), text: body })),
    );
    emailSent = results.filter((r) => r.status === "fulfilled" && (r.value as { success: boolean }).success).length;
    emailFailed = results.length - emailSent;
    if (emailFailed > 0) console.error(`[admin/broadcast] ${emailFailed} email(s) failed to send`);
  }

  return res.json({ ok: true, sent: values.length, total: ownerMembers.length, emailSent, emailFailed, emailSkipped });
});

// ─── POST /admin/push-all (single-shop override via business_id) ──────────────────────
router.post("/push-all", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  const { title, body, business_id } = req.body;
  if (!title || typeof title !== "string" || !body || typeof body !== "string") return res.status(400).json({ error: "title and body are required" });
  const rl = checkAdminRateLimit(`admin:${ctx.phone}:push-all`, 10, 60_000);
  if (!rl.ok) return res.status(429).json({ error: "Rate limited", retryAfter: rl.retryAfterSec });
  const { sendPushToOwner } = await import("../services/pushNotificationSender.js");
  const allSubs = await db.select().from(pushSubscriptions);
  const uniqueBusinessIds = [...new Set(allSubs.map(s => s.businessId))].filter(id => !business_id || id === Number(business_id));
  let totalSent = 0; let totalFailed = 0;
  for (const bizId of uniqueBusinessIds) {
    try { const result = await sendPushToOwner(bizId, { title, body, type: "announcement", id: 0 }, allSubs); totalSent += result.sent; totalFailed += result.failed; } catch { totalFailed++; }
  }
  return res.json({ ok: true, sent: totalSent, failed: totalFailed, businesses: uniqueBusinessIds.length });
});

// ─── GET /admin/export-shops ────────────────────────────────────────────
router.get("/export-shops", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  try {
  const sevenDaysAgo = daysAgo(7);
  const [allBusinesses, allTransactions, allUsers, allCustomerTransactions, allStaffMembers] = await Promise.all([
    db.select().from(businesses), db.select().from(transactions), db.select().from(users), db.select().from(customerTransactions), db.select().from(staffMembers),
  ]);
  const csvRows = ["Shop Name,Owner Phone,Created,Last Transaction,Total Txns,Total Sales (birr),Total Credit (birr),Outstanding (birr),Staff Count,Status"];
  for (const biz of allBusinesses) {
    const bizTxns = allTransactions.filter(t => t.businessId === biz.id);
    const bizCustTxns = allCustomerTransactions.filter(t => t.businessId === biz.id);
    const bizStaff = allStaffMembers.filter(s => s.businessId === biz.id);
    const user = allUsers.find(u => u.id === biz.ownerUserId);
    const lastTxn = bizTxns.length > 0 ? bizTxns.reduce((m, t) => Math.max(m, t.createdAt || 0), 0) : null;
    const totalSales = bizTxns.filter(t => t.type === "sale").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalCredit = bizCustTxns.filter(t => t.type === "credit_add").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalPaid = bizCustTxns.filter(t => t.type === "payment").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalReversed = bizCustTxns.filter(t => t.type === "reversal").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    let status = "new"; if (lastTxn && lastTxn >= sevenDaysAgo) status = "active"; else if (lastTxn) status = "dormant";
    csvRows.push(`"${(biz.name || "").replace(/"/g, '""')}","${maskPhone(user?.phoneNumber || null)}","${biz.createdAt?.toISOString()?.split("T")[0] || ""}","${lastTxn ? new Date(lastTxn).toISOString()?.split("T")[0] : ""}",${bizTxns.length},${totalSales},${totalCredit},${Math.max(totalCredit - totalPaid - totalReversed, 0)},${bizStaff.length},${status}`);
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="gebya-shops-${new Date().toISOString().split("T")[0]}.csv"`);
  return res.send(csvRows.join("\n"));
  } catch (e) {
    console.error('[admin/export-shops]', e);
    return res.status(500).json({ error: "Internal server error", request_id: res.locals.requestId });
  }
});

// ─── GET /admin/warmup ─────────────────────────────────────────────────
// Pre-heats the DB connection and all dashboard caches so the next admin
// load is served instantly. Protected by ADMIN_WARMUP_SECRET (query, header,
// or Vercel cron Bearer token). Intended to be hit by a scheduled cron.
router.get("/warmup", async (req, res) => {
  // Secret accepted only via header (x-warmup-secret or Authorization: Bearer),
  // never as a query param (which would be logged and could leak credentials).
  const secret =
    (req.headers["x-warmup-secret"] as string | undefined) ||
    (req.headers["authorization"] as string | undefined)?.replace(/^Bearer\s+/i, "");
  if (!safeEqual(secret, process.env.ADMIN_WARMUP_SECRET)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const results = await Promise.all([
    warmDb().then((ok) => ({ db: ok })),
    warmCache("admin:overview", computeOverview),
    warmCache("admin:shops:500:0", () => computeShops({ query: {} })),
    warmCache("admin:features", computeFeatures),
    warmCache("admin:frictions", computeFrictions),
  ]);
  return res.json({ ok: true, results });
});

// ─── GET /admin/logs ────────────────────────────────────────────────────
// Global, cross-shop admin action feed (audit trail). Returns recent rows from
// admin_shop_logs ordered newest-first. Used by the Command Center "Activity"
// tab so the team can see what was done, when, and by which admin phone.
router.get("/logs", async (req, res) => {
  const ctx = await requireAdmin(req);
  if (!ctx) return res.status(401).json({ error: "Admin access required" });
  try {
    const limit = Math.min(
      Math.max(parseInt((req.query.limit as string) || "50", 10) || 50, 1),
      200,
    );
    const offset = Math.max(parseInt((req.query.offset as string) || "0", 10) || 0, 0);
    const rows = await db
      .select()
      .from(adminShopLogs)
      .orderBy(desc(adminShopLogs.createdAt))
      .limit(limit)
      .offset(offset);
    return res.json({ logs: rows, limit, offset });
  } catch (e) {
    console.error("[admin/logs]", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
