import { describe, expect, it } from "vitest";
import {
  LOCKED_NOTIFICATION_TYPES,
  OWNER_NOTIFICATION_PREFERENCE_COLUMNS,
  OWNER_NOTIFICATION_PREFERENCE_TYPES,
  canonicalizePaymentAlias,
  createDefaultOwnerNotificationPreferences,
  enforceNotificationPreference,
  isLockedNotificationType,
} from "../notificationPreferencePolicy.js";
import { shouldNotify } from "../notificationPreferences.js";

describe("notification preference policy", () => {
  it("keeps the internal test event out of owner-writable preference keys", () => {
    expect(OWNER_NOTIFICATION_PREFERENCE_TYPES).toEqual([
      "sale",
      "credit",
      "payment",
      "payment_confirmed",
      "supplier_payment",
      "supplier_purchase",
      "expense",
      "staff_joined",
      "rbac_violation",
      "overdue_alert",
      "device_approval",
      "announcement",
      "support_reply",
      "staff_submitted_collection",
    ]);
    expect(OWNER_NOTIFICATION_PREFERENCE_TYPES).not.toContain("test");
    expect(OWNER_NOTIFICATION_PREFERENCE_COLUMNS).not.toHaveProperty("test");
    expect(OWNER_NOTIFICATION_PREFERENCE_COLUMNS.announcement).toBe("announcementPrefs");
  });

  it("uses the same owner defaults for GET hydration and delivery checks", () => {
    const defaults = createDefaultOwnerNotificationPreferences();
    expect(defaults.expense).toEqual({ inApp: true, push: false });
    expect(defaults.sale).toEqual({ inApp: true, push: true });
    for (const type of LOCKED_NOTIFICATION_TYPES) {
      expect(defaults[type]).toEqual({ inApp: true, push: true });
    }
  });

  it("identifies the owner-locked alert types", () => {
    expect(LOCKED_NOTIFICATION_TYPES).toEqual([
      "credit",
      "overdue_alert",
      "rbac_violation",
    ]);
    expect(isLockedNotificationType("credit")).toBe(true);
    expect(isLockedNotificationType("team")).toBe(false);
  });

  it("forces both channels on for locked types and leaves user groups editable", () => {
    for (const type of LOCKED_NOTIFICATION_TYPES) {
      expect(enforceNotificationPreference(type, { inApp: false, push: false })).toEqual({
        inApp: true,
        push: true,
      });
    }
    expect(enforceNotificationPreference("sale", { inApp: false, push: false })).toEqual({
      inApp: false,
      push: false,
    });
  });

  it("keeps payment and payment_confirmed on the same preference value", () => {
    const payment = { inApp: true, push: false };
    expect(canonicalizePaymentAlias({ payment })).toEqual({
      payment,
      payment_confirmed: payment,
    });
    expect(canonicalizePaymentAlias({ payment_confirmed: payment })).toEqual({
      payment,
      payment_confirmed: payment,
    });
    expect(canonicalizePaymentAlias({ sale: payment })).toEqual({ sale: payment });
  });

  it("allows locked notifications through the delivery checker despite legacy false data", () => {
    const preferences = {
      businessId: 1,
      userId: 2,
      preferences: {
        credit: { inApp: false, push: false },
        overdue_alert: { inApp: false, push: false },
        rbac_violation: { inApp: false, push: false },
        sale: { inApp: false, push: false },
      },
      quietHoursStart: null,
      quietHoursEnd: null,
    };

    for (const type of LOCKED_NOTIFICATION_TYPES) {
      expect(shouldNotify(preferences, type, "inApp")).toBe(true);
      expect(shouldNotify(preferences, type, "push")).toBe(true);
    }
    expect(shouldNotify(preferences, "sale", "inApp")).toBe(false);
    expect(shouldNotify(preferences, "sale", "push")).toBe(false);
  });
});
