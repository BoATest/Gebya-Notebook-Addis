import { Router } from "express";
import { db } from "@workspace/db";
import { businesses, businessMembers, invites, users, notifications } from "@workspace/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import crypto from "crypto";
import { requireRole } from "../middlewares/requireRole.js";
import { verifyJwt } from "./auth.js";
import { requirePermission } from "./rbac.js";
import { isTelegramBotConfigured, sendTelegramTextMessage } from "../services/telegramBotService.js";
import { sendPushToOwner } from "../services/pushNotificationSender.js";

const router = Router();
const APP_BASE_URL = process.env.APP_BASE_URL || "https://gebya.app";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_PERMISSIONS = {
  owner:   { can_manage_team: true, can_delete_records: true, can_edit_settings: true, can_add_records: true, can_view_reports: true },
  cashier: { can_manage_team: false, can_delete_records: false, can_edit_settings: false, can_add_records: true, can_view_reports: true },
  viewer:  { can_manage_team: false, can_delete_records: false, can_edit_settings: false, can_add_records: false, can_view_reports: true },
};

function getRoleDefault(role: string) {
  return DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS] || DEFAULT_PERMISSIONS.viewer;
}

function resolvePermissions(role: string, storedPermissions: any) {
  const base = getRoleDefault(role);
  if (!storedPermissions || typeof storedPermissions !== "object") return base;
  return { ...base, ...storedPermissions };
}

function getUserIdFromRequest(req: any): number | null {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return verifyJwt(token)?.userId || null;
}

async function getBusinessForUser(userId: number) {
  const rows = await db
    .select({ businessId: businessMembers.businessId })
    .from(businessMembers)
    .where(eq(businessMembers.userId, userId))
    .limit(1);
  return rows[0]?.businessId ?? null;
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("+251")) return digits.slice(4);
  if (digits.startsWith("251")) return digits.slice(3);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

