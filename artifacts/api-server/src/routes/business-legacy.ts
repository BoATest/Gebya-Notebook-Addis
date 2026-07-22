// @ts-nocheck
import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { businesses, businessMembers, users, invites } from "@workspace/db/schema";
import { and, eq, isNull, gt } from "drizzle-orm";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { verifyJwt } from "./auth.js";
import { resolvePermissions } from "@workspace/db/schema/permission-defaults";
import { normalizePhone } from "@workspace/db/schema/phone";

const router = Router();
const APP_BASE_URL = process.env.APP_BASE_URL || "https://gebya.app";
const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN = "30d";

function signJwt(userId: number) {
  return jwt.sign({ userId, type: "access" }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function getUserIdFromRequest(req: Request): number | null {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return verifyJwt(token)?.userId || null;
}

async function getBusinessForUser(userId: number) {
  const rows = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
      permissions: businessMembers.permissions,
      displayName: businessMembers.displayName,
    })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.active, true)))
    .limit(1);
  return rows[0] ?? null;
}

async function ensureUser(phone?: string): Promise<number> {
  if (phone) {
    const normalized = normalizePhone(phone);
    if (normalized) {
      const rows = await db.select().from(users).where(eq(users.phoneNumber, normalized)).limit(1);
      if (rows.length > 0) return rows[0].id;
      const [inserted] = await db.insert(users).values({ phoneNumber: normalized, active: true }).returning();
      return inserted.id;
    }
  }
  const placeholder = `anon-${crypto.randomUUID()}@local`;
  const [inserted] = await db.insert(users).values({ phoneNumber: placeholder, active: true }).returning();
  return inserted.id;
}

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

// ---------------------------------------------------------------------------
// POST /api/shops — owner creates a shop
// ---------------------------------------------------------------------------
router.post("/shops", async (req: Request, res: Response) => {
  const { display_name, phone, business_type, phone_required, approval_required } = req.body || {};
  if (!display_name || typeof display_name !== "string" || display_name.trim().length === 0) {
    res.status(400).json({ error: "display_name is required" });
    return;
  }

  let userId = getUserIdFromRequest(req);
  if (!userId) {
    userId = await ensureUser(phone);
  }

  const [biz] = await db.insert(businesses).values({
    ownerUserId: userId,
    name: display_name.trim(),
  }).returning();

  await db.insert(businessMembers).values({
    businessId: biz.id,
    userId,
    displayName: display_name.trim(),
    role: "owner",
    joinedAt: new Date(),
    active: true,
  });

  const joinCode = generateJoinCode();
  const joinCodeToken = crypto.createHash("sha256").update(joinCode).digest("hex");
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  await db.insert(invites).values({
    businessId: biz.id,
    invitedByUserId: userId,
    phoneNumber: phone ? normalizePhone(phone) || "unknown" : "unknown",
    staffName: display_name.trim(),
    role: "cashier",
    token: joinCodeToken,
    expiresAt,
  });

  const userRows = await db.select({ phoneNumber: users.phoneNumber }).from(users).where(eq(users.id, userId)).limit(1);
  const permissions = resolvePermissions("owner", null);
  const authToken = signJwt(userId);

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
// POST /api/shops/join — staff joins via join code
// ---------------------------------------------------------------------------
router.post("/shops/join", async (req: Request, res: Response) => {
  const { join_code, display_name, phone, device_label } = req.body || {};
  if (!join_code || typeof join_code !== "string") {
    res.status(400).json({ error: "join_code is required" });
    return;
  }

  let userId = getUserIdFromRequest(req);
  if (!userId) {
    userId = await ensureUser(phone);
  }

  const cleanCode = join_code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const codeHash = crypto.createHash("sha256").update(cleanCode).digest("hex");

  const inviteRows = await db
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
  const bizRows = await db.select().from(businesses).where(eq(businesses.id, invite.businessId)).limit(1);
  if (!bizRows.length) {
    res.status(404).json({ error: "Shop not found." });
    return;
  }
  const shop = bizRows[0];

  const existing = await db
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, shop.id), eq(businessMembers.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "You are already a member of this shop." });
    return;
  }

  const role = invite.role === "owner" ? "trusted_staff" : invite.role;
  await db.insert(businessMembers).values({
    businessId: shop.id,
    userId,
    displayName: display_name?.trim() || null,
    role,
    invitedByUserId: userId,
    joinedAt: new Date(),
    active: true,
  });

  await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id));

  const permissions = resolvePermissions(role, null);
  const authToken = signJwt(userId);
  const phoneNormalized = phone ? normalizePhone(phone) : null;

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
    device_status: "active",
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

  const [biz] = await db
    .select({ name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, member.businessId))
    .limit(1);

  const [userRec] = await db
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

  const rows = await db
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
  const joinCodeToken = crypto.createHash("sha256").update(joinCode).digest("hex");
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await db.insert(invites).values({
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

  res.json({
    phone_required: !!req.body?.phone_required,
    approval_required: !!req.body?.approval_required,
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

  const targetRows = await db
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

  await db
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

  const targetRows = await db
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, member.businessId), eq(businessMembers.userId, targetUserId)))
    .limit(1);

  if (!targetRows.length) {
    res.status(404).json({ error: "Staff not found." });
    return;
  }

  await db
    .update(businessMembers)
    .set({ active: false })
    .where(eq(businessMembers.id, targetRows[0].id));

  res.json({ deactivated: true, devices_revoked: 0 });
});

// ---------------------------------------------------------------------------
// POST /api/devices/:device_id/approve — owner approves device (no-op in PG)
// ---------------------------------------------------------------------------
router.post("/devices/:device_id/approve", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }
  res.json({ device_id: req.params.device_id, device_status: "active" });
});

// ---------------------------------------------------------------------------
// POST /api/devices/:device_id/reject — owner rejects device (no-op in PG)
// ---------------------------------------------------------------------------
router.post("/devices/:device_id/reject", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }
  res.json({ device_id: req.params.device_id, device_status: "revoked" });
});

// ---------------------------------------------------------------------------
// POST /api/devices/:device_id/revoke — owner revokes device (no-op in PG)
// ---------------------------------------------------------------------------
router.post("/devices/:device_id/revoke", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }
  res.json({ device_id: req.params.device_id, device_status: "revoked" });
});

export default router;
