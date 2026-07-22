// @deprecated — Legacy Shop Sync v1 permission resolver (17-capability model).
// New code should use @workspace/db/schema/permission-defaults instead (5-key model).
// Kept for backward compat with events.ts (in-memory event system).
// TODO(phase2): remove when events.ts is rewritten to Postgres.
//
// Permissions are role defaults + per-staff overrides. The role drives
// most capabilities; the owner can override `can_create_customer_credit`
// per-staff in v1. All other capabilities are role-only.
//
// Reference: spec section J.

import type { Role, StaffStatus } from "./shops";

/** The full capability key set. Add keys here when v1.1 ships. */
export type Capability =
  | "can_create_sale"
  | "can_create_customer_credit"
  | "can_create_customer_payment"
  | "can_create_note"
  | "can_create_expense"
  | "can_create_supplier_transaction"
  | "can_view_all_records"
  | "can_edit_synced_own"
  | "can_edit_any_synced"
  | "can_void_record"
  | "can_hard_delete"
  | "can_request_correction"
  | "can_invite_staff"
  | "can_change_settings"
  | "can_view_staff_feed"
  | "can_view_audit_log"
  | "can_approve_device";

/** Per-role defaults. Owner is treated as 'owner' not a default-staff role. */
const ROLE_DEFAULTS: Record<Role, Partial<Record<Capability, boolean>>> = {
  owner: {
    can_create_sale: true,
    can_create_customer_credit: true,
    can_create_customer_payment: true,
    can_create_note: true,
    can_create_expense: true,
    can_create_supplier_transaction: true,
    can_view_all_records: true,
    can_edit_synced_own: true,
    can_edit_any_synced: true,
    can_void_record: true,
    can_hard_delete: true,
    can_request_correction: true,
    can_invite_staff: true,
    can_change_settings: true,
    can_view_staff_feed: true,
    can_view_audit_log: true,
    can_approve_device: true,
  },
  staff: {
    can_create_sale: true,
    can_create_customer_credit: false, // default OFF for Basic Staff; owner can override
    can_create_customer_payment: true,
    can_create_note: true,
    can_view_all_records: false,
    can_edit_synced_own: false,
    can_request_correction: true,
  },
  trusted_staff: {
    can_create_sale: true,
    can_create_customer_credit: true,
    can_create_customer_payment: true,
    can_create_note: true,
    can_create_expense: true,
    can_view_all_records: true,
    can_edit_synced_own: true,
    can_request_correction: true,
  },
  manager: {
    can_create_sale: true,
    can_create_customer_credit: true,
    can_create_customer_payment: true,
    can_create_note: true,
    can_create_expense: true,
    can_create_supplier_transaction: true,
    can_view_all_records: true,
    can_edit_synced_own: true,
    can_edit_any_synced: true,
    can_request_correction: true,
    can_invite_staff: true,
    can_view_staff_feed: true,
    can_view_audit_log: true,
    can_approve_device: true,
  },
};

/**
 * Per-staff overrides layered on top of role defaults.
 *
 * v1 ships ONE override: can_create_customer_credit.
 * In v1.1, more overrides are added (e.g. can_create_expense per-staff).
 *
 * The shape is intentionally narrow: only the keys we ship overrides for.
 * Server-side storage in `staff.permissions` jsonb uses this same shape.
 */
export interface StaffPermissionsOverride {
  can_create_customer_credit?: boolean;
}

export interface EffectivePermissions {
  can_create_sale: boolean;
  can_create_customer_credit: boolean;
  can_create_customer_payment: boolean;
  can_create_note: boolean;
  can_create_expense: boolean;
  can_create_supplier_transaction: boolean;
  can_view_all_records: boolean;
  can_edit_synced_own: boolean;
  can_edit_any_synced: boolean;
  can_void_record: boolean;
  can_hard_delete: boolean;
  can_request_correction: boolean;
  can_invite_staff: boolean;
  can_change_settings: boolean;
  can_view_staff_feed: boolean;
  can_view_audit_log: boolean;
  can_approve_device: boolean;
}

/**
 * Compute the effective permission set for a given role and per-staff
 * override. Used by:
 *   - The server on every `POST /api/events` (gate).
 *   - The server when building the response to `POST /api/shops/join`
 *     so the client can show "allowed actions" offline.
 *   - Unit tests.
 *
 * The role defaults win unless the override is explicitly set. Setting
 * `can_create_customer_credit: false` on an owner row is allowed (the
 * server will honor it) but not exposed in the UI.
 */
export function resolvePermissions(
  role: Role,
  override: StaffPermissionsOverride = {},
  status: StaffStatus = "active"
): EffectivePermissions {
  const base = ROLE_DEFAULTS[role] ?? {};
  const merged = { ...base, ...override };
  // Inactive staff are denied everything that mutates.
  if (status === "inactive") {
    return {
      can_create_sale: false,
      can_create_customer_credit: false,
      can_create_customer_payment: false,
      can_create_note: false,
      can_create_expense: false,
      can_create_supplier_transaction: false,
      can_view_all_records: merged.can_view_all_records ?? false,
      can_edit_synced_own: false,
      can_edit_any_synced: false,
      can_void_record: false,
      can_hard_delete: false,
      can_request_correction: false,
      can_invite_staff: false,
      can_change_settings: false,
      can_view_staff_feed: merged.can_view_staff_feed ?? false,
      can_view_audit_log: merged.can_view_audit_log ?? false,
      can_approve_device: false,
    };
  }
  return {
    can_create_sale: merged.can_create_sale ?? false,
    can_create_customer_credit: merged.can_create_customer_credit ?? false,
    can_create_customer_payment: merged.can_create_customer_payment ?? false,
    can_create_note: merged.can_create_note ?? false,
    can_create_expense: merged.can_create_expense ?? false,
    can_create_supplier_transaction: merged.can_create_supplier_transaction ?? false,
    can_view_all_records: merged.can_view_all_records ?? false,
    can_edit_synced_own: merged.can_edit_synced_own ?? false,
    can_edit_any_synced: merged.can_edit_any_synced ?? false,
    can_void_record: merged.can_void_record ?? false,
    can_hard_delete: merged.can_hard_delete ?? false,
    can_request_correction: merged.can_request_correction ?? false,
    can_invite_staff: merged.can_invite_staff ?? false,
    can_change_settings: merged.can_change_settings ?? false,
    can_view_staff_feed: merged.can_view_staff_feed ?? false,
    can_view_audit_log: merged.can_view_audit_log ?? false,
    can_approve_device: merged.can_approve_device ?? false,
  };
}

/**
 * Map a capability key to a per-event-type permission check. Used by the
 * `POST /api/events` handler to gate event creation server-side.
 *
 * event_type -> capability required to create.
 */
export const EVENT_TYPE_CAPABILITY: Record<string, Capability> = {
  sale: "can_create_sale",
  customer_payment: "can_create_customer_payment",
  customer_credit: "can_create_customer_credit",
  note: "can_create_note",
};

/**
 * Throws via a return value (not exception) when the actor is not
 * allowed to create an event of the given type. The route handler turns
 * this into a 403 response.
 */
export function canCreateEvent(
  perms: EffectivePermissions,
  eventType: string
): { ok: true } | { ok: false; capability: Capability | null } {
  const cap = EVENT_TYPE_CAPABILITY[eventType];
  if (!cap) return { ok: false, capability: null };
  return perms[cap] ? { ok: true } : { ok: false, capability: cap };
}
