import db, { getIdentity } from '../db';
import eventsApi from '../api/events';
import { processStaffEventQueue, STAFF_EVENT_PUSH, STAFF_EVENT_STATUSES } from './staffEventSync';

const EVENT_LABELS = {
  sale: 'Sale',
  customer_payment: 'Customer paid',
  customer_credit: 'Added to Dubie',
};

const SYNC_LABELS = {
  waiting_to_sync: 'Waiting to sync',
  synced: 'Synced',
  needs_retry: 'Needs retry',
};

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function isoOrNow(value) {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function summaryFor(eventType, payload = {}) {
  if (eventType === 'sale') return textOrNull(payload.item_name) || textOrNull(payload.item_code) || 'Sale';
  if (eventType === 'customer_payment') return textOrNull(payload.customer_name) || textOrNull(payload.customer_id) || 'Customer payment';
  if (eventType === 'customer_credit') return textOrNull(payload.item_name) || textOrNull(payload.customer_name) || textOrNull(payload.customer_id) || 'Dubie';
  return null;
}

export function friendlyEventLabel(eventType) {
  return EVENT_LABELS[eventType] || 'Activity';
}

export function friendlySyncLabel(syncState) {
  return SYNC_LABELS[syncState] || 'Waiting to sync';
}

function queueSyncState(status) {
  if (status === STAFF_EVENT_STATUSES.failed) return 'needs_retry';
  if (status === STAFF_EVENT_STATUSES.synced) return 'synced';
  return 'waiting_to_sync';
}

function normalizeServerActivity(item) {
  return {
    id: item.id,
    client_event_id: item.client_event_id,
    event_type: item.event_type,
    staff_name: item.staff_name || 'Staff',
    staff_role: item.staff_role || 'staff',
    amount: numberOrNull(item.amount),
    summary: textOrNull(item.summary),
    note: textOrNull(item.note),
    payment_method_label: textOrNull(item.payment_method_label),
    occurred_at_device: isoOrNow(item.occurred_at_device),
    created_at_server: isoOrNow(item.created_at_server),
    sync_state: 'synced',
    source: 'server',
  };
}

function normalizeQueueRow(row) {
  const envelope = row.payload || {};
  const payload = envelope.payload || {};
  const eventType = row.event_type || envelope.event_type;
  if (!eventType) return null;

  return {
    id: `local-${row.id}`,
    client_event_id: row.client_event_id || envelope.client_event_id || row.idempotency_key || `local-${row.id}`,
    event_type: eventType,
    staff_name: textOrNull(envelope.actor_name_snapshot) || 'Staff',
    staff_role: textOrNull(envelope.actor_role_at_event) || 'staff',
    amount: numberOrNull(payload.amount),
    summary: summaryFor(eventType, payload),
    note: textOrNull(payload.note),
    payment_method_label: textOrNull(payload.payment_method_label),
    occurred_at_device: isoOrNow(envelope.occurred_at_device || row.created_at),
    created_at_server: null,
    sync_state: queueSyncState(row.status),
    source: 'local',
  };
}

async function localActivityRows({ includeSynced = false } = {}) {
  const rows = await db.sync_queue.toArray().catch(() => []);
  return rows
    .filter((row) => (
      row.kind === STAFF_EVENT_PUSH
      && (includeSynced || row.status !== STAFF_EVENT_STATUSES.synced)
    ))
    .map(normalizeQueueRow)
    .filter(Boolean);
}

function mergeActivities(serverRows, localRows) {
  const seen = new Set();
  const merged = [];

  for (const row of serverRows) {
    if (!row.client_event_id || seen.has(row.client_event_id)) continue;
    seen.add(row.client_event_id);
    merged.push(row);
  }

  for (const row of localRows) {
    if (!row.client_event_id || seen.has(row.client_event_id)) continue;
    seen.add(row.client_event_id);
    merged.push(row);
  }

  return merged.sort((a, b) => new Date(b.occurred_at_device).getTime() - new Date(a.occurred_at_device).getTime());
}

export async function loadStaffActivityFeed() {
  const identity = await getIdentity();
  const localRows = await localActivityRows({ includeSynced: false });

  if (!identity?.device_token) {
    return {
      activities: localRows,
      source: 'local',
      persistence: 'in_memory_preview',
      error: 'Owner identity is not available on this phone.',
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      activities: localRows,
      source: 'local',
      persistence: 'in_memory_preview',
      offline: true,
    };
  }

  try {
    const response = await eventsApi.listActivity(identity.device_token);
    const serverRows = (response?.activities || []).map(normalizeServerActivity);
    return {
      activities: mergeActivities(serverRows, localRows),
      source: 'server',
      persistence: response?.persistence || 'in_memory_preview',
    };
  } catch (error) {
    return {
      activities: await localActivityRows({ includeSynced: true }),
      source: 'local',
      persistence: 'in_memory_preview',
      error: error?.message || 'Could not refresh staff activity.',
    };
  }
}

export async function retryStaffActivityFeed() {
  await processStaffEventQueue({ limit: 10 });
  return loadStaffActivityFeed();
}
