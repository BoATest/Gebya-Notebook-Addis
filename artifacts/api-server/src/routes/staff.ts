import { Router, type Request, type Response } from "express";
import { requireDb } from "@workspace/db";
import { staffTasks, staffAttendance } from "@workspace/db/schema";
import { businesses, businessMembers } from "@workspace/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { requireDeviceContext } from "./rbac.js";

const router = Router();

// ─── TASKS ───────────────────────────────────────────────────────────────────

router.get("/tasks", async (req: Request, res: Response) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) return res.status(401).json({ error: "Authorization required" });
  if (!ctx.permissions.can_manage_team && ctx.role !== "owner") {
    return res.status(403).json({ error: "Permission denied" });
  }

  const staffId = req.query.staff_id ? Number(req.query.staff_id) : null;
  const status = req.query.status ? String(req.query.status) : null;

  const conditions = [eq(staffTasks.businessId, ctx.businessId)];
  if (staffId) conditions.push(eq(staffTasks.staffId, staffId));
  if (status) conditions.push(eq(staffTasks.status, status));
  const tasks = await requireDb().select().from(staffTasks).where(and(...conditions)).orderBy(desc(staffTasks.createdAt)).limit(200);
  return res.json({ tasks });
});

router.post("/tasks", async (req: Request, res: Response) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) return res.status(401).json({ error: "Authorization required" });
  if (!ctx.permissions.can_manage_team && ctx.role !== "owner") {
    return res.status(403).json({ error: "Permission denied" });
  }

  const { staffId, title, description, priority, dueDate } = req.body;
  if (!staffId || !title) return res.status(400).json({ error: "staffId and title are required" });

  const inserted = await requireDb().insert(staffTasks).values({
    businessId: ctx.businessId,
    staffId: Number(staffId),
    title: String(title),
    description: description || null,
    priority: priority || "medium",
    dueDate: dueDate ? new Date(dueDate) : null,
    createdBy: ctx.userId,
  }).returning();

  return res.json({ task: inserted[0] });
});

router.patch("/tasks/:taskId", async (req: Request, res: Response) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) return res.status(401).json({ error: "Authorization required" });
  if (!ctx.permissions.can_manage_team && ctx.role !== "owner") {
    return res.status(403).json({ error: "Permission denied" });
  }

  const taskId = Number(req.params.taskId);
  const { status, title, description, priority, dueDate } = req.body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status) {
    updates.status = status;
    if (status === "completed") updates.completedAt = new Date();
  }
  if (title) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (priority) updates.priority = priority;
  if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;

  const updated = await requireDb().update(staffTasks).set(updates).where(and(
    eq(staffTasks.id, taskId),
    eq(staffTasks.businessId, ctx.businessId)
  )).returning();

  if (!updated.length) return res.status(404).json({ error: "Task not found" });
  return res.json({ task: updated[0] });
});

router.delete("/tasks/:taskId", async (req: Request, res: Response) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) return res.status(401).json({ error: "Authorization required" });
  if (!ctx.permissions.can_manage_team && ctx.role !== "owner") {
    return res.status(403).json({ error: "Permission denied" });
  }

  const taskId = Number(req.params.taskId);
  const deleted = await requireDb().delete(staffTasks).where(and(
    eq(staffTasks.id, taskId),
    eq(staffTasks.businessId, ctx.businessId)
  )).returning({ id: staffTasks.id });

  if (!deleted.length) return res.status(404).json({ error: "Task not found" });
  return res.json({ ok: true });
});

// ─── ATTENDANCE ──────────────────────────────────────────────────────────────

router.get("/attendance", async (req: Request, res: Response) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) return res.status(401).json({ error: "Authorization required" });
  if (!ctx.permissions.can_manage_team && ctx.role !== "owner") {
    return res.status(403).json({ error: "Permission denied" });
  }

  const staffId = req.query.staff_id ? Number(req.query.staff_id) : null;
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 86400000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();

  const conditions = [
    eq(staffAttendance.businessId, ctx.businessId),
    sql`${staffAttendance.clockIn} >= ${from} AND ${staffAttendance.clockIn} <= ${to}`,
  ];
  if (staffId) conditions.push(eq(staffAttendance.staffId, staffId));
  const records = await requireDb().select().from(staffAttendance).where(and(...conditions)).orderBy(desc(staffAttendance.clockIn)).limit(200);
  return res.json({ attendance: records });
});

router.post("/attendance/clock-in", async (req: Request, res: Response) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) return res.status(401).json({ error: "Authorization required" });

  const staffId = ctx.role === "owner" ? (req.body.staffId || ctx.userId) : ctx.userId;
  const member = await requireDb().select().from(businessMembers).where(and(
    eq(businessMembers.businessId, ctx.businessId),
    eq(businessMembers.userId, Number(staffId))
  )).limit(1);

  if (!member.length) return res.status(403).json({ error: "Not a member of this business" });

  const inserted = await requireDb().insert(staffAttendance).values({
    businessId: ctx.businessId,
    staffId: Number(staffId),
    clockIn: new Date(),
    notes: req.body.notes || null,
  }).returning();

  return res.json({ attendance: inserted[0] });
});

router.post("/attendance/clock-out", async (req: Request, res: Response) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) return res.status(401).json({ error: "Authorization required" });

  const staffId = ctx.role === "owner" ? (req.body.staffId || ctx.userId) : ctx.userId;

  const latest = await requireDb().select().from(staffAttendance).where(and(
    eq(staffAttendance.businessId, ctx.businessId),
    eq(staffAttendance.staffId, Number(staffId)),
    sql`${staffAttendance.clockOut} IS NULL`
  )).orderBy(desc(staffAttendance.clockIn)).limit(1);

  if (!latest.length) return res.status(404).json({ error: "No active clock-in found" });

  const updated = await requireDb().update(staffAttendance).set({
    clockOut: new Date(),
    notes: req.body.notes ? latest[0].notes + (latest[0].notes ? "\n" : "") + req.body.notes : latest[0].notes,
  }).where(eq(staffAttendance.id, latest[0].id)).returning();

  return res.json({ attendance: updated[0] });
});

export default router;