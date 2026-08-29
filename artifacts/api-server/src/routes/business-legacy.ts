import { Request, Response } from "express";
import { Router } from "express";
import { requireDb } from "@workspace/db";
import { users, devices, otps, businesses, businessMembers, invites } from "@workspace/db/schema";
import { normalizePhone } from "@workspace/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { resolvePermissions } from "@workspace/db/schema/permission-defaults";
import { sendTelegramTextMessage } from "../services/telegramBotService.js";
import { verifyJwt } from "./auth.js";
import { getUserIdFromRequest, getBusinessForUser, ensureUser, generateJoinCode } from "./businessLegacyHelpers.js";

const JOIN_CODE_SIGNING_KEY = process.env.JOIN_CODE_SIGNING_KEY || crypto.randomBytes(32).toString('hex');

const router = Router();
const APP_BASE_URL = process.env.APP_BASE_URL || "https://gebya.app";

if (!process.env.JWT_SECRET) {
  throw new Error(
    "[auth] FATAL: JWT_SECRET is not set. Refusing to start without a signing secret. " +
    "Set JWT_SECRET in your environment before booting."
  );
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "30d";
const JWT_TTL_OWNER_DAYS = Number(process.env.JWT_TTL_OWNER_DAYS || 365);
const JWT_TTL_STAFF_DAYS = Number(process.env.JWT_TTL_STAFF_DAYS || 30);
const LONG_TOKEN_ENABLED = process.env.LONG_TOKEN_ENABLED === "true";

function signJwt(userId: number, role?: string | null) {
  const expiresIn = (LONG_TOKEN_ENABLED
    ? `${role === "staff" ? JWT_TTL_STAFF_DAYS : JWT_TTL_OWNER_DAYS}d`
    : JWT_EXPIRES_IN) as jwt.SignOptions["expiresIn"];
  return jwt.sign({ userId, type: "access", role: role || "owner", jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn });
}

// ---------------------------------------------------------------------------
// POST /api/shops — owner creates a shop
// ---------------------------------------------------------------------------
router.post("/shops", async (req: Request, res: Response) => {
  const { display_name, phone, phone_required, approval_required } = req.body || {};
  if (!display_name || typeof display_name !== "string" || display_name.trim().length === 0) {
    res.status(400).json({ error: "display_name is required" });
    return;
  }

  let userId = getUserIdFromRequest(req);
  if (!userId) {
    userId = await ensureUser(phone);
  }

  const [biz] = await requireDb().insert(businesses).values({
    ownerUserId: userId,
    name: display_name.trim(),
  }).returning();

  await requireDb().insert(businessMembers).values({
    businessId: biz.id,
    userId,
    displayName: display_name.trim(),
    role: "owner",
    joinedAt: new Date(),
    active: true,
  });

  const joinCode = generateJoinCode();
  const normalizedJoinCode = joinCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const joinCodeToken = crypto.createHmac('sha256', JOIN_CODE_SIGNING_KEY).update(normalizedJoinCode).digest("hex");
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  await requireDb().insert(invites).values({
    businessId: biz.id,
    invitedByUserId: userId,
    phoneNumber: phone ? normalizePhone(phone) || "unknown" : "unknown",
    staffName: display_name.trim(),
    role: "cashier",
    token: joinCodeToken,
    expiresAt,
  });

  const userRows = await requireDb().select({ phoneNumber: users.phoneNumber }).from(users).where(eq(users.id, userId)).limit(1);
  const permissions = resolvePermissions("owner", null);
  const authToken = signJwt(userId, "owner");

  res.status(201).json({
    shop_id: biz.id,
    shop_name: biz.name,
    join_code: joinCode,
    join_url: `${APP_BASE_URL}/join?c=${encodeURIComponent(joinCode)}`,
    staff_id: userId,
    device_id: 1,
    display_name: display_name.trim(),
    phone_number: userRows[0]?.phoneNumber || "",
    role: "owner",
    permissions,
    device_token: authToken,
    auth_token: authToken,
    auth_error: null,
    device_status: "active",
    phone_required: !!phone_required,
    approval_required: !!approval_required,
  });
});

// ---------------------------------------------------------------------------
// GET /api/shops/join/:code/verify — verify join code and return shop name
// ---------------------------------------------------------------------------
router.get("/shops/join/:code/verify", async (req: Request, res: Response) => {
  const { code } = req.params;
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Code is required" });
    return;
  }

  const cleanCode = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const codeHash = crypto.createHmac('sha256', JOIN_CODE_SIGNING_KEY).update(cleanCode).digest("hex");

  const inviteRows = await requireDb()
    .select({
      id: invites.id,
      businessId: invites.businessId,
      role: invites.role,
      expiresAt: invites.expiresAt,
    })
    .from(invites)
    .where(
      and(
        eq(invites.token, codeHash),
        isNull(invites.acceptedAt),
        isNull(invites.revokedAt),
      )
    )
    .limit(1);

  if (!inviteRows.length) {
    res.status(404).json({ error: "Code not valid." });
    return;
  }

  const invite = inviteRows[0];
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    res.status(410).json({ error: "Code expired." });
    return;
  }

  const bizRows = await requireDb().select({ name: businesses.name }).from(businesses).where(eq(businesses.id, invite.businessId)).limit(1);
  if (!bizRows.length) {
    res.status(404).json({ error: "Shop not found." });
    return;
  }

  res.json({ shop_name: bizRows[0].name, role: invite.role });
});

