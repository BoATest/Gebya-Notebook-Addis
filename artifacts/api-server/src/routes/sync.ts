import { Router } from "express";
import { db } from "@workspace/db";
import {
  transactions, customers, customerTransactions, catalogEntries,
  suppliers, supplierTransactions, staffMembers, settings, analytics,
  devices,
} from "@workspace/db/schema";
import { eq, and, gt, inArray } from "drizzle-orm";
import { verifyJwt } from "./auth.js";
import { syncRateLimiter } from "../app.js";

// Max rows per table per push (prevents runaway payloads)
const MAX_ROWS_PER_TABLE = 500;

const router = Router();

// Apply sync-specific rate limit to all routes in this router
router.use(syncRateLimiter);

// ─── Auth middleware for sync routes ───
function getUserIdFromRequest(req: any): number | null {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const decoded = verifyJwt(token);
  return decoded?.userId || null;
}

async function getUserDevices(userId: number): Promise<string[]> {
  const rows = await db.select({ deviceId: devices.deviceId }).from(devices).where(eq(devices.userId, userId));
  return rows.map((r) => r.deviceId);
}

/**
 * Validates that `deviceId` is already linked to `userId`, OR links it if
 * this is the first push from a newly registered device.
 * Returns false if the device is registered to a *different* user — push is rejected.
 */
async function validateAndLinkDevice(userId: number, deviceId: string): Promise<boolean> {
  const existing = await db.select({ userId: devices.userId })
    .from(devices).where(eq(devices.deviceId, deviceId)).limit(1);

  if (existing.length === 0) {
    // New device — link to this user
    await db.insert(devices).values({ userId, deviceId }).onConflictDoUpdate({
      target: devices.deviceId,
      set: { userId, lastSeenAt: new Date() },
    });
    return true;
  }

  // Device exists — reject if it belongs to a different user
  if (existing[0].userId !== userId) return false;

  // Update last-seen
  await db.update(devices).set({ lastSeenAt: new Date() }).where(eq(devices.deviceId, deviceId));
  return true;
}

// ─── Map frontend snake_case → Drizzle camelCase ───
function mapTx(body: any) {
  return {
    localId: body.id,
    deviceId: body.device_id,
    transactionId: body.transaction_id,
    type: body.type,
    amount: body.amount,
    itemName: body.item_name,
    costPrice: body.cost_price,
    quantity: body.quantity,
    profit: body.profit,
    isCredit: body.is_credit,
    customerId: body.customer_id,
    customerName: body.customer_name,
    createdAt: body.created_at,
    updatedAt: body.updated_at,
    ethiopianDate: body.ethiopian_date,
    paymentType: body.payment_type,
    paymentProvider: body.payment_provider,
    source: body.source,
    rawTranscript: body.raw_transcript,
    detectedTotal: body.detected_total,
    wasEdited: body.was_edited,
    transcriptionProvider: body.transcription_provider,
    parsingConfidence: body.parsing_confidence,
    voiceNote: body.voice_note,
    rawAudioRef: body.raw_audio_ref,
    actorRole: body.actor_role,
    actorStaffMemberId: body.actor_staff_member_id,
    actorNameSnapshot: body.actor_name_snapshot,
    schemaVersion: body.schema_version || 1,
  };
}

function mapCustomer(body: any) {
  return {
    localId: body.id,
    deviceId: body.device_id,
    transactionId: body.transaction_id,
    displayName: body.display_name,
    note: body.note,
    phoneNumber: body.phone_number,
    telegramUsername: body.telegram_username,
    telegramChatId: body.telegram_chat_id,
    telegramNotifyEnabled: body.telegram_notify_enabled,
    telegramLinkToken: body.telegram_link_token,
    telegramLinkedAt: body.telegram_linked_at,
    telegramLinkRequestedAt: body.telegram_link_requested_at,
    createdAt: body.created_at,
    updatedAt: body.updated_at,
    schemaVersion: body.schema_version || 1,
  };
}

