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

function daysAgo(n: number): number { return Date.now() - n * 24 * 60 * 60 * 1000; }
function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return "****" + digits.slice(-4);
}

// ─── GET /admin/overview ────────────────────────────────────────────────
async function computeOverview() {
  const now = Date.now();
  const sevenDaysAgo = daysAgo(7);
  const oneDayAgo = daysAgo(1);

  const [allUsers, allBusinesses, allDevices, custTotal, custTelegram, allStaffMembers, allInvites, otpAgg, snapAgg] = await Promise.all([
    db.select({ id: users.id, createdAt: users.createdAt }).from(users),
    db.select({ id: businesses.id, createdAt: businesses.createdAt }).from(businesses),
    db.select({ lastSeenAt: devices.lastSeenAt }).from(devices),
    db.select({ count: sql<number>`COUNT(*)` }).from(customers).then(r => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`COUNT(*)` }).from(customers).where(sql`${customers.telegramChatId} IS NOT NULL`).then(r => Number(r[0]?.count ?? 0)),
    db.select({ businessId: staffMembers.businessId, active: staffMembers.active }).from(staffMembers),
    db.select({ acceptedAt: invites.acceptedAt }).from(invites),
    db.select({
      phoneNumber: maskPhone(otps.phoneNumber),
      attempts: sql<number>`COALESCE(SUM(${otps.attempts}), 0)`,
      consumed: sql<number>`COALESCE(SUM(CASE WHEN ${otps.consumed} THEN 1 ELSE 0 END), 0)`,
    }).from(otps).groupBy(otps.phoneNumber),
    db.select({
      userId: snapshots.userId,
      sizeBytes: sql<number>`COALESCE(MAX(${snapshots.sizeBytes}), 0)`,
      createdAt: sql<number>`COALESCE(MAX(${snapshots.createdAt}), 0)`,
    }).from(snapshots).groupBy(snapshots.userId),
  ]);
  const allOtps = otpAgg;
  const allSnapshots = snapAgg.map((s) => ({ userId: s.userId, sizeBytes: s.sizeBytes, createdAt: s.createdAt }));

  const [salesTotal, txnCountResult, shopsDistinct, shopsWeekDistinct, shopsTodayDistinct, creditTotalResult, repaidTotalResult, custBalanceRows] = await Promise.all([
    db.select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` }).from(transactions).where(eq(transactions.type, "sale")).then(r => r[0]?.total ?? 0),
    db.select({ count: sql<number>`COUNT(*)` }).from(transactions).then(r => ({ count: r[0]?.count ?? 0 })),
    db.selectDistinct({ businessId: transactions.businessId }).from(transactions).then(r => new Set(r.map(t => t.businessId).filter(Boolean))),
    db.selectDistinct({ businessId: transactions.businessId }).from(transactions).where(gt(transactions.createdAt, sevenDaysAgo)).then(r => new Set(r.map(t => t.businessId).filter(Boolean))),
    db.selectDistinct({ businessId: transactions.businessId }).from(transactions).where(gt(transactions.createdAt, oneDayAgo)).then(r => new Set(r.map(t => t.businessId).filter(Boolean))),
    db.select({ total: sql<number>`COALESCE(SUM(${customerTransactions.amount}), 0)` }).from(customerTransactions).where(eq(customerTransactions.type, "credit_add")).then(r => r[0]?.total ?? 0),
    db.select({ total: sql<number>`COALESCE(SUM(${customerTransactions.amount}), 0)` }).from(customerTransactions).where(eq(customerTransactions.type, "payment")).then(r => r[0]?.total ?? 0),
    db.select({
      customerId: customerTransactions.customerId,
      credit: sql<number>`COALESCE(SUM(CASE WHEN ${customerTransactions.type} = 'credit_add' THEN ${customerTransactions.amount} ELSE 0 END), 0)`,
      paid: sql<number>`COALESCE(SUM(CASE WHEN ${customerTransactions.type} = 'payment' THEN ${customerTransactions.amount} ELSE 0 END), 0)`,
      reversed: sql<number>`COALESCE(SUM(CASE WHEN ${customerTransactions.type} = 'reversal' THEN ${customerTransactions.amount} ELSE 0 END), 0)`,
      dueDate: sql<number | null>`MAX(${customerTransactions.dueDate})`,
    }).from(customerTransactions).groupBy(customerTransactions.customerId),
  ]);

  const totalSales = salesTotal;
  const totalCredit = creditTotalResult;
  const totalRepaid = repaidTotalResult;
  const allTransactionsCount = txnCountResult.count;
  const shopsWithTxn = shopsDistinct;
  const shopsActiveWeek = shopsWeekDistinct;
  const shopsActiveToday = shopsTodayDistinct;

  const otpGroups: Record<string, { attempts: number; consumed: number }> = {};
  for (const otp of allOtps) {
    const key = maskPhone(otp.phoneNumber);
    if (!otpGroups[key]) otpGroups[key] = { attempts: 0, consumed: 0 };
    otpGroups[key].attempts += otp.attempts || 0;
    if (otp.consumed) otpGroups[key].consumed += 1;
  }
  const avgOtpRetries = Object.values(otpGroups).length > 0
    ? (Object.values(otpGroups).reduce((s, g) => s + g.attempts, 0) / Object.values(otpGroups).length).toFixed(1) : "0";
  const inviteAccepted = allInvites.filter(i => i.acceptedAt).length;

  const customerBalances: Record<number, { credit: number; paid: number; reversed: number; dueDate: number | null }> = {};
  let totalReversed = 0;
  for (const row of custBalanceRows) {
    const cid = row.customerId;
    if (!cid) continue;
    const reversed = Number(row.reversed) || 0;
    totalReversed += reversed;
    customerBalances[cid] = {
      credit: Number(row.credit) || 0,
      paid: Number(row.paid) || 0,
      reversed,
      dueDate: row.dueDate ?? null,
    };
  }
  const overdueExposure = Object.values(customerBalances).filter(b => b.dueDate && b.dueDate < now && b.credit - b.paid - b.reversed > 0).reduce((s, b) => s + (b.credit - b.paid - b.reversed), 0);

  const shopsWithStaff = new Set(allStaffMembers.filter(s => s.businessId).map(s => s.businessId));
  const totalActiveStaff = allStaffMembers.filter(s => s.active !== false).length;
  const telegramLinked = custTelegram;

  const latestBackups: Record<number, { sizeBytes: number; createdAt: number }> = {};
  for (const snap of allSnapshots) {
    const uid = snap.userId;
    if (!latestBackups[uid] || (snap.createdAt || 0) > latestBackups[uid].createdAt) latestBackups[uid] = { sizeBytes: snap.sizeBytes || 0, createdAt: snap.createdAt || 0 };
  }
  const staleDevices = allDevices.filter(d => { const ls = d.lastSeenAt?.getTime?.() || 0; return ls > 0 && ls < sevenDaysAgo; }).length;

  // Daily transaction counts for growth timeline (14 days) from SQL
  const fourteenDaysAgo = daysAgo(14);
  const txnDailyRows = await db.select({
    dayBucket: sql<number>`FLOOR(${transactions.createdAt} / 86400000)`,
    count: sql<number>`COUNT(*)`,
  }).from(transactions).where(gt(transactions.createdAt, fourteenDaysAgo)).groupBy(sql`1`);
  const txnCountByDay: Record<number, number> = {};
  for (const row of txnDailyRows) txnCountByDay[Number(row.dayBucket)] = Number(row.count) || 0;

  const growthTimeline: { date: string; shops: number; users: number; transactions: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0); dayStart.setDate(dayStart.getDate() - i);
    const dayMs = dayStart.getTime(); const nextDayMs = dayMs + 86400000;
    const dayBucket = Math.floor(dayMs / 86400000);
    growthTimeline.push({
      date: dayStart.toISOString().split("T")[0],
      shops: allBusinesses.filter(b => { const t = b.createdAt?.getTime?.() || 0; return t >= dayMs && t < nextDayMs; }).length,
      users: allUsers.filter(u => { const t = u.createdAt?.getTime?.() || 0; return t >= dayMs && t < nextDayMs; }).length,
      transactions: txnCountByDay[dayBucket] || 0,
    });
  }

  return {
    ok: true, generatedAt: new Date().toISOString(),
    platformNumbers: { shops: allBusinesses.length, users: allUsers.length, devices: allDevices.length, transactions: allTransactionsCount, totalSalesBirr: totalSales, totalCreditBirr: totalCredit },
    onboardingFunnel: { registered: allUsers.length, createdShop: allBusinesses.length, madeFirstTxn: shopsWithTxn.size, activeWeek: shopsActiveWeek.size, activeToday: shopsActiveToday.size },
    onboardingQuality: { avgOtpRetries: Number(avgOtpRetries), inviteSent: allInvites.length, inviteAccepted, inviteAcceptRate: allInvites.length > 0 ? Math.round((inviteAccepted / allInvites.length) * 100) : 0, deviceTotal: allDevices.length },
    creditOverview: { totalExtended: totalCredit, totalRepaid, totalReversed, recoveryRate: totalCredit > 0 ? Math.round((totalRepaid / totalCredit) * 100) : 0, outstandingBalance: totalCredit - totalRepaid - totalReversed, overdueExposure, uniqueCreditCustomers: Object.keys(customerBalances).length },
    staffAdoption: { shopsWithMultiStaff: shopsWithStaff.size, totalActiveStaff, avgStaffPerShop: allBusinesses.length > 0 ? (totalActiveStaff / allBusinesses.length).toFixed(1) : "0" },
    deliveryHealth: { telegramLinked, telegramAdoptionRate: custTotal > 0 ? Math.round((telegramLinked / custTotal) * 100) : 0 },
    backupHealth: { shopsBackedUp: Object.keys(latestBackups).length, shopsNeverBackedUp: allUsers.length - Object.keys(latestBackups).length, backupRate: allUsers.length > 0 ? Math.round((Object.keys(latestBackups).length / allUsers.length) * 100) : 0 },
    systemHealth: { staleDevices, totalDevices: allDevices.length },
    growthTimeline,
  };
}

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
async function computeShops(req: any) {
  const sevenDaysAgo = daysAgo(7);
  const [allBusinesses, allUsers, txAgg, ctAgg] = await Promise.all([
    db.select({ id: businesses.id, name: businesses.name, createdAt: businesses.createdAt, ownerUserId: businesses.ownerUserId }).from(businesses),
    db.select({ id: users.id, phoneNumber: users.phoneNumber }).from(users),
    db.select({
      businessId: transactions.businessId,
      totalTxn: sql<number>`COUNT(*)`,
      totalSales: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'sale' THEN ${transactions.amount} ELSE 0 END), 0)`,
      lastTxn: sql<number>`COALESCE(MAX(${transactions.createdAt}), 0)`,
    }).from(transactions).groupBy(transactions.businessId),
    db.select({
      businessId: customerTransactions.businessId,
      credit: sql<number>`COALESCE(SUM(CASE WHEN ${customerTransactions.type} = 'credit_add' THEN ${customerTransactions.amount} ELSE 0 END), 0)`,
      payment: sql<number>`COALESCE(SUM(CASE WHEN ${customerTransactions.type} = 'payment' THEN ${customerTransactions.amount} ELSE 0 END), 0)`,
      reversal: sql<number>`COALESCE(SUM(CASE WHEN ${customerTransactions.type} = 'reversal' THEN ${customerTransactions.amount} ELSE 0 END), 0)`,
    }).from(customerTransactions).groupBy(customerTransactions.businessId),
  ]);
  const txByBiz = new Map(txAgg.map((t) => [t.businessId, t]));
  const ctByBiz = new Map(ctAgg.map((c) => [c.businessId, c]));
  const q = (req.query.q || "").toString().trim().toLowerCase();
  const userPhoneById = new Map(allUsers.map((u) => [u.id, u.phoneNumber || ""]));
  const matched = q
    ? allBusinesses.filter((b) => {
        const name = (b.name || "").toLowerCase();
        const phone = (userPhoneById.get(b.ownerUserId) || "").replace(/[^0-9]/g, "");
        const qn = q.replace(/[^0-9]/g, "");
        return name.includes(q) || (qn.length > 2 && phone.includes(qn));
      })
    : allBusinesses;
  const shopStats = matched.map((biz) => {
    const t = txByBiz.get(biz.id);
    const c = ctByBiz.get(biz.id);
    const totalTxn = Number(t?.totalTxn ?? 0);
    const totalSales = Number(t?.totalSales ?? 0);
    const lastTxn = Number(t?.lastTxn ?? 0);
    const totalCredit = Number(c?.credit ?? 0);
    const paid = Number(c?.payment ?? 0);
    const reversed = Number(c?.reversal ?? 0);
    const outstanding = Math.max(totalCredit - paid - reversed, 0);
    const user = allUsers.find((u) => u.id === biz.ownerUserId);
    let status: "active" | "dormant" | "new" = "new";
    if (lastTxn && lastTxn >= sevenDaysAgo) status = "active"; else if (lastTxn) status = "dormant";
    return {
      id: biz.id, name: biz.name, ownerPhone: maskPhone(user?.phoneNumber || null),
      createdAt: biz.createdAt?.toISOString() || null,
      lastTransactionAt: lastTxn ? new Date(lastTxn).toISOString() : null,
      totalTransactions: totalTxn, totalSalesBirr: totalSales, totalCreditBirr: totalCredit, outstandingBirr: outstanding, status,
    };
  });
   shopStats.sort((a, b) => { if (!a.lastTransactionAt && !b.lastTransactionAt) return 0; if (!a.lastTransactionAt) return 1; if (!b.lastTransactionAt) return -1; return new Date(b.lastTransactionAt).getTime() - new Date(a.lastTransactionAt).getTime(); });
  const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 2000);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const total = shopStats.length;
  const page = shopStats.slice(offset, offset + limit);
  return { ok: true, shops: page, total, limit, offset };
}

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
    return res.status(500).json({ error: 'Internal server error', detail: e instanceof Error ? e.message : String(e) });
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
    detail = e instanceof Error ? e.message : String(e);
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