// ---------------------------------------------------------------------------
// POST /api/shops/join — staff joins via join code
// ---------------------------------------------------------------------------
router.post("/shops/join", async (req: Request, res: Response) => {
  const { join_code, display_name, phone, device_label, role: requestedRole, auto_approve } = req.body || {};
  if (!join_code || typeof join_code !== "string") {
    res.status(400).json({ error: "join_code is required" });
    return;
  }

  let userId = getUserIdFromRequest(req);
  if (!userId) {
    userId = await ensureUser(phone);
  }

  const cleanCode = join_code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const codeHash = crypto.createHmac('sha256', JOIN_CODE_SIGNING_KEY).update(cleanCode).digest("hex");

  const inviteRows = await requireDb()
    .select({
      id: invites.id,
      businessId: invites.businessId,
      role: invites.role,
    })
    .from(invites)
    .where(
      and(
        eq(invites.token, codeHash),
        isNull(invites.acceptedAt),
        isNull(invites.revokedAt),
        gt(invites.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!inviteRows.length) {
    res.status(404).json({ error: "Code not valid." });
    return;
  }

  const invite = inviteRows[0];
  const bizRows = await requireDb().select().from(businesses).where(eq(businesses.id, invite.businessId)).limit(1);
  if (!bizRows.length) {
    res.status(404).json({ error: "Shop not found." });
    return;
  }
  const shop = bizRows[0];

  const existing = await requireDb()
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, shop.id), eq(businessMembers.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "You are already a member of this shop." });
    return;
  }

  // Role from invite (owner can't be invited), but client can request a role (default cashier)
  const inviteRole = invite.role === "owner" ? "trusted_staff" : invite.role;
  const role = requestedRole && ["cashier", "viewer", "manager", "trusted_staff"].includes(requestedRole)
    ? requestedRole
    : inviteRole;

  await requireDb().insert(businessMembers).values({
    businessId: shop.id,
    userId,
    displayName: display_name?.trim() || null,
    role,
    invitedByUserId: userId,
    joinedAt: new Date(),
    active: true,
  });

  await requireDb().update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id));

  const permissions = resolvePermissions(role, null);
  const authToken = signJwt(userId, "staff");
  const phoneNormalized = phone ? normalizePhone(phone) : null;

  // Auto-approve device by default (default ON for fastest onboarding)
  const deviceStatus = auto_approve !== false ? "active" : "pending";

  res.status(201).json({
    staff_id: userId,
    user_id: userId,
    shop_id: shop.id,
    shop_name: shop.name,
    role,
    permissions,
    device_id: 1,
    device_token: authToken,
    auth_token: authToken,
    auth_error: null,
    device_status: deviceStatus,
    rejoined: false,
    previous_devices: undefined,
    phone_number: phoneNormalized || "",
  });
});

// ---------------------------------------------------------------------------
// GET /api/me — current identity
// ---------------------------------------------------------------------------
router.get("/me", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const member = await getBusinessForUser(userId);
  if (!member) {
    res.status(401).json({ error: "No business membership found." });
    return;
  }

  const [biz] = await requireDb()
    .select({ name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, member.businessId))
    .limit(1);

  const [userRec] = await requireDb()
    .select({ phoneNumber: users.phoneNumber })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const displayName = member.displayName || userRec?.phoneNumber || "";

  const permissions = resolvePermissions(member.role, member.permissions);

  res.json({
    user_id: userId,
    staff_id: userId,
    shop_id: member.businessId,
    role: member.role,
    display_name: displayName,
    phone: userRec?.phoneNumber || "",
    device_id: 1,
    device_status: "active",
    permissions,
  });
});