async function findValidInvite(tx: any, token: string) {
  const rows = await tx
    .select({
      id: invites.id, businessId: invites.businessId, role: invites.role,
      staffName: invites.staffName, invitedByUserId: invites.invitedByUserId,
      acceptedAt: invites.acceptedAt, revokedAt: invites.revokedAt,
      declinedAt: invites.declinedAt, expiresAt: invites.expiresAt,
    })
    .from(invites)
    .where(and(eq(invites.token, token), isNull(invites.acceptedAt), isNull(invites.revokedAt), isNull(invites.declinedAt), gt(invites.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

async function sendInviteNotification(phoneNumber: string, businessName: string, role: string, inviteLink: string): Promise<{ sent: boolean; method: string }> {
  const roleLabel = role === 'cashier' ? 'Sales Staff' : 'Auditor';
  const messageEn = `The owner of ${businessName} has invited you to join as ${roleLabel}. Download Gebya and join: ${inviteLink}`;
  const messageAm = `የ${businessName} ባለቤት እርስዎን እንደ ${roleLabel} ጋብዘዋል። Gebya አፕሊኬሽን ያወርዱና ይቀላቀሉ። ${inviteLink}`;
  const fullMessage = `${messageEn}\n\n${messageAm}`;
  if (isTelegramBotConfigured()) {
    try {
      const { getSessionByPhone } = await import("../services/telegramStore.js");
      const session = await getSessionByPhone(phoneNumber);
      if (session?.chatId) { await sendTelegramTextMessage(session.chatId, fullMessage); return { sent: true, method: "telegram" }; }
      return { sent: false, method: "telegram_unlinked" };
    } catch { return { sent: false, method: "telegram_error" }; }
  }
  return { sent: false, method: "no_bot" };
}

router.post("/invite", requireRole("owner"), async (req, res) => {
  (req as any).rbacEntityType = "team_invite";
  const ownerId = getUserIdFromRequest(req);
  if (!ownerId) return res.status(401).json({ error: "Authorization required" });
  const { staff_name, phone_number, role } = req.body;
  if (!phone_number || typeof phone_number !== "string") return res.status(400).json({ error: "phone_number is required" });
  if (!staff_name || typeof staff_name !== "string" || staff_name.trim().length < 2) return res.status(400).json({ error: "staff_name is required" });
  const phoneDigits = normalizePhone(phone_number);
  if (!/^9\d{8}$/.test(phoneDigits)) return res.status(400).json({ error: "Phone must be Ethiopian (+251 9xxxxxxxx)" });
  const fullPhone = `+251${phoneDigits}`;
  if (role !== "cashier" && role !== "viewer") return res.status(400).json({ error: "role must be 'cashier' or 'viewer'" });
  const businessId = await getBusinessForUser(ownerId);
  if (!businessId) return res.status(403).json({ error: "No business found" });
  const ownerPhoneRow = await db.select({ phone: users.phoneNumber }).from(users).where(eq(users.id, ownerId)).limit(1);
  const ownerPhone = ownerPhoneRow[0]?.phone || "";
  const ownerDigits = normalizePhone(ownerPhone);
  if (ownerDigits && ownerDigits === phoneDigits) return res.status(400).json({ error: "You cannot invite your own phone number" });
  const existingActive = await db.select({ businessId: businessMembers.businessId }).from(users).innerJoin(businessMembers, eq(businessMembers.userId, users.id)).where(and(eq(users.phoneNumber, fullPhone), eq(businessMembers.active, true))).limit(1);
  if (existingActive.length > 0) return res.status(409).json({ error: "This number is already part of another shop" });
  const bizRows = await db.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, businessId)).limit(1);
  const businessName = bizRows[0]?.name || "a shop";
  const tokenValue = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const inviteLink = `${APP_BASE_URL}/join/${tokenValue}`;
  const notifResult = await sendInviteNotification(fullPhone, businessName, role, inviteLink);
  await db.insert(invites).values({
    businessId: businessId as any, invitedByUserId: ownerId as any, phoneNumber: fullPhone,
    staffName: staff_name.trim(), role, token: tokenValue,
    notificationSent: notifResult.sent, notificationMethod: notifResult.method, expiresAt: expiresAt as any,
  });
  return res.json({ ok: true, invite_link: inviteLink, invite_token: tokenValue, phone_number: fullPhone, staff_name: staff_name.trim(), role, notification_sent: notifResult.sent, notification_method: notifResult.method, expires_at: expiresAt.toISOString() });
});

router.delete("/invites/:inviteId", requireRole("owner"), async (req, res) => {
  (req as any).rbacEntityType = "team_invite_revoke";
  const ownerId = getUserIdFromRequest(req);
  if (!ownerId) return res.status(401).json({ error: "Authorization required" });
  const inviteId = Number(req.params.inviteId);
  if (!Number.isFinite(inviteId)) return res.status(400).json({ error: "Invalid inviteId" });
  const businessId = await getBusinessForUser(ownerId);
  if (!businessId) return res.status(403).json({ error: "No business found" });
  const rows = await db.select({ id: invites.id, acceptedAt: invites.acceptedAt, revokedAt: invites.revokedAt }).from(invites).where(and(eq(invites.id, inviteId), eq(invites.businessId, businessId))).limit(1);
  if (!rows.length) return res.status(404).json({ error: "Invite not found" });
  const inv = rows[0];
  if (inv.acceptedAt) return res.status(410).json({ error: "Invite already accepted" });
  if (inv.revokedAt) return res.status(410).json({ error: "Invite already revoked" });
  await db.update(invites).set({ revokedAt: new Date() }).where(eq(invites.id, inviteId));
  return res.json({ ok: true });
});

router.get("/invites/pending-for-me", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.json({ ok: true, pending: [] });
  const userRows = await db.select({ phone: users.phoneNumber }).from(users).where(eq(users.id, userId)).limit(1);
  if (!userRows.length) return res.json({ ok: true, pending: [] });
  const phone = userRows[0].phone;
  const rows = await db.select({ id: invites.id, businessId: invites.businessId, staffName: invites.staffName as any, token: invites.token, role: invites.role, createdAt: invites.createdAt }).from(invites as any).where(and(eq(invites.phoneNumber, phone), isNull(invites.acceptedAt), isNull(invites.revokedAt), isNull(invites.declinedAt), gt(invites.expiresAt, new Date()))).limit(5);
  const enriched = await Promise.all(rows.map(async (inv: any) => {
    const biz = await db.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, inv.businessId)).limit(1);
    return { ...inv, business_name: biz[0]?.name || "a shop", invite_link: `${APP_BASE_URL}/join/${inv.token}` };
  }));
  return res.json({ ok: true, pending: enriched });
});

