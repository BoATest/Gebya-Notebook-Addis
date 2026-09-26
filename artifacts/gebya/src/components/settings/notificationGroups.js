const DEFAULT_CHANNEL_PREFERENCES = { inApp: true, push: true };

export const NOTIFICATION_TYPES = Object.freeze([
  { key: 'sale', label: { en: 'Sales', am: 'ሽያጭ' }, icon: '💰' },
  { key: 'credit', label: { en: 'Credit Given', am: 'ተሰጠ ብር' }, icon: '👥' },
  { key: 'payment', label: { en: 'Payments Received', am: 'ክፍያ ተቀባይ' }, icon: '✅' },
  { key: 'supplier_payment', label: { en: 'Supplier Payments', am: 'የአቅራቢያ ክፍያ' }, icon: '🤝' },
  { key: 'supplier_purchase', label: { en: 'Supplier Purchases', am: 'የአቅራቢያ ግዥስ' }, icon: '📦' },
  { key: 'expense', label: { en: 'Expenses', am: 'ወጪ' }, icon: '🛒' },
  { key: 'staff_joined', label: { en: 'Staff Joined', am: 'ሰራተኛ ተቀላቅሏል' }, icon: '👤' },
  { key: 'rbac_violation', label: { en: 'Security Alerts', am: 'የደህንነት ማስጠንቂያ' }, icon: '⚠️' },
  { key: 'overdue_alert', label: { en: 'Overdue Payments', am: 'የጊዜ ያለፈ ክፍያ' }, icon: '⏰' },
  { key: 'device_approval', label: { en: 'Device Approval', am: 'የስልክ ማጽደቅ' }, icon: '📱' },
  { key: 'announcement', label: { en: 'Announcements', am: 'ማስታወቂያ' }, icon: '📣' },
  { key: 'support_reply', label: { en: 'Support Replies', am: 'የድጋፍ መልስ' }, icon: '💬' },
  { key: 'staff_submitted_collection', label: { en: 'Staff Submissions', am: 'የሰራተኛ ስብስብ' }, icon: '📋' },
]);

/**
 * R2.2's five user-facing groups. `types` are the visible event labels;
 * `preferenceKeys` also include server aliases that must be written together.
 * Security remains a locked row inside Gebya & support, per the owner mapping.
 */
export const NOTIFICATION_GROUPS = Object.freeze([
  {
    key: 'money_in',
    title: { en: 'Money in', am: 'ገቢ ገንዘብ' },
    types: ['sale'],
    preferenceKeys: ['sale'],
  },
  {
    key: 'credit_dubie',
    title: { en: 'Credit–Dubie', am: 'ዱቤ' },
    types: ['credit', 'overdue_alert'],
    preferenceKeys: ['credit', 'overdue_alert'],
    locked: true,
    lockNote: { en: 'Cannot disable', am: 'መዝጋት አይቻልም' },
  },
  {
    key: 'money_out',
    title: { en: 'Money out', am: 'ወጪ ገንዘብ' },
    types: ['payment', 'supplier_payment', 'supplier_purchase', 'expense'],
    preferenceKeys: ['payment', 'payment_confirmed', 'supplier_payment', 'supplier_purchase', 'expense'],
  },
  {
    key: 'team',
    title: { en: 'Team', am: 'ቡድን' },
    types: ['staff_joined', 'staff_submitted_collection', 'device_approval'],
    preferenceKeys: ['staff_joined', 'staff_submitted_collection', 'device_approval'],
  },
  {
    key: 'gebya_support',
    title: { en: 'Gebya & support', am: 'ገበያ እና ድጋፍ' },
    types: ['announcement', 'support_reply'],
    preferenceKeys: ['announcement', 'support_reply'],
    securityType: 'rbac_violation',
  },
]);

export const LOCKED_NOTIFICATION_TYPES = Object.freeze([
  'credit',
  'overdue_alert',
  'rbac_violation',
]);

function channelPreferences(enabled) {
  return { inApp: enabled, push: enabled };
}

function preferenceFor(preferences, typeKey) {
  const value = preferences?.[typeKey];
  return {
    inApp: value?.inApp !== false,
    push: value?.push !== false,
  };
}

export function getNotificationType(typeKey) {
  return NOTIFICATION_TYPES.find((type) => type.key === typeKey);
}

export function isNotificationGroupEnabled(group, preferences) {
  if (group.locked) return true;
  return group.types.every((typeKey) => {
    const current = preferenceFor(preferences, typeKey);
    return current.inApp && current.push;
  });
}

export function normalizeLockedNotificationPreferences(preferences = {}) {
  const normalized = { ...preferences };
  for (const typeKey of LOCKED_NOTIFICATION_TYPES) {
    normalized[typeKey] = channelPreferences(true);
  }
  return normalized;
}

export function setNotificationGroupPreference(group, preferences, enabled) {
  const updated = normalizeLockedNotificationPreferences(preferences);
  if (group.locked) return updated;

  for (const typeKey of group.preferenceKeys) {
    updated[typeKey] = channelPreferences(enabled);
  }
  return updated;
}