// ---------------------------------------------------------------------------
// POST /api/shops/:shop_id/staff — owner/manager adds a staff member
// ---------------------------------------------------------------------------
router.post("/shops/:shop_id/staff", async (req: Request, res: Response) => {
  const currentUserId = getUserIdFromRequest(req);
  if (!currentUserId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const shopId = Number(req.params.shop_id);
  if (!Number.isFinite(shopId)) {
    res.status(400).json({ error: "Invalid shop_id" });
    return;
  }

  const member = await getBusinessForUser(currentUserId);
  if (!member || member.businessId !== shopId || (member.role !== "owner" && member.role !== "manager")) {
    res.status(403).json({ error: "Owner or manager only." });
    return;
  }

  const { display_name, phone, role: requestedRole } = req.body || {};
  if (!display_name || typeof display_name !== "string" || !display_name.trim()) {
    res.status(400).json({ error: "display_name is required." });
    return;
  }

  const normalizedPhone = phone ? normalizePhone(phone) : null;
  let userId = await ensureUser(normalizedPhone || undefined);

  const existing = await requireDb()
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, shopId), eq(businessMembers.userId, userId)))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "User is already a member of this shop." });
    return;
  }

  const allowedRoles = ["cashier", "viewer", "manager", "trusted_staff"];
  const role = requestedRole && allowedRoles.includes(requestedRole) ? requestedRole : "cashier";

  await requireDb().insert(businessMembers).values({
    businessId: shopId,
    userId,
    displayName: display_name.trim(),
    role,
    invitedByUserId: currentUserId,
    joinedAt: new Date(),
    active: true,
  });

  const permissions = resolvePermissions(role, null);
  res.status(201).json({
    staff_id: userId,
    display_name: display_name.trim(),
    phone_snapshot: normalizedPhone || "",
    role,
    staff_status: "active",
    permissions,
    joined_at: new Date().toISOString(),
    devices: [],
  });
});

// ---------------------------------------------------------------------------
// GET /api/shops/:shop_id/staff — owner/manager lists members
// ---------------------------------------------------------------------------
router.get("/shops/:shop_id/staff", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const shopId = Number(req.params.shop_id);
  if (!Number.isFinite(shopId)) {
    res.status(400).json({ error: "Invalid shop_id" });
    return;
  }

  const member = await getBusinessForUser(userId);
  if (!member || member.businessId !== shopId) {
    res.status(403).json({ error: "Not authorized for this shop." });
    return;
  }

  if (member.role !== "owner" && member.role !== "manager") {
    res.status(403).json({ error: "Owner or manager only." });
    return;
  }

  const rows = await requireDb()
    .select({
      id: businessMembers.id,
      userId: businessMembers.userId,
      role: businessMembers.role,
      permissions: businessMembers.permissions,
      active: businessMembers.active,
      joinedAt: businessMembers.joinedAt,
      displayName: businessMembers.displayName,
      phoneNumber: users.phoneNumber,
    })
    .from(businessMembers)
    .innerJoin(users, eq(users.id, businessMembers.userId))
    .where(eq(businessMembers.businessId, shopId))
    .orderBy(businessMembers.joinedAt);

  const staff = rows.map((r) => ({
    staff_id: String(r.userId),
    display_name: r.displayName || r.phoneNumber,
    phone_snapshot: r.phoneNumber,
    role: r.role,
    staff_status: r.active ? "active" : "inactive",
    permissions: resolvePermissions(r.role, r.permissions),
    joined_at: r.joinedAt?.toISOString() || "",
    last_seen_at: null,
    deactivated_at: r.active ? null : (r.joinedAt?.toISOString() || ""),
    devices: [],
  }));

  res.json({ staff });
});

// ---------------------------------------------------------------------------
// POST /api/shops/:shop_id/rotate-code — owner rotates join code
// ---------------------------------------------------------------------------
router.post("/shops/:shop_id/rotate-code", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const shopId = Number(req.params.shop_id);
  if (!Number.isFinite(shopId)) {
    res.status(400).json({ error: "Invalid shop_id" });
    return;
  }

  const member = await getBusinessForUser(userId);
  if (!member || member.businessId !== shopId || member.role !== "owner") {
    res.status(403).json({ error: "Owner only." });
    return;
  }

  const joinCode = generateJoinCode();
  const normalizedJoinCode = joinCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const joinCodeToken = crypto.createHmac('sha256', JOIN_CODE_SIGNING_KEY).update(normalizedJoinCode).digest("hex");
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await requireDb().insert(invites).values({
    businessId: shopId,
    invitedByUserId: userId,
    phoneNumber: "unknown",
    staffName: null,
    role: "cashier",
    token: joinCodeToken,
    expiresAt,
  });

  res.json({ join_code: joinCode, join_url: `${APP_BASE_URL}/join?c=${encodeURIComponent(joinCode)}` });
});

