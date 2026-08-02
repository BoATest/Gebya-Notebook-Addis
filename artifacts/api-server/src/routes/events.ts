// @ts-nocheck
import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { staffEvents } from "@workspace/db/schema/staff_events";
import { and, eq, desc, sql, inArray } from "drizzle-orm";
import { PushEventsBody, type SyncEventEnvelopeT, type PushEventsBodyT } from "@workspace/api-zod/events";
import { requireDeviceContext } from "./rbac.js";

const router = Router();

function parsePushEventsBody(body: unknown, res: Response): PushEventsBodyT | null {
  const result = PushEventsBody.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      error: "Validation failed",
      details: result.error.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return null;
  }
  return result.data;
}

function payloadHasForbiddenStaffPhone(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(payloadHasForbiddenStaffPhone);

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase();
    if (
      normalized === "staff_phone"
      || normalized === "staff_phone_number"
      || normalized === "phone_number"
    ) {
      return true;
    }
    if (payloadHasForbiddenStaffPhone(child)) return true;
  }
  return false;
}

function reject(event: SyncEventEnvelopeT, error: string) {
  return {
    client_event_id: event.client_event_id,
    status: "rejected" as const,
    error,
  };
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function activitySummary(payload: Record<string, unknown> | null | undefined, eventType: string): string | null {
  const p = payload || {};
  if (eventType === "sale") {
    return textOrNull(p.item_name) || textOrNull(p.item_code) || "Sale";
  }
  if (eventType === "customer_payment") {
    return textOrNull(p.customer_name) || textOrNull(p.customer_id) || "Customer payment";
  }
  if (eventType === "customer_credit") {
    return textOrNull(p.item_name) || textOrNull(p.customer_name) || textOrNull(p.customer_id) || "Dubie";
  }
  return null;
}

router.post("/events/push", async (req: Request, res: Response) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  if (!ctx.permissions.can_add_records) {
    res.status(403).json({ error: "Permission denied", missing_permission: "can_add_records", hint: "Contact your shop owner to grant access" });
    return;
  }

  const body = parsePushEventsBody(req.body, res);
  if (!body) return;

  // Reject events with forbidden payload fields
  const rejectedPrefix = body.events
    .filter((e) => payloadHasForbiddenStaffPhone(e.payload))
    .map((e) => ({ client_event_id: e.client_event_id, status: "rejected" as const, reason: "Staff phone number must not be included in event payload." }));
  const validEvents = body.events.filter((e) => ["sale", "customer_payment", "customer_credit"].includes(e.event_type) && !payloadHasForbiddenStaffPhone(e.payload));
  const invalidEvents = body.events.filter((e) => !["sale", "customer_payment", "customer_credit"].includes(e.event_type) && !payloadHasForbiddenStaffPhone(e.payload))
    .map((e) => ({ client_event_id: e.client_event_id, status: "rejected" as const, reason: "Unsupported event type." }));

  // Batch idempotency check (1 query instead of N)
  const clientEventIds = validEvents.map((e) => e.client_event_id);
  const existingEvents = clientEventIds.length > 0
    ? await db
        .select({ id: staffEvents.id, clientEventId: staffEvents.clientEventId })
        .from(staffEvents)
        .where(and(eq(staffEvents.businessId, ctx.businessId), inArray(staffEvents.clientEventId, clientEventIds)))
    : [];
  const existingMap = new Map(existingEvents.map((e) => [e.clientEventId, e.id]));

  const toInsert = validEvents.filter((e) => !existingMap.has(e.client_event_id));
  const duplicates = validEvents.filter((e) => existingMap.has(e.client_event_id))
    .map((e) => ({ client_event_id: e.client_event_id, status: "duplicate" as const, event_id: String(existingMap.get(e.client_event_id)) }));

  // Batch insert (1 query instead of N)
  let accepted: { client_event_id: string; status: "accepted"; event_id: string; created_at_server: string | undefined }[] = [];
  if (toInsert.length > 0) {
    const inserted = await db.insert(staffEvents).values(
      toInsert.map((event) => ({
        businessId: ctx.businessId,
        userId: ctx.userId,
        clientEventId: event.client_event_id,
        recordId: event.record_id,
        actorNameSnapshot: event.actor_name_snapshot,
        actorRoleAtEvent: event.actor_role_at_event,
        eventType: event.event_type,
        occurredAtDevice: new Date(event.occurred_at_device),
        payload: (event.payload as Record<string, unknown>) ?? {},
      }))
    ).returning({ id: staffEvents.id, createdAt: staffEvents.createdAt, clientEventId: staffEvents.clientEventId });

    accepted = inserted.map((row) => ({
      client_event_id: row.clientEventId,
      status: "accepted" as const,
      event_id: String(row.id),
      created_at_server: row.createdAt?.toISOString(),
    }));
  }

  const results = [...rejectedPrefix, ...invalidEvents, ...duplicates, ...accepted];

  res.json({ results });
});

router.get("/events/activity", async (req: Request, res: Response) => {
  const ctx = await requireDeviceContext(req);
  if (!ctx) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  if (!ctx.permissions.can_manage_team && ctx.role !== "owner") {
    res.status(403).json({ error: "Owner or manager access required." });
    return;
  }

  const rows = await db
    .select()
    .from(staffEvents)
    .where(
      and(
        eq(staffEvents.businessId, ctx.businessId),
        sql`${staffEvents.eventType} IN ('sale', 'customer_payment', 'customer_credit')`
      )
    )
    .orderBy(desc(staffEvents.occurredAtDevice))
    .limit(200);

  const activities = rows.map((row) => ({
    id: String(row.id),
    client_event_id: row.clientEventId,
    event_type: row.eventType,
    staff_name: row.actorNameSnapshot || "",
    staff_role: row.actorRoleAtEvent || "",
    amount: numberOrNull((row.payload as Record<string, unknown> | null)?.amount),
    summary: activitySummary(row.payload as Record<string, unknown> | null, row.eventType),
    note: textOrNull((row.payload as Record<string, unknown> | null)?.note),
    payment_method_label: textOrNull((row.payload as Record<string, unknown> | null)?.payment_method_label),
    occurred_at_device: row.occurredAtDevice?.toISOString() || "",
    created_at_server: row.createdAt?.toISOString() || "",
    sync_state: "synced" as const,
  }));

  res.json({ activities, persistence: "in_memory_preview" });
});

export default router;