// ─── GET /admin/frictions ──────────────────────────────────────────────
// Operational "problems & friction" signals across the platform so the
// Gebya team can find shops that need help (no activity, no Telegram, failed
// reminder deliveries, SMS issues, orphaned businesses, etc).
async function computeFrictions() {
  const sevenDaysAgo = daysAgo(7);

  const [allBusinesses, allMembers, allUsers, custAgg, txAgg, ctAgg] = await Promise.all([
    db.select({ id: businesses.id, name: businesses.name, createdAt: businesses.createdAt, ownerUserId: businesses.ownerUserId }).from(businesses),
    db.select({ userId: businessMembers.userId, role: businessMembers.role, businessId: businessMembers.businessId }).from(businessMembers),
    db.select({ id: users.id, phoneNumber: users.phoneNumber, telegramChatId: users.telegramChatId }).from(users),
    db.select({
      businessId: customers.businessId,
      total: sql<number>`COUNT(*)`,
      linked: sql<number>`COALESCE(SUM(CASE WHEN ${customers.telegramChatId} IS NOT NULL THEN 1 ELSE 0 END), 0)`,
    }).from(customers).groupBy(customers.businessId),
    db.select({
      businessId: transactions.businessId,
      lastTxn: sql<number>`COALESCE(MAX(${transactions.createdAt}), 0)`,
    }).from(transactions).groupBy(transactions.businessId),
    db.select({
      businessId: customerTransactions.businessId,
      deliveryFailures: sql<number>`COALESCE(SUM(CASE WHEN ${customerTransactions.telegramDeliveryState} IS NOT NULL AND ${customerTransactions.telegramDeliveryState} <> 'sent' THEN 1 ELSE 0 END), 0)`,
    }).from(customerTransactions).groupBy(customerTransactions.businessId),
  ]);

  const userById = new Map(allUsers.map(u => [u.id, u]));
  const membersByBiz = new Map<number, { userId: number; role: string }[]>();
  for (const m of allMembers) {
    if (!membersByBiz.has(m.businessId)) membersByBiz.set(m.businessId, []);
    membersByBiz.get(m.businessId)!.push({ userId: m.userId, role: m.role });
  }
  const txByBiz = new Map<number, number>(txAgg.map((t) => [t.businessId, Number(t.lastTxn ?? 0)]));
  const custByBiz = new Map<number, { total: number; linked: number }>();
  for (const c of custAgg) {
    if (c.businessId == null) continue;
    custByBiz.set(Number(c.businessId), { total: Number(c.total ?? 0), linked: Number(c.linked ?? 0) });
  }
  const deliveryByBiz = new Map<number, number>(ctAgg.map((c) => [c.businessId, Number(c.deliveryFailures ?? 0)]));

  const sample = (biz: any) => ({
    businessId: biz.id,
    name: biz.name,
    ownerPhone: maskPhone(userById.get(biz.ownerUserId ?? -1)?.phoneNumber || null),
  });

  const dormant: any[] = [];
  const zeroTxn: any[] = [];
  const orphaned: any[] = [];
  const ownerNoTelegram: any[] = [];
  const lowAdoption: any[] = [];
  const onboardingStuck: any[] = [];
  const thirtyDaysAgo = daysAgo(30);

  for (const biz of allBusinesses) {
    const lastTxn = txByBiz.get(biz.id) || 0;
    const members = membersByBiz.get(biz.id) || [];
    const hasOwner = members.some(m => m.role === 'owner');
    const owner = members.find(m => m.role === 'owner') || members[0];
    const ownerUser = owner ? userById.get(owner.userId) : null;

    if (lastTxn === 0) {
      zeroTxn.push(sample(biz));
      // Newly created shop (last 30d) that never recorded a transaction = stuck in onboarding.
      const createdAt = biz.createdAt ? new Date(biz.createdAt).getTime() : 0;
      if (createdAt >= thirtyDaysAgo) onboardingStuck.push(sample(biz));
    } else if (lastTxn < sevenDaysAgo) dormant.push(sample(biz));

    if (!hasOwner) orphaned.push(sample(biz));

    if (ownerUser && !ownerUser.telegramChatId) ownerNoTelegram.push(sample(biz));

    const c = custByBiz.get(biz.id) || { total: 0, linked: 0 };
    if (c.total >= 5) {
      const rate = Math.round((c.linked / c.total) * 100);
      if (rate < 30) lowAdoption.push({ ...sample(biz), adoption: rate });
    }
  }

  const deliveryFailures = [...deliveryByBiz.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([businessId, failures]) => {
      const biz = allBusinesses.find(b => b.id === businessId);
      return { ...(biz ? sample(biz) : { businessId, name: null, ownerPhone: null }), failures };
    });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    smsEnabled: isSmsEnabled(),
    counts: {
      dormantShops: dormant.length,
      zeroTransactionShops: zeroTxn.length,
      orphanedShops: orphaned.length,
      ownerTelegramNotLinked: ownerNoTelegram.length,
      lowTelegramAdoption: lowAdoption.length,
      onboardingStuck: onboardingStuck.length,
      deliveryFailures: deliveryFailures.reduce((s, d) => s + d.failures, 0),
    },
    samples: {
      dormantShops: dormant.slice(0, 15),
      zeroTransactionShops: zeroTxn.slice(0, 15),
      orphanedShops: orphaned.slice(0, 15),
      ownerTelegramNotLinked: ownerNoTelegram.slice(0, 15),
      lowTelegramAdoption: lowAdoption.slice(0, 15),
      onboardingStuck: onboardingStuck.slice(0, 15),
      deliveryFailures,
    },
  };
}

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

