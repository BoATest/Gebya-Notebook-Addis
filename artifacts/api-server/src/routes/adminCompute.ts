// Platform Admin — heavy aggregate "compute" functions.
//
// Extracted from routes/admin.ts so the route file stays focused on HTTP
// concerns. These are pure DB aggregates (no request/response handling) and are
// cached via serveCachedBounded/warmCache in the route handlers.
// @ts-nocheck
import { db } from "@workspace/db";
import { sql, eq, gt } from "drizzle-orm";
import {
  users,
  businesses,
  devices,
  customers,
  customerTransactions,
  transactions,
  staffMembers,
  invites,
  otps,
  snapshots,
  businessMembers,
  supplierTransactions,
} from "@workspace/db/schema";
import { serveCachedBounded, warmCache } from "../lib/adminCache.js";
import { isSmsEnabled } from "../services/smsSender.js";

export function daysAgo(n: number): number {
  return Date.now() - n * 24 * 60 * 60 * 1000;
}

export function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return "****" + digits.slice(-4);
}

export async function computeOverview() {
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

export async function computeShops(req: any) {
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

export async function computeFrictions() {
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

export async function computeFeatures() {
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
