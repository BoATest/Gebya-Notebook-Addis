// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import {
  supportTickets,
  supportMessages,
  businessMembers,
  businesses,
  users,
  notifications,
} from "@workspace/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { verifyJwt } from "./auth.js";
import { requireAdmin } from "./admin.js";

const router = Router();

async function getAuthUser(req: any) {
  const authHeader = (req.headers as any).authorization || (req.headers as any).Authorization || "";
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = String(headerValue).replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const decoded = verifyJwt(token);
  if (!decoded || !decoded.userId) return null;
  return { userId: decoded.userId };
}

async function getUserBusiness(userId: number) {
  const rows = await db
    .select({ businessId: businessMembers.businessId, role: businessMembers.role })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.active, true)))
    .orderBy(desc(businessMembers.id))
    .limit(1);
  return rows[0] ?? null;
}

async function isTicketOwner(ticketId: number, userId: number) {
  const rows = await db
    .select({ ownerUserId: supportTickets.ownerUserId })
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  return rows[0]?.ownerUserId === userId;
}

async function isBusinessMemberOfTicket(ticketId: number, userId: number) {
  const rows = await db
    .select({ businessId: supportTickets.businessId })
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  if (!rows[0]) return false;
  const members = await db
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

// Create a ticket for the user's primary business.
router.post("/tickets", async (req: any, res: any) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const { subject, description, priority } = req.body || {};
    if (!subject || !description) {
      return res.status(400).json({ error: "subject and description are required" });
    }

    const business = await getUserBusiness(auth.userId);
    if (!business) {
      return res.status(403).json({ error: "No active business membership" });
    }

    const rows = await db
      .insert(supportTickets)
      .values({
        businessId: business.businessId,
        ownerUserId: auth.userId,
        subject: String(subject).slice(0, 255),
        description: String(description),
        priority: priority && ["low", "normal", "high", "urgent"].includes(priority) ? priority : "normal",
        status: "open",
      })
      .returning();
    const ticket = rows[0];

    await db.insert(supportMessages).values({
      ticketId: ticket.id,
      senderUserId: auth.userId,
      senderRole: "owner",
      body: String(description),
    });

    res.status(201).json({ ticket });
  } catch (err) {
    console.error("support create error", err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// List tickets: platform admins see all, shop members see their own.
router.get("/tickets", async (req: any, res: any) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const admin = await requireAdmin(req);
    let tickets;
    if (admin) {
      const filterBusinessId = typeof req.query.business_id === "string" ? Number(req.query.business_id) : null;
      const query = db
        .select({
          id: supportTickets.id,
          businessId: supportTickets.businessId,
          ownerUserId: supportTickets.ownerUserId,
          subject: supportTickets.subject,
          description: supportTickets.description,
          status: supportTickets.status,
          priority: supportTickets.priority,
          createdAt: supportTickets.createdAt,
          updatedAt: supportTickets.updatedAt,
          resolvedAt: supportTickets.resolvedAt,
          businessName: businesses.name,
          ownerPhone: users.phoneNumber,
        })
        .from(supportTickets)
        .leftJoin(businesses, eq(businesses.id, supportTickets.businessId))
        .leftJoin(users, eq(users.id, supportTickets.ownerUserId));
      tickets = filterBusinessId && Number.isInteger(filterBusinessId)
        ? await query.where(eq(supportTickets.businessId, filterBusinessId)).orderBy(desc(supportTickets.createdAt))
        : await query.orderBy(desc(supportTickets.createdAt));
    } else {
      const memberships = await db
        .select({ businessId: businessMembers.businessId })
        .from(businessMembers)
        .where(and(eq(businessMembers.userId, auth.userId), eq(businessMembers.active, true)));
      const businessIds = memberships.map((m) => m.businessId);
      if (businessIds.length === 0) {
        return res.json({ tickets: [] });
      }
      tickets = await db
        .select()
        .from(supportTickets)
        .where(inArray(supportTickets.businessId, businessIds))
        .orderBy(desc(supportTickets.createdAt));
    }

    res.json({ tickets });
  } catch (err) {
    console.error("support list error", err);
    res.status(500).json({ error: "Failed to list tickets" });
  }
});

// Ticket detail with message thread.
router.get("/tickets/:id", async (req: any, res: any) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const ticketId = Number(req.params.id);
    if (!Number.isFinite(ticketId)) return res.status(400).json({ error: "Invalid id" });

    const admin = await requireAdmin(req);
    if (!admin && !(await isBusinessMemberOfTicket(ticketId, auth.userId))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const ticketRows = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
    if (!ticketRows[0]) return res.status(404).json({ error: "Not found" });

    const messages = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(desc(supportMessages.createdAt));

    res.json({ ticket: ticketRows[0], messages });
  } catch (err) {
    console.error("support detail error", err);
    res.status(500).json({ error: "Failed to load ticket" });
  }
});

// Reply to a ticket. Platform admin replies notify the shop owner in-app.
router.post("/tickets/:id/reply", async (req: any, res: any) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const ticketId = Number(req.params.id);
    if (!Number.isFinite(ticketId)) return res.status(400).json({ error: "Invalid id" });

    const body = String(req.body?.body || "").trim();
    if (!body) return res.status(400).json({ error: "body is required" });

    const admin = await requireAdmin(req);
    if (!admin && !(await isBusinessMemberOfTicket(ticketId, auth.userId))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const senderRole = admin ? "admin" : "owner";
    await db.insert(supportMessages).values({
      ticketId,
      senderUserId: auth.userId,
      senderRole,
      body,
    });

    const newStatus = senderRole === "admin" ? "replied" : "open";
    await db
      .update(supportTickets)
      .set({ status: newStatus, updatedAt: sql`now()` })
      .where(eq(supportTickets.id, ticketId));

    if (senderRole === "admin") {
      const ticketRows = await db
        .select({ businessId: supportTickets.businessId, ownerUserId: supportTickets.ownerUserId })
        .from(supportTickets)
        .where(eq(supportTickets.id, ticketId))
        .limit(1);
      if (ticketRows[0]) {
        await db.insert(notifications).values({
          businessId: ticketRows[0].businessId,
          ownerUserId: ticketRows[0].ownerUserId,
          type: "support_reply",
          title: "Support reply",
          body,
          entityType: "support_ticket",
          entityId: String(ticketId),
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("support reply error", err);
    res.status(500).json({ error: "Failed to reply" });
  }
});

// Update ticket status (platform admin or the ticket owner).
router.patch("/tickets/:id/status", async (req: any, res: any) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const ticketId = Number(req.params.id);
    if (!Number.isFinite(ticketId)) return res.status(400).json({ error: "Invalid id" });

    const { status } = req.body || {};
    const allowed = ["open", "replied", "resolved", "closed"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

    const admin = await requireAdmin(req);
    if (!admin && !(await isTicketOwner(ticketId, auth.userId))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const isClosed = status === "resolved" || status === "closed";
    await db
      .update(supportTickets)
      .set({
        status,
        updatedAt: sql`now()`,
        ...(isClosed ? { resolvedAt: sql`now()`, resolvedByUserId: auth.userId } : {}),
      })
      .where(eq(supportTickets.id, ticketId));

    res.json({ ok: true });
  } catch (err) {
    console.error("support status error", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;