function mapCustomerTx(body: any) {
  return {
    localId: body.id,
    deviceId: body.device_id,
    transactionId: body.transaction_id,
    customerId: body.customer_id,
    type: body.type,
    amount: body.amount,
    itemNote: body.item_note,
    dueDate: body.due_date,
    referenceCode: body.reference_code,
    telegramDeliveryState: body.telegram_delivery_state,
    telegramDeliveryError: body.telegram_delivery_error,
    telegramDeliveryAttemptedAt: body.telegram_delivery_attempted_at,
    createdAt: body.created_at,
    updatedAt: body.updated_at,
    actorRole: body.actor_role,
    actorStaffMemberId: body.actor_staff_member_id,
    actorNameSnapshot: body.actor_name_snapshot,
    schemaVersion: body.schema_version || 1,
  };
}

function mapCatalog(body: any) {
  return {
    localId: body.id,
    deviceId: body.device_id,
    transactionId: body.transaction_id,
    name: body.name,
    kind: body.kind,
    active: body.active,
    defaultPrice: body.default_price,
    defaultCost: body.default_cost,
    note: body.note,
    createdAt: body.created_at,
    updatedAt: body.updated_at,
    schemaVersion: body.schema_version || 1,
  };
}

function mapSupplier(body: any) {
  return {
    localId: body.id,
    deviceId: body.device_id,
    transactionId: body.transaction_id,
    displayName: body.display_name,
    phoneNumber: body.phone_number,
    note: body.note,
    active: body.active,
    createdAt: body.created_at,
    updatedAt: body.updated_at,
    schemaVersion: body.schema_version || 1,
  };
}

function mapSupplierTx(body: any) {
  return {
    localId: body.id,
    deviceId: body.device_id,
    transactionId: body.transaction_id,
    supplierId: body.supplier_id,
    type: body.type,
    catalogEntryId: body.catalog_entry_id,
    itemName: body.item_name,
    itemKind: body.item_kind,
    quantity: body.quantity,
    amount: body.amount,
    note: body.note,
    createdAt: body.created_at,
    updatedAt: body.updated_at,
    actorRole: body.actor_role,
    actorStaffMemberId: body.actor_staff_member_id,
    actorNameSnapshot: body.actor_name_snapshot,
    schemaVersion: body.schema_version || 1,
  };
}

function mapStaff(body: any) {
  return {
    localId: body.id,
    deviceId: body.device_id,
    transactionId: body.transaction_id,
    displayName: body.display_name,
    role: body.role,
    active: body.active,
    createdAt: body.created_at,
    updatedAt: body.updated_at,
    deactivatedAt: body.deactivated_at,
    schemaVersion: body.schema_version || 1,
  };
}

function mapSetting(body: any, deviceId: string) {
  return {
    deviceId,
    key: body.key,
    value: body.value,
    createdAt: body.created_at,
    updatedAt: body.updated_at,
  };
}

function mapAnalytics(body: any, deviceId: string) {
  return {
    deviceId,
    key: body.key,
    value: body.value,
    numericValue: body.numeric_value,
    createdAt: body.created_at,
    updatedAt: body.updated_at,
  };
}

