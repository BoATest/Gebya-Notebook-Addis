import { requireDb } from "@workspace/db";
import { users, businessMembers, adminShopLogs } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyJwt } from "./auth.js";
import { isPlatformAdminUser } from "../services/platformAdmin.js";

export async function requireAdmin(req: any) {
  const authHeader = (req.headers as any).authorization || (req.headers as any).Authorization || "";
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = String(headerValue).replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const decoded = verifyJwt(token);
  if (!decoded || !decoded.userId) return null;
  const userRows = await requireDb().select({ phoneNumber: users.phoneNumber, email: users.email })
    .from(users)
    .where(eq(users.id, decoded.userId))
    .limit(1);
  const user = userRows[0];
  if (!user || !(await isPlatformAdminUser(user))) return null;
  const memberRows = await requireDb().select({ role: businessMembers.role, businessId: businessMembers.businessId })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, decoded.userId), eq(businessMembers.active, true)))
    .limit(1);
  return { userId: decoded.userId, businessId: memberRows[0]?.businessId ?? null, phone: user.phoneNumber };
}

export async function insertAdminLog(entry: {
  businessId: number;
  adminPhone: string | null;
  type: string;
  channel?: string | null;
  title?: string | null;
  body?: string | null;
  status?: string | null;
}) {
  const [row] = await requireDb().insert(adminShopLogs).values(entry).returning();
  return row;
}
