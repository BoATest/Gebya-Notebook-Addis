import { requireDb } from "@workspace/db";
import { supportTickets, businessMembers } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { verifyJwt } from "./auth.js";

export async function getAuthUser(req: any) {
  const authHeader =
    (req.headers as any).authorization || (req.headers as any).Authorization || "";
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = String(headerValue).replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const decoded = verifyJwt(token);
  if (!decoded || !decoded.userId) return null;
  return { userId: decoded.userId };
}

export async function getUserBusiness(userId: number) {
  const rows = await requireDb()
    .select({ businessId: businessMembers.businessId, role: businessMembers.role })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.active, true)))
    .orderBy(desc(businessMembers.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function isTicketOwner(ticketId: number, userId: number) {
  const rows = await requireDb()
    .select({ ownerUserId: supportTickets.ownerUserId })
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  return rows[0]?.ownerUserId === userId;
}

export async function isBusinessMemberOfTicket(ticketId: number, userId: number) {
  const rows = await requireDb()
    .select({ businessId: supportTickets.businessId })
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  if (!rows[0]) return false;
  const members = await requireDb()
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.userId, userId),
        eq(businessMembers.businessId, rows[0].businessId),
        eq(businessMembers.active, true)
      )
    )
    .limit(1);
  return members.length > 0;
}
