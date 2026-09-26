import { describe, expect, it } from 'vitest';
import {
  LOCKED_NOTIFICATION_TYPES,
  NOTIFICATION_GROUPS,
  NOTIFICATION_TYPES,
  isNotificationGroupEnabled,
  normalizeLockedNotificationPreferences,
  setNotificationGroupPreference,
} from '../src/components/settings/notificationGroups.js';

const groupByKey = Object.fromEntries(NOTIFICATION_GROUPS.map((group) => [group.key, group]));

describe('R2.2 notification groups', () => {
  it('exposes the owner-approved five-group model', () => {
    expect(NOTIFICATION_GROUPS.map((group) => group.key)).toEqual([
      'money_in',
      'credit_dubie',
      'money_out',
      'team',
      'gebya_support',
    ]);
    expect(groupByKey.team.locked).not.toBe(true);
    expect(groupByKey.gebya_support.securityType).toBe('rbac_violation');
  });

  it('maps every visible type exactly once and keeps the payment alias in the same group', () => {
    expect(Object.fromEntries(NOTIFICATION_GROUPS.map((group) => [group.key, group.types]))).toEqual({
      money_in: ['sale'],
      credit_dubie: ['credit', 'overdue_alert'],
      money_out: ['payment', 'supplier_payment', 'supplier_purchase', 'expense'],
      team: ['staff_joined', 'staff_submitted_collection', 'device_approval'],
      gebya_support: ['announcement', 'support_reply'],
    });

    const visibleTypes = NOTIFICATION_GROUPS.flatMap((group) => [
      ...group.types,
      ...(group.securityType ? [group.securityType] : []),
    ]);
    expect(visibleTypes).toHaveLength(NOTIFICATION_TYPES.length);
    expect(new Set(visibleTypes).size).toBe(NOTIFICATION_TYPES.length);

    const serverKeys = NOTIFICATION_GROUPS.flatMap((group) => [
      ...group.preferenceKeys,
      ...(group.securityType ? [group.securityType] : []),
    ]);
    expect(serverKeys).toHaveLength(NOTIFICATION_TYPES.length + 1);
    expect(serverKeys).toContain('payment_confirmed');
  });

  it('derives one group switch from both channels of every underlying type', () => {
    const group = groupByKey.money_out;
    const preferences = {
      payment: { inApp: true, push: true },
      supplier_payment: { inApp: true, push: false },
      supplier_purchase: { inApp: true, push: true },
      expense: { inApp: true, push: true },
    };

    expect(isNotificationGroupEnabled(group, preferences)).toBe(false);
    expect(isNotificationGroupEnabled(group, {})).toBe(true);
  });

  it('updates every type and the payment alias atomically for both channels', () => {
    const original = {
      sale: { inApp: true, push: true },
      payment: { inApp: true, push: true },
      payment_confirmed: { inApp: true, push: true },
      supplier_payment: { inApp: true, push: true },
      supplier_purchase: { inApp: true, push: true },
      expense: { inApp: true, push: true },
    };

    const disabled = setNotificationGroupPreference(groupByKey.money_out, original, false);
    for (const key of groupByKey.money_out.preferenceKeys) {
      expect(disabled[key]).toEqual({ inApp: false, push: false });
    }
    expect(disabled.sale).toEqual(original.sale);

    const reenabled = setNotificationGroupPreference(groupByKey.money_out, disabled, true);
    for (const key of groupByKey.money_out.preferenceKeys) {
      expect(reenabled[key]).toEqual({ inApp: true, push: true });
    }
  });

  it('keeps Credit–Dubie and Security fixed ON even when legacy data is false', () => {
    const legacy = Object.fromEntries(LOCKED_NOTIFICATION_TYPES.map((key) => [
      key,
      { inApp: false, push: false },
    ]));

    const normalized = normalizeLockedNotificationPreferences(legacy);
    for (const key of LOCKED_NOTIFICATION_TYPES) {
      expect(normalized[key]).toEqual({ inApp: true, push: true });
    }
    expect(isNotificationGroupEnabled(groupByKey.credit_dubie, legacy)).toBe(true);

    const attemptedDisable = setNotificationGroupPreference(
      groupByKey.credit_dubie,
      normalized,
      false,
    );
    expect(attemptedDisable.credit).toEqual({ inApp: true, push: true });
    expect(attemptedDisable.overdue_alert).toEqual({ inApp: true, push: true });
  });
});