// ---------------------------------------------------------------------------
// POST /api/shops/:shop_id/settings — owner updates settings
// ---------------------------------------------------------------------------
router.post("/shops/:shop_id/settings", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const shopId = Number(req.params.shop_id);
  if (!Number.isFinite(shopId)) {
    res.status(400).json({ error: "Invalid shop_id" });
    return;
  }

  const member = await getBusinessForUser(userId);
  if (!member || member.businessId !== shopId || member.role !== "owner") {
    res.status(403).json({ error: "Owner only." });
    return;
  }

  const phoneRequired = !!req.body?.phone_required;
  const approvalRequired = !!req.body?.approval_required;

  await requireDb()
    .update(businesses)
    .set({
      phoneRequired,
      approvalRequired,
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, shopId));

  res.json({
    phone_required: phoneRequired,
    approval_required: approvalRequired,
  });
});

// ---------------------------------------------------------------------------
// GET /api/shops/:shop_id/settings — read shop settings
// ---------------------------------------------------------------------------
router.get("/shops/:shop_id/settings", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const shopId = Number(req.params.shop_id);
  if (!Number.isFinite(shopId)) {
    res.status(400).json({ error: "Invalid shop_id" });
    return;
  }

  const member = await getBusinessForUser(userId);
  if (!member || member.businessId !== shopId) {
    res.status(403).json({ error: "Not a member of this shop." });
    return;
  }

  const rows = await requireDb()
    .select({ phoneRequired: businesses.phoneRequired, approvalRequired: businesses.approvalRequired })
    .from(businesses)
    .where(eq(businesses.id, shopId))
    .limit(1);

  if (!rows.length) {
    res.status(404).json({ error: "Shop not found." });
    return;
  }

  res.json({
    phone_required: rows[0].phoneRequired ?? false,
    approval_required: rows[0].approvalRequired ?? false,
  });
});

// ---------------------------------------------------------------------------
// POST /api/staff/:staff_id/permissions — owner updates permissions
// ---------------------------------------------------------------------------
router.post("/staff/:staff_id/permissions", async (req: Request, res: Response) => {
  const currentUserId = getUserIdFromRequest(req);
  if (!currentUserId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const targetUserId = Number(req.params.staff_id);
  if (!Number.isFinite(targetUserId)) {
    res.status(400).json({ error: "Invalid staff_id" });
    return;
  }

  const member = await getBusinessForUser(currentUserId);
  if (!member || member.role !== "owner") {
    res.status(403).json({ error: "Owner only." });
    return;
  }

  const targetRows = await requireDb()
    .select({ id: businessMembers.id, permissions: businessMembers.permissions })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, member.businessId), eq(businessMembers.userId, targetUserId)))
    .limit(1);

  if (!targetRows.length) {
    res.status(404).json({ error: "Staff not found in this shop." });
    return;
  }

  const { can_create_customer_credit } = req.body || {};
  const existing = (targetRows[0].permissions ?? {}) as Record<string, boolean>;
  const next = { ...existing };
  if (typeof can_create_customer_credit === "boolean") {
    next.can_create_customer_credit = can_create_customer_credit;
  }

  await requireDb()
    .update(businessMembers)
    .set({ permissions: next })
    .where(eq(businessMembers.id, targetRows[0].id));

  const targetMember = await getBusinessForUser(targetUserId);
  res.json({
    staff_id: targetUserId,
    permissions: resolvePermissions(targetMember?.role || "cashier", next),
  });
});

// ---------------------------------------------------------------------------
// POST /api/staff/:staff_id/deactivate — owner deactivates member
// ---------------------------------------------------------------------------
router.post("/staff/:staff_id/deactivate", async (req: Request, res: Response) => {
  const currentUserId = getUserIdFromRequest(req);
  if (!currentUserId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const targetUserId = Number(req.params.staff_id);
  if (!Number.isFinite(targetUserId)) {
    res.status(400).json({ error: "Invalid staff_id" });
    return;
  }

  const member = await getBusinessForUser(currentUserId);
  if (!member || (member.role !== "owner" && member.role !== "manager")) {
    res.status(403).json({ error: "Owner or manager only." });
    return;
  }

  if (targetUserId === currentUserId) {
    res.status(403).json({ error: "Cannot deactivate yourself." });
    return;
  }

  const targetRows = await requireDb()
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, member.businessId), eq(businessMembers.userId, targetUserId)))
    .limit(1);

  if (!targetRows.length) {
    res.status(404).json({ error: "Staff not found." });
    return;
  }

  await requireDb()
    .update(businessMembers)
    .set({ active: false })
    .where(eq(businessMembers.id, targetRows[0].id));

  res.json({ deactivated: true, devices_revoked: 0 });
});

