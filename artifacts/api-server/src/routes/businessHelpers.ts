import { requireDb } from "@workspace/db";
import { businessMembers, invites } from "@workspace/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { verifyJwt } from "./auth.js";

export function getUserIdFromRequest(req: any): number | null {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return verifyJwt(token)?.userId || null;
}

export function getRequestedBizId(req: any): number | undefined {
  const h = req.headers["x-business-id"];
  const id = h ? Number(h) : undefined;
  return id && Number.isInteger(id) ? id : undefined;
}

export async function getBusinessForUser(userId: number, businessId?: number) {
  const filters: any[] = [eq(businessMembers.userId, userId)];
  if (businessId) filters.push(eq(businessMembers.businessId, businessId));
  const rows = await requireDb()
    .select({ businessId: businessMembers.businessId, displayName: businessMembers.displayName })
    .from(businessMembers)
    .where(and(...filters))
    .limit(1);

  return rows[0]?.businessId ?? null;
}

export async function findValidInvite(tx: any, token: string) {
  const rows = await tx
    .select({
      id: invites.id,
      businessId: invites.businessId,
      role: invites.role,
      invitedByUserId: invites.invitedByUserId,
      staffName: invites.staffName,
      acceptedAt: invites.acceptedAt,
      revokedAt: invites.revokedAt,
      expiresAt: invites.expiresAt,
    })
    .from(invites)
    .where(
      and(
        eq(invites.token, token),
        isNull(invites.acceptedAt),
        isNull(invites.revokedAt),
        gt(invites.expiresAt, new Date())
      )
    )
    .limit(1);

  return rows[0] ?? null;
}
