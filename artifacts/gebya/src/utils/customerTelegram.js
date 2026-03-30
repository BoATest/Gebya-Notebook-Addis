import { formatEthiopian } from './ethiopianCalendar';
import { fmt } from './numformat';
import { CUSTOMER_TRANSACTION_TYPES } from './customerTransactionTypes';

export function normalizeTelegram(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^@[A-Za-z0-9_]+$/.test(trimmed)) return trimmed;
  if (/^https?:\/\/t\.me\/\S+$/i.test(trimmed)) return trimmed;
  if (/^t\.me\/\S+$/i.test(trimmed)) return `https://${trimmed}`;
  return '';
}

export function buildTelegramMessageUrl(value, message) {
  const normalized = normalizeTelegram(value);
  if (!normalized) return null;

  if (/^https?:\/\/t\.me\//i.test(normalized)) {
    const separator = normalized.includes('?') ? '&' : '?';
    return `${normalized}${separator}text=${encodeURIComponent(message)}`;
  }

  if (/^t\.me\//i.test(normalized)) {
    return `https://${normalized}?text=${encodeURIComponent(message)}`;
  }

  const handle = normalized.startsWith('@') ? normalized.slice(1) : normalized;
  if (!handle) return null;
  return `https://t.me/${handle}?text=${encodeURIComponent(message)}`;
}

export function createCustomerTelegramLinkToken(customerId) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `cust-${customerId || 'new'}-${crypto.randomUUID()}`;
  }
  return `cust-${customerId || 'new'}-${Date.now().toString(36)}`;
}

export function buildCustomerConnectMessage({ shopName, customerName, token }) {
  const safeToken = token || `pending-${Date.now().toString(36)}`;
  const lines = [
    shopName || 'Gebya',
    'Telegram connection request',
    '',
    `Customer: ${customerName || 'Customer'}`,
    `Connection code: ${safeToken}`,
    '',
    'Open this chat and send this code to connect your ledger updates.',
  ];
  return lines.join('\n');
}

export function buildCustomerConnectLink({ shopTelegram, shopName, customerName, token }) {
  const connectMessage = buildCustomerConnectMessage({ shopName, customerName, token });
  if (shopTelegram) {
    const directTelegramUrl = buildTelegramMessageUrl(shopTelegram, connectMessage);
    if (directTelegramUrl) return directTelegramUrl;
  }

  return `https://t.me/share/url?url=${encodeURIComponent('https://gebya.app')}&text=${encodeURIComponent(connectMessage)}`;
}

export function buildCustomerLedgerTelegramMessage({
  shopName,
  type,
  amount,
  previousBalance,
  updatedBalance,
  createdAt,
}) {
  const isPayment = type === CUSTOMER_TRANSACTION_TYPES.PAYMENT;
  const title = isPayment ? '✅ Payment Recorded' : '🛒 New Dubie Recorded';
  const actionLine = isPayment
    ? `You paid today: ${fmt(amount)} birr`
    : `You took today: ${fmt(amount)} birr`;
  const balanceLine = isPayment
    ? `💰 Your remaining balance: ${fmt(updatedBalance)} birr`
    : `💰 Your current balance: ${fmt(updatedBalance)} birr`;
  const footer = isPayment ? 'Thank you 🙏' : 'Please pay on time. Thank you 🙏';

  return [
    shopName || 'Gebya',
    title,
    formatEthiopian(createdAt || Date.now()),
    '',
    actionLine,
    `Previous balance: ${fmt(previousBalance)} birr`,
    balanceLine,
    '',
    footer,
  ].join('\n');
}
