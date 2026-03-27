import { formatEthiopian } from './ethiopianCalendar';
import { fmt } from './numformat';
import { CUSTOMER_TRANSACTION_TYPES } from './customerTransactionTypes';

export function normalizeTelegram(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('@')) return trimmed;
  if (/^https?:\/\/t\.me\//i.test(trimmed)) return trimmed;
  if (/^t\.me\//i.test(trimmed)) return `https://${trimmed}`;
  return `@${trimmed.replace(/^@+/, '')}`;
}

export function buildTelegramMessageUrl(value, message) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  if (/^https?:\/\/t\.me\//i.test(trimmed)) {
    const separator = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${separator}text=${encodeURIComponent(message)}`;
  }

  if (/^t\.me\//i.test(trimmed)) {
    return `https://${trimmed}?text=${encodeURIComponent(message)}`;
  }

  const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
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
    return buildTelegramMessageUrl(shopTelegram, connectMessage);
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
  const title = isPayment ? '✅ Payment Recorded' : '🛒 New Credit Recorded';
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
