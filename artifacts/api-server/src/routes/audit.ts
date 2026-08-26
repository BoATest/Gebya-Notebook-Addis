import { Router, type Request } from "express";
import { requireDb } from "@workspace/db";
import { auditLog, businessMembers, users } from "@workspace/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { verifyJwt } from "./auth.js";
import { isPlatformAdminUser } from "../services/platformAdmin.js";

const router = Router();

// Resolve the effective businessId for the request:
//   - platform admins may pass ?business_id= to inspect any shop
//   - owners are scoped to their own active business
async function resolveAuditScope(req: Request, decodedUserId: number) {
  const userRows = await requireDb().select({ phoneNumber: users.phoneNumber, email: users.email })
    .from(users)
    .where(eq(users.id, decodedUserId))
    .limit(1);
  const isAdmin = await isPlatformAdminUser(userRows[0]);

  if (isAdmin) {
    const param = typeof req.query.business_id === "string" ? Number(req.query.business_id) : null;
    if (!param || !Number.isInteger(param)) {
      return { error: "Platform admins must provide ?business_id=" };
    }
    return { businessId: param, isAdmin: true };
  }

  const memberRows = await requireDb().select({ role: businessMembers.role, businessId: businessMembers.businessId })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, decodedUserId), eq(businessMembers.active, true)))
    .limit(1);

  if (memberRows[0]?.role !== "owner") {
    return { error: "Owner only" };
  }
  const businessId = memberRows[0]?.businessId;
  if (!Number.isInteger(businessId)) {
    return { error: "Business not found" };
  }
  return { businessId, isAdmin: false };
}

/**
 * GET /api/audit/violations
 * Owner: violation attempts for their business.
 * Platform admin: ?business_id= to inspect any shop.
 */
router.get("/violations", async (req, res) => {
  const authHeader = (req.headers as any).authorization || (req.headers as any).Authorization || "";
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = String(headerValue).replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Missing bearer token." });
  }

  const decoded = verifyJwt(token);
  if (!decoded) return res.status(401).json({ error: "Invalid token" });

  const scope = await resolveAuditScope(req, decoded.userId);
  if (scope.error) return res.status(403).json({ error: scope.error });

  const violations = await requireDb().select()
    .from(auditLog)
    .where(and(
      eq(auditLog.action, "ATTEMPTED_VIOLATION"),
      eq(auditLog.businessId, scope.businessId as number)
    ))
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  return res.json({ violations });
});

/**
 * GET /api/audit/activity
 * Owner: business mutation activity for their business.
 * Platform admin: ?business_id= to inspect any shop.
 * Query params:
 *   staff_member_id (optional) — filter by actor
 *   entity_type (optional) — filter by entity type (transaction, customer, credit, supplier, etc.)
 *   date_from (optional) — ISO date, defaults to start of today
 *   date_to (optional) — ISO date, defaults to now
 */
router.get("/activity", async (req, res) => {
  const authHeader = (req.headers as any).authorization || (req.headers as any).Authorization || "";
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = String(headerValue).replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Missing bearer token." });
  }

  const decoded = verifyJwt(token);
  if (!decoded) return res.status(401).json({ error: "Invalid token" });

  const scope = await resolveAuditScope(req, decoded.userId);
  if (scope.error) return res.status(403).json({ error: scope.error });
  const businessIdNum = scope.businessId;

  // Build filters
  const staffMemberIdRaw = typeof req.query.staff_member_id === "string" ? req.query.staff_member_id : undefined;
  const entityTypeRaw = typeof req.query.entity_type === "string" ? req.query.entity_type : undefined;
  const dateFromRaw = typeof req.query.date_from === "string" ? req.query.date_from : undefined;
  const dateToRaw = typeof req.query.date_to === "string" ? req.query.date_to : undefined;

  const staffMemberId = staffMemberIdRaw ? Number(staffMemberIdRaw) : null;
  const entityType = entityTypeRaw || null;

  // Default date_from to start of today in local time
  const now = new Date();
  let dateFrom: Date;
  if (dateFromRaw) {
    const parsed = new Date(dateFromRaw);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: "Invalid date_from" });
    }
    dateFrom = parsed;
  } else {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  let dateTo: Date | null = null;
  if (dateToRaw) {
    const parsed = new Date(dateToRaw);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: "Invalid date_to" });
    }
    dateTo = parsed;
  }

  const conditions: any[] = [
    eq(auditLog.businessId, businessIdNum as number),
    gte(auditLog.createdAt, dateFrom),
    sql`${auditLog.action} <> 'ATTEMPTED_VIOLATION'`,
  ];

  if (Number.isInteger(staffMemberId) && staffMemberId !== null) {
    conditions.push(eq(auditLog.actorStaffMemberId, staffMemberId as number));
  }
  if (entityType) {
    conditions.push(eq(auditLog.entityType, entityType));
  }
  if (dateTo) {
    conditions.push(lte(auditLog.createdAt, dateTo));
  }

  const activity = await requireDb().select()
    .from(auditLog)
    .where(and(...conditions))
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  return res.json({ activity });
});

export default router;