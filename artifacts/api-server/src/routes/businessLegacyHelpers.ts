import { type Request } from "express";
import { requireDb } from "@workspace/db";
import { users, businessMembers } from "@workspace/db/schema";
import { normalizePhone } from "@workspace/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";
import { verifyJwt } from "./auth.js";

export function getUserIdFromRequest(req: Request): number | null {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return verifyJwt(token)?.userId || null;
}

export async function getBusinessForUser(userId: number) {
  const rows = await requireDb()
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

export async function ensureUser(phone?: string): Promise<number> {
  if (phone) {
    const normalized = normalizePhone(phone);
    if (normalized) {
      const rows = await requireDb().select().from(users).where(eq(users.phoneNumber, normalized)).limit(1);
      if (rows.length > 0) return rows[0].id;
      const [inserted] = await requireDb().insert(users).values({ phoneNumber: normalized, active: true }).returning();
      return inserted.id;
    }
  }
  const placeholder = `anon-${crypto.randomUUID()}@local`;
  const [inserted] = await requireDb().insert(users).values({ phoneNumber: placeholder, active: true }).returning();
  return inserted.id;
}

export function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}