// ─── PUSH ───
router.post("/push", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: "Authorization required" });

  const { device_id, tables } = req.body;
  if (!device_id || typeof device_id !== "string" || device_id.length > 128) {
    return res.status(400).json({ error: "device_id is required and must be a string ≤ 128 chars" });
  }

  // Reject if device belongs to a different user
  const deviceOk = await validateAndLinkDevice(userId, device_id);
  if (!deviceOk) {
    return res.status(403).json({ error: "Device is registered to a different account" });
  }

  if (tables !== undefined && (typeof tables !== "object" || Array.isArray(tables))) {
    return res.status(400).json({ error: "tables must be an object" });
  }

  const results: Record<string, { count: number }> = {};

  // Helper: cap array length, then upsert rows
  const upsertTable = async <T>(
    key: string,
    table: any,
    conflictTarget: any[],
    mapper: (row: any) => T
  ) => {
    const rows: any[] = tables?.[key];
    if (!Array.isArray(rows) || rows.length === 0) return;
    const capped = rows.slice(0, MAX_ROWS_PER_TABLE);
    let count = 0;
    for (const row of capped) {
      const data = mapper({ ...row, device_id });
      await db.insert(table).values(data).onConflictDoUpdate({ target: conflictTarget, set: data });
      count++;
    }
    results[key] = { count };
  };

  await upsertTable("transactions",           transactions,           [transactions.deviceId, transactions.localId],                   mapTx);
  await upsertTable("customers",              customers,              [customers.deviceId, customers.localId],                         mapCustomer);
  await upsertTable("customer_transactions",  customerTransactions,   [customerTransactions.deviceId, customerTransactions.localId],   mapCustomerTx);
  await upsertTable("catalog_entries",        catalogEntries,         [catalogEntries.deviceId, catalogEntries.localId],               mapCatalog);
  await upsertTable("suppliers",              suppliers,              [suppliers.deviceId, suppliers.localId],                         mapSupplier);
  await upsertTable("supplier_transactions",  supplierTransactions,   [supplierTransactions.deviceId, supplierTransactions.localId],   mapSupplierTx);
  await upsertTable("staff_members",          staffMembers,           [staffMembers.deviceId, staffMembers.localId],                   mapStaff);

  // settings / analytics use (deviceId, key) conflict target
  if (Array.isArray(tables?.settings)) {
    const capped = (tables.settings as any[]).slice(0, MAX_ROWS_PER_TABLE);
    let count = 0;
    for (const row of capped) {
      const data = mapSetting(row, device_id);
      await db.insert(settings).values(data).onConflictDoUpdate({ target: [settings.deviceId, settings.key], set: data });
      count++;
    }
    results.settings = { count };
  }

  if (Array.isArray(tables?.analytics)) {
    const capped = (tables.analytics as any[]).slice(0, MAX_ROWS_PER_TABLE);
    let count = 0;
    for (const row of capped) {
      const data = mapAnalytics(row, device_id);
      await db.insert(analytics).values(data).onConflictDoUpdate({ target: [analytics.deviceId, analytics.key], set: data });
      count++;
    }
    results.analytics = { count };
  }

  return res.json({ ok: true, device_id, results });
});

// ─── PULL ───
router.get("/pull", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Authorization required" });
  }

  const { since } = req.query;
  const sinceMs = since ? Number(since) : 0;

  // Get all devices for this user
  const deviceIds = await getUserDevices(userId);
  if (deviceIds.length === 0) {
    return res.json({ ok: true, user_id: userId, since: sinceMs, pulled_at: Date.now(), tables: {} });
  }

  const [txRows, custRows, custTxRows, catRows, supRows, supTxRows, staffRows, setRows, anaRows] = await Promise.all([
    db.select().from(transactions).where(and(inArray(transactions.deviceId, deviceIds), gt(transactions.updatedAt, sinceMs))),
    db.select().from(customers).where(and(inArray(customers.deviceId, deviceIds), gt(customers.updatedAt, sinceMs))),
    db.select().from(customerTransactions).where(and(inArray(customerTransactions.deviceId, deviceIds), gt(customerTransactions.updatedAt, sinceMs))),
    db.select().from(catalogEntries).where(and(inArray(catalogEntries.deviceId, deviceIds), gt(catalogEntries.updatedAt, sinceMs))),
    db.select().from(suppliers).where(and(inArray(suppliers.deviceId, deviceIds), gt(suppliers.updatedAt, sinceMs))),
    db.select().from(supplierTransactions).where(and(inArray(supplierTransactions.deviceId, deviceIds), gt(supplierTransactions.updatedAt, sinceMs))),
    db.select().from(staffMembers).where(and(inArray(staffMembers.deviceId, deviceIds), gt(staffMembers.updatedAt, sinceMs))),
    db.select().from(settings).where(and(inArray(settings.deviceId, deviceIds), gt(settings.updatedAt, sinceMs))),
    db.select().from(analytics).where(and(inArray(analytics.deviceId, deviceIds), gt(analytics.updatedAt, sinceMs))),
  ]);

  return res.json({
    ok: true,
    user_id: userId,
    since: sinceMs,
    pulled_at: Date.now(),
    tables: {
      transactions: txRows,
      customers: custRows,
      customer_transactions: custTxRows,
      catalog_entries: catRows,
      suppliers: supRows,
      supplier_transactions: supTxRows,
      staff_members: staffRows,
      settings: setRows,
      analytics: anaRows,
    },
  });
});

export default router;