router.post("/invites/:inviteId/decline", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: "Authorization required" });
  const inviteId = Number(req.params.inviteId);
  if (!Number.isFinite(inviteId)) return res.status(400).json({ error: "Invalid inviteId" });
  const invRows = await db.select({ id: invites.id, acceptedAt: invites.acceptedAt, revokedAt: invites.revokedAt, declinedAt: invites.declinedAt }).from(invites).where(eq(invites.id, inviteId)).limit(1);
  if (!invRows.length) return res.status(404).json({ error: "Invite not found" });
  const inv = invRows[0];
  if (inv.acceptedAt) return res.status(410).json({ error: "Already accepted" });
  if (inv.revokedAt) return res.status(410).json({ error: "Invite was revoked" });
  if (inv.declinedAt) return res.status(410).json({ error: "Already declined" });
  await db.update(invites).set({ declinedAt: new Date() }).where(eq(invites.id, inviteId));
  return res.json({ ok: true });
});

router.post("/invites/:inviteId/accept", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: "Authorization required" });
  const inviteId = Number(req.params.inviteId);
  if (!Number.isFinite(inviteId)) return res.status(400).json({ error: "Invalid inviteId" });
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select({ id: invites.id, businessId: invites.businessId, role: invites.role, invitedByUserId: invites.invitedByUserId, acceptedAt: invites.acceptedAt, revokedAt: invites.revokedAt, declinedAt: invites.declinedAt, expiresAt: invites.expiresAt }).from(invites).where(eq(invites.id, inviteId)).limit(1);
    if (!rows.length) return { kind: "not_found" as const };
    const inv = rows[0];
    if (inv.acceptedAt) return { kind: "already_used" as const };
    if (inv.revokedAt) return { kind: "revoked" as const };
    if (inv.declinedAt) return { kind: "declined" as const };
    if (inv.expiresAt && inv.expiresAt <= new Date()) return { kind: "expired" as const };
    const existingBizIds = await tx.select({ businessId: businessMembers.businessId }).from(businessMembers).where(eq(businessMembers.userId, userId));
    const existingInThis = existingBizIds.find((m: any) => m.businessId === inv.businessId);
    if (existingInThis) { await tx.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, inviteId)); const biz = await tx.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, inv.businessId)).limit(1); return { kind: "already_member" as const, businessName: biz[0]?.name || "a shop" }; }
    if (existingBizIds.length > 0) return { kind: "different_business" as const };
    await tx.insert(businessMembers).values({ businessId: inv.businessId, userId, role: inv.role, invitedByUserId: inv.invitedByUserId, joinedAt: new Date(), active: true });
    await tx.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, inviteId));
    const biz = await tx.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, inv.businessId)).limit(1);
    return { kind: "joined" as const, businessName: biz[0]?.name || "a shop", role: inv.role };
  });
  if (result.kind === 'not_found') return res.status(404).json({ error: 'Invite not found' });
  if (result.kind === 'already_used') return res.status(410).json({ error: 'Invite already accepted' });
  if (result.kind === 'revoked') return res.status(410).json({ error: 'Invite has been revoked' });
  if (result.kind === 'declined') return res.status(410).json({ error: 'Invite already declined' });
  if (result.kind === 'expired') return res.status(410).json({ error: 'Invite has expired' });
  if (result.kind === 'different_business') return res.status(409).json({ error: 'You already belong to a different business' });

  // Notify owner when a new staff member joins
  if (result.kind === 'joined' && result.businessName) {
    try {
      const invRow = await db.select({ businessId: invites.businessId, staffName: invites.staffName })
        .from(invites).where(eq(invites.id, inviteId)).limit(1);
      if (invRow.length > 0) {
        const ownerRows = await db
          .select({ userId: businessMembers.userId })
          .from(businessMembers)
          .where(and(eq(businessMembers.businessId, invRow[0].businessId), eq(businessMembers.role, "owner"), eq(businessMembers.active, true)))
          .limit(1);
        const ownerUserId = ownerRows[0]?.userId;
        if (ownerUserId) {
          const staffName = invRow[0].staffName || "Staff";
          const [createdNotif] = await db.insert(notifications).values({
            businessId: invRow[0].businessId,
            ownerUserId,
            type: "staff_joined",
            title: "Staff joined",
            body: `${staffName} joined ${result.businessName} as ${result.role}`,
            entityType: "staff_members",
            entityId: String(inviteId),
            actorName: staffName,
            read: false,
          }).returning({ id: notifications.id, type: notifications.type, title: notifications.title, body: notifications.body });
          sendPushToOwner(invRow[0].businessId, { title: createdNotif.title, body: createdNotif.body, type: createdNotif.type, id: createdNotif.id }).catch(() => {});
        }
      }
    } catch (notifErr) {
      console.error("[business] notification creation failed:", notifErr);
    }
  }

  return res.json({ ok: true, joined: true, business_name: result.businessName });
});

