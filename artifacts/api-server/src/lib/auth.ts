import { requireDb } from "@workspace/db";
import { businessMembers } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export async function getOwnerBusiness(userId: number): Promise<{ businessId: number; isOwner: boolean } | null> {
  const rows = await requireDb()
    .select({ businessId: businessMembers.businessId, role: businessMembers.role })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.active, true)))
    .limit(1);
  if (!rows.length) return null;
  return { businessId: rows[0].businessId, isOwner: rows[0].role === "owner" };
}
