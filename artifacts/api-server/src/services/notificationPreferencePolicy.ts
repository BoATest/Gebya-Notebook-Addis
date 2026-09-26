import type { NotificationTypeKey } from "@workspace/db/schema";

export const LOCKED_NOTIFICATION_TYPES = ["credit", "overdue_alert", "rbac_violation"] as const;
export type OwnerNotificationPreferenceType = Exclude<NotificationTypeKey, "test">;
export const OWNER_NOTIFICATION_PREFERENCE_TYPES: OwnerNotificationPreferenceType[] = [
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
];
export const OWNER_NOTIFICATION_PREFERENCE_COLUMNS: Record<OwnerNotificationPreferenceType, string> = {
  sale: "salePrefs",
  credit: "creditPrefs",
  payment: "paymentPrefs",
  payment_confirmed: "paymentPrefs",
  supplier_payment: "supplierPaymentPrefs",
  supplier_purchase: "supplierPurchasePrefs",
  expense: "expensePrefs",
  staff_joined: "staffJoinedPrefs",
  rbac_violation: "rbacViolationPrefs",
  overdue_alert: "overdueAlertPrefs",
  device_approval: "deviceApprovalPrefs",
  announcement: "announcementPrefs",
  support_reply: "supportReplyPrefs",
  staff_submitted_collection: "staffSubmittedCollectionPrefs",
};

export type LockedNotificationType = (typeof LOCKED_NOTIFICATION_TYPES)[number];
export type NotificationChannelPreferences = { inApp: boolean; push: boolean };

export function createDefaultOwnerNotificationPreferences(): Record<
  OwnerNotificationPreferenceType,
  NotificationChannelPreferences
> {
  return Object.fromEntries(
    OWNER_NOTIFICATION_PREFERENCE_TYPES.map((type) => [
      type,
      { inApp: true, push: type !== "expense" },
    ]),
  ) as Record<OwnerNotificationPreferenceType, NotificationChannelPreferences>;
}

const lockedTypes = new Set<string>(LOCKED_NOTIFICATION_TYPES);

export function isLockedNotificationType(type: string): type is LockedNotificationType {
  return lockedTypes.has(type);
}

export function enforceNotificationPreference(
  type: string,
  preferences: NotificationChannelPreferences,
): NotificationChannelPreferences {
  return isLockedNotificationType(type)
    ? { inApp: true, push: true }
    : { ...preferences };
}

/** payment_confirmed shares the payment column and must never diverge from it. */
export function canonicalizePaymentAlias(
  preferences: Record<string, unknown>,
): Record<string, unknown> {
  if (!("payment" in preferences) && !("payment_confirmed" in preferences)) {
    return preferences;
  }
  const canonical = preferences.payment ?? preferences.payment_confirmed;
  return {
    ...preferences,
    payment: canonical,
    payment_confirmed: canonical,
  };
}