router.get("/invites/pending", requireRole("owner"), async (req, res) => {
  (req as any).rbacEntityType = "team_invites_pending";
  const ownerId = getUserIdFromRequest(req);
  if (!ownerId) return res.status(401).json({ error: "Authorization required" });
  const businessId = await getBusinessForUser(ownerId);
  if (!businessId) return res.status(403).json({ error: "No business found" });
  const rows = await db
    .select({
      id: invites.id, phoneNumber: invites.phoneNumber, staffName: invites.staffName as any,
      token: invites.token, role: invites.role, notificationSent: invites.notificationSent,
      notificationMethod: invites.notificationMethod as any, createdAt: invites.createdAt,
      expiresAt: invites.expiresAt, acceptedAt: invites.acceptedAt, declinedAt: invites.declinedAt,
    })
    .from(invites as any)
    .where(and(eq(invites.businessId, businessId), isNull(invites.revokedAt), gt(invites.expiresAt, new Date())))
    .orderBy(sql`${invites.createdAt} DESC`);
  return res.json({ ok: true, pending: rows });
});

router.post("/join/:token", async (req, res) => {
  (req as any).rbacEntityType = "team_join";
  const { token } = req.params;
  const userId = getUserIdFromRequest(req);
  const result = await db.transaction(async (tx) => {
    const invite = await findValidInvite(tx, token);
    if (!invite) {
      const existing = await tx.select({ acceptedAt: invites.acceptedAt, revokedAt: invites.revokedAt, expiresAt: invites.expiresAt }).from(invites).where(eq(invites.token, token)).limit(1);
      if (!existing.length) return { kind: "not_found" as const };
      if (existing[0].acceptedAt) return { kind: "already_used" as const };
      if (existing[0].revokedAt) return { kind: "revoked" as const };
      if (existing[0].expiresAt && existing[0].expiresAt <= new Date()) return { kind: "expired" as const };
      return { kind: "not_found" as const };
    }
    const bizRows = await tx.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, invite.businessId)).limit(1);
    const businessName = bizRows[0]?.name ?? "a shop";
    if (!userId) return { kind: "requires_auth" as const, businessName, role: invite.role, staffName: invite.staffName };
    const existingMembership = await tx.select({ businessId: businessMembers.businessId }).from(businessMembers).where(eq(businessMembers.userId, userId)).limit(1);
    if (existingMembership.length > 0) {
      if (existingMembership[0].businessId === invite.businessId) { await tx.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.token, token)); return { kind: "already_member" as const, businessName, role: invite.role, staffName: invite.staffName }; }
      return { kind: "different_business" as const };
    }
    await tx.insert(businessMembers).values({ businessId: invite.businessId, userId, role: invite.role, invitedByUserId: invite.invitedByUserId, joinedAt: new Date(), active: true });
    await tx.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.token, token));
    return { kind: "joined" as const, businessName, role: invite.role, staffName: invite.staffName };
  });
  if (result.kind === 'not_found') return res.status(404).json({ error: 'Invite not found' });
  if (result.kind === 'already_used') return res.status(410).json({ error: 'Invite already used' });
  if (result.kind === 'revoked') return res.status(410).json({ error: 'Invite has been revoked' });
  if (result.kind === 'expired') return res.status(410).json({ error: 'Invite has expired' });
  if (result.kind === 'different_business') return res.status(409).json({ error: 'You already belong to a different business' });
  if (result.kind === 'requires_auth') return res.json({ ok: true, requires_auth: true, business_name: result.businessName, role: result.role, staff_name: result.staffName });
  return res.json({ ok: true, joined: true, business_name: result.businessName, role: result.role, staff_name: result.staffName });
});

