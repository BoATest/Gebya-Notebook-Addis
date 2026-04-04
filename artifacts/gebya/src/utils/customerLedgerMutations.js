import { CUSTOMER_TRANSACTION_TYPES, isValidCustomerTransactionType } from './customerTransactionTypes.js';

function normalizeOptionalText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function normalizeTimestamp(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeCustomerDraft(payload = {}) {
  const displayName = String(payload.display_name || '').trim();
  if (!displayName) return null;

  const telegramUsername = normalizeOptionalText(payload.telegram_username);

  return {
    display_name: displayName,
    note: normalizeOptionalText(payload.note),
    phone_number: normalizeOptionalText(payload.phone_number),
    telegram_username: telegramUsername,
    telegram_notify_enabled: Boolean(payload.telegram_notify_enabled && telegramUsername),
  };
}

export function normalizeCustomerTransactionDraft(payload = {}) {
  if (!isValidCustomerTransactionType(payload.type)) return null;

  const customerId = Number(payload.customer_id);
  const amount = Number(payload.amount);
  if (!Number.isFinite(customerId) || customerId <= 0) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    customer_id: customerId,
    type: payload.type,
    amount,
    item_note: normalizeOptionalText(payload.item_note),
    due_date: payload.type === CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD
      ? normalizeTimestamp(payload.due_date)
      : null,
  };
}
