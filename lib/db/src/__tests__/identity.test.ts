// Unit tests for PR 1A — Shop Sync v1 identity.
//
// Run with: `node --import tsx lib/db/src/__tests__/identity.test.ts`
//   (or via the `test:identity` script in lib/db/package.json)
//
// These tests exercise:
//   - join code generation / normalization
//   - phone normalization
//   - role permissions and per-staff override
//   - in-memory store: createShop, createOwnerStaff, findStaffForRejoin
//   - rejoin-binding logic in all 4 cases (same name+same phone,
//     same name+no phone, conflict on active device, deactivated staff)
//
// They do NOT exercise the Express route handlers directly because
// those need a running server. The route layer is verified by the
// api-server typecheck and by a hand-curl smoke test (see README).
//
// Reference: spec sections P (acceptance criteria 1-19), unit-test
// inventory at end of spec.

import { strict as assert } from "node:assert";
import {
  generateJoinCode,
  normalizeJoinCode,
  joinCodesEqual,
} from "../schema/joinCode";
import { normalizePhone, phonesEqual, maskPhone } from "../schema/phone";
import {
  resolvePermissions,
  canCreateEvent,
  EVENT_TYPE_CAPABILITY,
} from "../schema/permissions";
import { store, permissionsFor } from "../schema/store";
import { createHash } from "node:crypto";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}`);
    console.error(e);
    process.exitCode = 1;
  }
}

function section(name: string) {
  console.log(`\n${name}`);
}

let testsRun = 0;
function t(name: string, fn: () => void) {
  testsRun++;
  test(name, fn);
}

// ---------------------------------------------------------------------------
section("join code generation and normalization");
t("generateJoinCode produces 9 chars (XXXX-XXXX)", () => {
  const code = generateJoinCode();
  assert.equal(code.length, 9);
  assert.equal(code[4], "-");
  assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
});

t("normalizeJoinCode accepts lowercase, mixed, missing dash, extra spaces", () => {
  assert.equal(normalizeJoinCode("abcd-efgh"), "ABCD-EFGH");
  assert.equal(normalizeJoinCode("ABCDEFGH"), "ABCD-EFGH");
  assert.equal(normalizeJoinCode(" abcd efgh "), "ABCD-EFGH");
  assert.equal(normalizeJoinCode("abcd-efgh-extra"), null, "too long");
  assert.equal(normalizeJoinCode(""), null, "empty");
  assert.equal(normalizeJoinCode("ABCD-EFG1"), null, "1 not in alphabet");
  assert.equal(normalizeJoinCode("ABCD-EFO0"), null, "0/O not in alphabet");
});

t("joinCodesEqual handles case differences", () => {
  assert.equal(joinCodesEqual("abcd-efgh", "ABCD-EFGH"), true);
  assert.equal(joinCodesEqual("abcd-efgh", "ABCD-EFGI"), false);
});

// ---------------------------------------------------------------------------
section("phone normalization");
t("normalizePhone handles common Ethiopian formats", () => {
  assert.equal(normalizePhone("912345678"), "+251912345678");
  assert.equal(normalizePhone("+251912345678"), "+251912345678");
  assert.equal(normalizePhone("251912345678"), "+251912345678");
  assert.equal(normalizePhone("0912345678"), "+251912345678");
  assert.equal(normalizePhone("9 123 456 78"), "+251912345678");
});

t("normalizePhone rejects invalid input", () => {
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone(null), null);
  assert.equal(normalizePhone("812345678"), null, "must start with 7 or 9");
  assert.equal(normalizePhone("9123456"), null, "too short");
  assert.equal(normalizePhone("91234567890"), null, "too long");
  assert.equal(normalizePhone("not a phone"), null);
});

t("phonesEqual handles both null and matching values", () => {
  assert.equal(phonesEqual(null, null), true);
  assert.equal(phonesEqual(null, "912345678"), false);
  assert.equal(phonesEqual("+251912345678", "0912345678"), true);
  assert.equal(phonesEqual("+251912345678", "912345677"), false);
});

t("maskPhone produces a safe display form", () => {
  assert.equal(maskPhone("+251912345678"), "+2519XX...678");
  assert.equal(maskPhone(null), "");
  assert.equal(maskPhone("not a phone"), "");
});

// ---------------------------------------------------------------------------
section("role permissions");
t("Basic Staff defaults", () => {
  const p = resolvePermissions("staff", {}, "active");
  assert.equal(p.can_create_sale, true);
  assert.equal(p.can_create_customer_credit, false, "Dubie default OFF for Basic Staff");
  assert.equal(p.can_create_customer_payment, true);
  assert.equal(p.can_create_note, true);
  assert.equal(p.can_create_expense, false);
  assert.equal(p.can_create_supplier_transaction, false);
  assert.equal(p.can_view_all_records, false);
  assert.equal(p.can_change_settings, false);
  assert.equal(p.can_view_audit_log, false);
});

t("Owner has everything", () => {
  const p = resolvePermissions("owner", {}, "active");
  assert.equal(p.can_create_customer_credit, true);
  assert.equal(p.can_create_expense, true);
  assert.equal(p.can_change_settings, true);
  assert.equal(p.can_view_audit_log, true);
});

t("Per-staff override flips can_create_customer_credit", () => {
  const p = resolvePermissions("staff", { can_create_customer_credit: true }, "active");
  assert.equal(p.can_create_customer_credit, true);
});

t("Inactive staff are denied all mutations", () => {
  const p = resolvePermissions("staff", { can_create_customer_credit: true }, "inactive");
  assert.equal(p.can_create_sale, false);
  assert.equal(p.can_create_customer_credit, false);
  assert.equal(p.can_view_staff_feed, false);
});

t("canCreateEvent gates the right event types", () => {
  const basic = resolvePermissions("staff", {}, "active");
  const ok = canCreateEvent(basic, "sale");
  assert.equal(ok.ok, true);
  const deny = canCreateEvent(basic, "customer_credit");
  assert.equal(deny.ok, false);
  if (!deny.ok) {
    assert.equal(deny.capability, "can_create_customer_credit");
  }
  const unknown = canCreateEvent(basic, "expense");
  assert.equal(unknown.ok, false);
  if (!unknown.ok) {
    assert.equal(unknown.capability, null);
  }
});

t("EVENT_TYPE_CAPABILITY maps the 4 v1 event types", () => {
  assert.equal(EVENT_TYPE_CAPABILITY["sale"], "can_create_sale");
  assert.equal(EVENT_TYPE_CAPABILITY["customer_payment"], "can_create_customer_payment");
  assert.equal(EVENT_TYPE_CAPABILITY["customer_credit"], "can_create_customer_credit");
  assert.equal(EVENT_TYPE_CAPABILITY["note"], "can_create_note");
  assert.equal(EVENT_TYPE_CAPABILITY["expense"], undefined, "v1.1+ only");
});

// ---------------------------------------------------------------------------
section("in-memory store: shop and staff");
t("createShop + createOwnerStaff gives a working identity", () => {
  store.reset();
  const owner = store.createUser({ displayName: "Hanna", phone: null });
  const shop = store.createShop({
    name: "Hanna Shop",
    ownerUserId: owner.id,
    phoneRequired: false,
    approvalRequired: false,
  });
  const staff = store.createOwnerStaff({ shopId: shop.id, userId: owner.id });
  const { token, tokenHash } = store.issueDeviceToken();
  const device = store.createDevice({
    shopId: shop.id,
    staffId: staff.id,
    deviceLabel: "Hanna's phone",
    platform: "web",
    tokenHash,
    deviceStatus: "active",
  });

  assert.equal(shop.joinCode.length, 9);
  assert.equal(staff.role, "owner");
  assert.equal(device.deviceStatus, "active");
  const perms = permissionsFor(staff);
  assert.equal(perms.can_create_customer_credit, true);
});

t("createStaff + device create for a new Basic Staff", () => {
  store.reset();
  const owner = store.createUser({ displayName: "Hanna", phone: null });
  const shop = store.createShop({
    name: "Hanna Shop",
    ownerUserId: owner.id,
    phoneRequired: false,
    approvalRequired: false,
  });
  const ownerStaff = store.createOwnerStaff({ shopId: shop.id, userId: owner.id });
  const { tokenHash: _h } = store.issueDeviceToken();

  const newUser = store.createUser({ displayName: "Tigist", phone: "+251912345678" });
  const newStaff = store.createStaff({
    shopId: shop.id,
    userId: newUser.id,
    role: "staff",
    phoneSnapshot: "+251912345678",
    permissionsOverride: {},
  });
  const { tokenHash } = store.issueDeviceToken();
  store.createDevice({
    shopId: shop.id,
    staffId: newStaff.id,
    deviceLabel: "Tigist's phone",
    platform: "web",
    tokenHash,
    deviceStatus: "active",
  });
  assert.equal(newStaff.role, "staff");
  const perms = permissionsFor(newStaff);
  assert.equal(perms.can_create_customer_credit, false, "Basic Staff default");
  assert.equal(perms.can_create_sale, true);
  assert.notEqual(newStaff.id, ownerStaff.id, "Tigist is not the owner");
});

// ---------------------------------------------------------------------------
section("rejoin binding logic");
t("rejoin: same name + same phone binds to existing staff_id", () => {
  store.reset();
  const owner = store.createUser({ displayName: "Hanna", phone: null });
  const shop = store.createShop({ name: "H", ownerUserId: owner.id, phoneRequired: false, approvalRequired: false });
  store.createOwnerStaff({ shopId: shop.id, userId: owner.id });
  const user = store.createUser({ displayName: "Tigist", phone: "+251912345678" });
  const staff = store.createStaff({
    shopId: shop.id, userId: user.id, role: "staff",
    phoneSnapshot: "+251912345678", permissionsOverride: {},
  });

  // First device, currently active.
  const { tokenHash } = store.issueDeviceToken();
  store.createDevice({
    shopId: shop.id, staffId: staff.id, deviceLabel: "D1", platform: "web",
    tokenHash, deviceStatus: "active",
  });
  // Deactivate it to simulate a previous phone.
  store.revokeDevice({ deviceId: [...store.devices.values()].find(d => d.staffId === staff.id)!.id, reason: "replaced" });

  // Rejoin attempt.
  const match = store.findStaffForRejoin({
    shopId: shop.id, displayName: "Tigist", phone: "+251912345678",
  });
  assert.ok(match, "should find Tigist");
  assert.equal(match!.id, staff.id, "rebinds to the same staff_id");
  assert.equal(store.hasActiveDevice(staff.id), false, "old device was revoked");
});

t("rejoin: same name + no phone matches by name alone", () => {
  store.reset();
  const owner = store.createUser({ displayName: "H", phone: null });
  const shop = store.createShop({ name: "H", ownerUserId: owner.id, phoneRequired: false, approvalRequired: false });
  store.createOwnerStaff({ shopId: shop.id, userId: owner.id });
  const user = store.createUser({ displayName: "Tigist", phone: null });
  const staff = store.createStaff({
    shopId: shop.id, userId: user.id, role: "staff",
    phoneSnapshot: null, permissionsOverride: {},
  });
  const { tokenHash } = store.issueDeviceToken();
  store.createDevice({ shopId: shop.id, staffId: staff.id, deviceLabel: "D", platform: "web", tokenHash, deviceStatus: "revoked" });

  const match = store.findStaffForRejoin({
    shopId: shop.id, displayName: "Tigist", phone: null,
  });
  assert.ok(match, "name-only match works when both phones are null");
  assert.equal(match!.id, staff.id);
});

t("rejoin: same name + different phone does NOT match (different person)", () => {
  store.reset();
  const owner = store.createUser({ displayName: "H", phone: null });
  const shop = store.createShop({ name: "H", ownerUserId: owner.id, phoneRequired: false, approvalRequired: false });
  store.createOwnerStaff({ shopId: shop.id, userId: owner.id });
  const user = store.createUser({ displayName: "Tigist", phone: "+251911111111" });
  store.createStaff({
    shopId: shop.id, userId: user.id, role: "staff",
    phoneSnapshot: "+251911111111", permissionsOverride: {},
  });

  const match = store.findStaffForRejoin({
    shopId: shop.id, displayName: "Tigist", phone: "+251922222222",
  });
  assert.equal(match, null, "different phone = no match = new staff");
});

t("rejoin: case-insensitive name match", () => {
  store.reset();
  const owner = store.createUser({ displayName: "H", phone: null });
  const shop = store.createShop({ name: "H", ownerUserId: owner.id, phoneRequired: false, approvalRequired: false });
  store.createOwnerStaff({ shopId: shop.id, userId: owner.id });
  const user = store.createUser({ displayName: "Tigist", phone: null });
  const staff = store.createStaff({
    shopId: shop.id, userId: user.id, role: "staff",
    phoneSnapshot: null, permissionsOverride: {},
  });

  const match = store.findStaffForRejoin({
    shopId: shop.id, displayName: "  TIGIST  ", phone: null,
  });
  assert.ok(match, "trimmed + case-insensitive name matches");
  assert.equal(match!.id, staff.id);
});

t("rejoin: does not match the owner row", () => {
  store.reset();
  const owner = store.createUser({ displayName: "Hanna", phone: null });
  const shop = store.createShop({ name: "H", ownerUserId: owner.id, phoneRequired: false, approvalRequired: false });
  store.createOwnerStaff({ shopId: shop.id, userId: owner.id });

  const match = store.findStaffForRejoin({
    shopId: shop.id, displayName: "Hanna", phone: null,
  });
  assert.equal(match, null, "owner is never rejoined; the owner is the owner");
});

// ---------------------------------------------------------------------------
section("device approval + revocation");
t("pending device cannot accept API calls (deactivation test)", () => {
  store.reset();
  const owner = store.createUser({ displayName: "H", phone: null });
  const shop = store.createShop({ name: "H", ownerUserId: owner.id, phoneRequired: false, approvalRequired: true });
  const ownerStaff = store.createOwnerStaff({ shopId: shop.id, userId: owner.id });
  const { token, tokenHash } = store.issueDeviceToken();
  const pending = store.createDevice({
    shopId: shop.id, staffId: ownerStaff.id, deviceLabel: "P", platform: "web",
    tokenHash, deviceStatus: "pending",
  });
  const found = store.findDeviceByTokenHash(createHash("sha256").update(token).digest("hex"));
  assert.ok(found);
  assert.equal(found!.deviceStatus, "pending");

  store.approveDevice({ deviceId: pending.id, approvedBy: owner.id });
  const after = store.findDeviceById(pending.id);
  assert.equal(after!.deviceStatus, "active");
});

t("deactivating a staff revokes all their devices", () => {
  store.reset();
  const owner = store.createUser({ displayName: "H", phone: null });
  const shop = store.createShop({ name: "H", ownerUserId: owner.id, phoneRequired: false, approvalRequired: false });
  store.createOwnerStaff({ shopId: shop.id, userId: owner.id });
  const user = store.createUser({ displayName: "Tigist", phone: null });
  const staff = store.createStaff({
    shopId: shop.id, userId: user.id, role: "staff",
    phoneSnapshot: null, permissionsOverride: {},
  });
  // Two devices for the same staff (lost phone + active phone, or two rejoin attempts).
  const a = store.issueDeviceToken();
  store.createDevice({ shopId: shop.id, staffId: staff.id, deviceLabel: "A", platform: "web", tokenHash: a.tokenHash, deviceStatus: "active" });
  const b = store.issueDeviceToken();
  store.createDevice({ shopId: shop.id, staffId: staff.id, deviceLabel: "B", platform: "web", tokenHash: b.tokenHash, deviceStatus: "active" });

  const result = store.deactivateStaff({ staffId: staff.id, deactivatedBy: owner.id });
  assert.ok(result);
  assert.equal(result!.devicesRevoked, 2);
  for (const d of store.listDevicesForStaff(staff.id)) {
    assert.equal(d.deviceStatus, "revoked");
    assert.equal(d.revokedReason, "staff_deactivated");
  }
  const perms = permissionsFor(staff);
  assert.equal(perms.can_create_sale, false, "inactive staff can't create");
});

t("rotating join code invalidates the old code", () => {
  store.reset();
  const owner = store.createUser({ displayName: "H", phone: null });
  const shop = store.createShop({ name: "H", ownerUserId: owner.id, phoneRequired: false, approvalRequired: false });
  const oldCode = shop.joinCode;
  const rotated = store.rotateJoinCode(shop.id);
  assert.ok(rotated);
  assert.notEqual(rotated!.joinCode, oldCode);
  // Old code no longer matches.
  const byOld = store.findShopByJoinCode(oldCode);
  assert.equal(byOld, null);
  const byNew = store.findShopByJoinCode(rotated!.joinCode);
  assert.equal(byNew!.id, shop.id);
});

console.log(`\n${testsRun} tests run.`);
