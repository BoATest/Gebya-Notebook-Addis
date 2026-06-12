import { pgTable, text, timestamp, uuid, boolean, integer, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Shop Sync v1 (PR 1A) — identity tables only. Events and audit_events
// land in PR 1B and PR 1C respectively.
//
// Reference: artifacts/gebya/DECISION_LOG.md 2026-06-11.
// Reference: spec sections D, F, H, I, L of the v1 specification.
// ---------------------------------------------------------------------------

// users — one row per human (owner or staff). Phone is declared, never verified.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  displayName: text("display_name").notNull(),
  phone: text("phone"), // nullable, never required
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// shops — exactly one per owner onboarding.
export const shops = pgTable(
  "shops",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    joinCode: text("join_code").notNull(),
    joinCodeRotatedAt: timestamp("join_code_rotated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Shop-level toggles. Per-staff overrides come in v1.1.
    phoneRequired: boolean("phone_required").notNull().default(false),
    approvalRequired: boolean("approval_required").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    joinCodeUnique: uniqueIndex("shops_join_code_unique").on(t.joinCode),
    ownerIdx: index("shops_owner_idx").on(t.ownerUserId),
  }),
);

// staff — one per (shop, human). A user can be staff in multiple shops
// eventually (not in v1). Owner also has a staff row for symmetry
// (role='owner', staff_status='active'); the canonical owner pointer
// lives on shops.owner_user_id.
export const staff = pgTable(
  "staff",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // 'owner' | 'staff' | 'trusted_staff' | 'manager'
    // 'trusted_staff' and 'manager' are reserved for v1.1 / slice 2; UI
    // does not expose them in v1. We accept the enum values now so we
    // do not migrate the role column in v1.1.
    role: text("role").notNull().default("staff"),
    // 'active' | 'inactive' — only 'active' and 'inactive' ship in v1.
    // 'suspended' is v1.1+ only if the field test asks.
    staffStatus: text("staff_status").notNull().default("active"),
    // Per-staff permission overrides. In v1 the only override is
    // can_create_customer_credit. Default false for Basic Staff, true
    // for owner/Trusted/Manager. Role defaults are applied by the
    // server-side permission resolver.
    permissions: jsonb("permissions").$type<{
      can_create_sale?: boolean;
      can_create_customer_credit?: boolean;
      can_create_customer_payment?: boolean;
      can_create_note?: boolean;
    }>(),
    // Phone at time of join. Immutable per staff. Used for rejoin
    // binding; null if the staff joined without a phone.
    phoneSnapshot: text("phone_snapshot"),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    deactivatedBy: uuid("deactivated_by").references(() => users.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // One staff per (shop, user). Rejoin re-uses the existing row.
    shopUserUnique: uniqueIndex("staff_shop_user_unique").on(t.shopId, t.userId),
    shopStatusIdx: index("staff_shop_status_idx").on(t.shopId, t.staffStatus),
  }),
);

// devices — one per phone. A staff can have many devices over time;
// a device belongs to exactly one staff at a time.
export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    deviceLabel: text("device_label").notNull(),
    platform: text("platform").notNull().default("web"),
    // 'pending' | 'active' | 'revoked'
    deviceStatus: text("device_status").notNull().default("active"),
    // bcrypt hash of the device_token. The plain token is shown
    // exactly once at issue time and held only in local Dexie
    // settings; the server never stores the plain token.
    tokenHash: text("token_hash").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => users.id),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    // 'staff_deactivated' | 'owner_revoke' | 'replaced'
    revokedReason: text("revoked_reason"),
  },
  (t) => ({
    staffIdx: index("devices_staff_idx").on(t.staffId),
    shopStatusIdx: index("devices_shop_status_idx").on(t.shopId, t.deviceStatus),
  }),
);

// join_codes — audit trail. The current valid code is shops.join_code.
// We retain issued/revoked codes so we can investigate brute-force and
// code-sharing incidents.
export const joinCodes = pgTable(
  "join_codes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    codeIdx: index("join_codes_code_idx").on(t.code),
    shopIdx: index("join_codes_shop_idx").on(t.shopId),
  }),
);

// Type exports for use in the rest of the workspace.
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Shop = typeof shops.$inferSelect;
export type NewShop = typeof shops.$inferInsert;
export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type JoinCode = typeof joinCodes.$inferSelect;
export type NewJoinCode = typeof joinCodes.$inferInsert;

// Role and status enums as string-literal unions. We keep these here so
// the server and client share the vocabulary.
export type Role = "owner" | "staff" | "trusted_staff" | "manager";
export type StaffStatus = "active" | "inactive";
export type DeviceStatus = "pending" | "active" | "revoked";
export type RevokedReason = "staff_deactivated" | "owner_revoke" | "replaced";