router.get("/members", requireRole("owner"), async (req, res) => {
  (req as any).rbacEntityType = "team_members_list";
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: "Authorization required" });
  const businessId = await getBusinessForUser(userId);
  if (!businessId) return res.status(403).json({ error: "No business found" });
  const rows = await db.select({
    id: businessMembers.id, userId: businessMembers.userId, name: users.phoneNumber,
    phone: users.phoneNumber, phoneNumber: users.phoneNumber, role: businessMembers.role,
    permissions: businessMembers.permissions, joined_at: businessMembers.joinedAt, joinedAt: businessMembers.joinedAt, active: businessMembers.active,
  }).from(businessMembers).innerJoin(users, eq(users.id, businessMembers.userId)).where(eq(businessMembers.businessId, businessId));
  return res.json({ ok: true, members: rows.map((m: any) => ({ ...m, resolved_permissions: resolvePermissions(m.role, m.permissions) })) });
});

router.patch("/members/:userId/permissions", requirePermission("can_edit_settings"), async (req, res) => {
  (req as any).rbacEntityType = "team_member_permissions";
  const ownerId = getUserIdFromRequest(req);
  if (!ownerId) return res.status(401).json({ error: "Authorization required" });
  const targetUserId = Number(req.params.userId);
  if (!Number.isFinite(targetUserId) || targetUserId <= 0) return res.status(400).json({ error: "Invalid userId" });
  if (targetUserId === ownerId) return res.status(403).json({ error: "Cannot modify owner permissions" });
  const businessId = await getBusinessForUser(ownerId);
  if (!businessId) return res.status(403).json({ error: "No business found" });
  const targetRows = await db.select({ id: businessMembers.id, role: businessMembers.role, permissions: businessMembers.permissions }).from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, targetUserId))).limit(1);
  if (!targetRows.length) return res.status(404).json({ error: "Member not found in this business" });
  const { role, permissions: existingPermissions } = targetRows[0];
  const current = resolvePermissions(role, existingPermissions);
  const incoming = req.body as Record<string, unknown>;
  const existingPerms = (existingPermissions ?? {}) as Record<string, boolean>;
  const nextPermissions: Record<string, boolean> = {};
  for (const key of Object.keys(current)) {
    if (incoming[key] !== undefined && typeof incoming[key] === "boolean") nextPermissions[key] = incoming[key] as boolean;
    else if (existingPerms[key] !== undefined) nextPermissions[key] = existingPerms[key];
  }
  const defaults = getRoleDefault(role);
  const permissionsToStore = Object.keys(nextPermissions).every((k) => nextPermissions[k] === (defaults as any)[k]) ? null : nextPermissions;
  await db.update(businessMembers).set({ permissions: permissionsToStore }).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, targetUserId)));
  return res.json({ ok: true, permissions: nextPermissions });
});

export default router;