// ---------------------------------------------------------------------------
// POST /api/staff/:staff_id/reactivate — owner reactivates member
// ---------------------------------------------------------------------------
router.post("/staff/:staff_id/reactivate", async (req: Request, res: Response) => {
  const currentUserId = getUserIdFromRequest(req);
  if (!currentUserId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const targetUserId = Number(req.params.staff_id);
  if (!Number.isFinite(targetUserId)) {
    res.status(400).json({ error: "Invalid staff_id" });
    return;
  }

  const member = await getBusinessForUser(currentUserId);
  if (!member || (member.role !== "owner" && member.role !== "manager")) {
    res.status(403).json({ error: "Owner or manager only." });
    return;
  }

  const targetRows = await requireDb()
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, member.businessId), eq(businessMembers.userId, targetUserId)))
    .limit(1);

  if (!targetRows.length) {
    res.status(404).json({ error: "Staff not found." });
    return;
  }

  await requireDb()
    .update(businessMembers)
    .set({ active: true })
    .where(eq(businessMembers.id, targetRows[0].id));

  res.json({ reactivated: true });
});

// ---------------------------------------------------------------------------
// POST /api/devices/:device_id/approve — owner approves device
// ---------------------------------------------------------------------------
router.post("/devices/:device_id/approve", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const deviceId = req.params.device_id;
  const deviceRows = await requireDb()
    .select({ id: devices.id, shopId: devices.shopId, status: devices.status })
    .from(devices)
      .where(eq(devices.deviceId, String(deviceId)))
    .limit(1);

  if (!deviceRows.length) {
    res.status(404).json({ error: "Device not found." });
    return;
  }

  const device = deviceRows[0];
  if (device.shopId) {
    const member = await getBusinessForUser(userId);
    if (!member || member.businessId !== device.shopId || member.role !== "owner") {
      res.status(403).json({ error: "Owner only." });
      return;
    }
  }

  await requireDb()
    .update(devices)
    .set({ status: "active" })
    .where(eq(devices.id, device.id));

  res.json({ device_id: deviceId, device_status: "active" });
});

// ---------------------------------------------------------------------------
// POST /api/devices/:device_id/reject — owner rejects device
// ---------------------------------------------------------------------------
router.post("/devices/:device_id/reject", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const deviceId = req.params.device_id;
  const deviceRows = await requireDb()
    .select({ id: devices.id, shopId: devices.shopId })
    .from(devices)
      .where(eq(devices.deviceId, String(deviceId)))
    .limit(1);

  if (!deviceRows.length) {
    res.status(404).json({ error: "Device not found." });
    return;
  }

  const device = deviceRows[0];
  if (device.shopId) {
    const member = await getBusinessForUser(userId);
    if (!member || member.businessId !== device.shopId || member.role !== "owner") {
      res.status(403).json({ error: "Owner only." });
      return;
    }
  }

  await requireDb()
    .update(devices)
    .set({ status: "revoked" })
    .where(eq(devices.id, device.id));

  res.json({ device_id: deviceId, device_status: "revoked" });
});

// ---------------------------------------------------------------------------
// POST /api/devices/:device_id/revoke — owner revokes device
// ---------------------------------------------------------------------------
router.post("/devices/:device_id/revoke", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const deviceId = req.params.device_id;
  const deviceRows = await requireDb()
    .select({ id: devices.id, shopId: devices.shopId })
    .from(devices)
      .where(eq(devices.deviceId, String(deviceId)))
    .limit(1);

  if (!deviceRows.length) {
    res.status(404).json({ error: "Device not found." });
    return;
  }

  const device = deviceRows[0];
  if (device.shopId) {
    const member = await getBusinessForUser(userId);
    if (!member || member.businessId !== device.shopId || member.role !== "owner") {
      res.status(403).json({ error: "Owner only." });
      return;
    }
  }

  await requireDb()
    .update(devices)
    .set({ status: "revoked" })
    .where(eq(devices.id, device.id));

  res.json({ device_id: deviceId, device_status: "revoked" });
});

export default router;