// ─── GET /admin/features ───────────────────────────────────────────────
async function computeFeatures() {
  const [creditBiz, supplierBiz, telegramBiz, pmAgg, typeAgg, srcAgg] = await Promise.all([
    db.selectDistinct({ businessId: customerTransactions.businessId }).from(customerTransactions),
    db.selectDistinct({ businessId: supplierTransactions.businessId }).from(supplierTransactions),
    db.selectDistinct({ businessId: customers.businessId }).from(customers).where(sql`${customers.telegramChatId} IS NOT NULL`),
    db.select({ key: transactions.paymentType, count: sql<number>`COUNT(*)` }).from(transactions).groupBy(transactions.paymentType),
    db.select({ key: transactions.type, count: sql<number>`COUNT(*)` }).from(transactions).groupBy(transactions.type),
    db.select({ key: transactions.source, count: sql<number>`COUNT(*)` }).from(transactions).groupBy(transactions.source),
  ]);
  const shopsUsing = {
    credit: new Set(creditBiz.map(t => t.businessId).filter(Boolean)),
    suppliers: new Set(supplierBiz.map(t => t.businessId).filter(Boolean)),
    telegram: new Set(telegramBiz.map(t => t.businessId).filter(Boolean)),
  };
  const toRecord = (rows) => {
    const o = {};
    for (const r of rows) { const k = r.key == null ? 'unknown' : String(r.key); o[k] = Number(r.count || 0); }
    return o;
  };
  const paymentMethods = toRecord(pmAgg);
  const txnTypes = toRecord(typeAgg);
  const sources = toRecord(srcAgg);
  return { ok: true, features: { shopsUsingCredit: shopsUsing.credit.size, shopsUsingSuppliers: shopsUsing.suppliers.size, shopsUsingTelegram: shopsUsing.telegram.size }, paymentMethods, transactionTypes: txnTypes, sources };
}

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
    return res.status(500).json({ error: 'Internal server error', detail: e instanceof Error ? e.message : String(e) });
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
