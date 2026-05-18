import { getCustomerCollectionStatus } from './customerLedger.js';
import { formatEthiopian } from './ethiopianCalendar.js';

function cleanText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function getCustomerName(customer = {}) {
  return cleanText(customer.display_name || customer.displayName) || 'Customer';
}

function getCustomerBalance(customer = {}) {
  const balance = Number(customer.balance ?? customer.currentBalance ?? 0);
  return Number.isFinite(balance) ? Math.max(balance, 0) : 0;
}

function formatReminderAmount(amount) {
  if (Number.isInteger(amount)) return amount.toLocaleString('en-US');
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildReminderDueSentence(status = {}, customer = {}) {
  if (status.key === 'due_today') return 'This amount is due today.';
  if (status.key === 'overdue') {
    const days = Number(status.days) || 0;
    return `This amount is overdue by ${days} ${days === 1 ? 'day' : 'days'}.`;
  }
  if (status.key === 'due_in') {
    const days = Number(status.days) || 0;
    return `This amount is due in ${days} ${days === 1 ? 'day' : 'days'}.`;
  }
  if (status.key === 'no_due_date' && customer.needs_follow_up) {
    const days = customer.days_since_activity || 0;
    return `This balance has been open for ${days} ${days === 1 ? 'day' : 'days'}.`;
  }
  return 'No due date was set.';
}

export function buildCustomerReminderMessage({ customer, shopName, now = Date.now() } = {}) {
  const safeShopName = cleanText(shopName) || 'your shop';
  const balance = getCustomerBalance(customer);
  const status = customer?.collection_status || getCustomerCollectionStatus(customer || {}, now);

  return [
    `Selam ${getCustomerName(customer)}, this is a reminder from ${safeShopName}.`,
    `Your remaining balance is ${formatReminderAmount(balance)} birr.`,
    buildReminderDueSentence(status, customer || {}),
    'Thank you.',
  ].join('\n');
}

export function buildCreditAddedMessage({ customer, shopName, amount, itemNote, dueDate, balance, now = Date.now() }) {
  const safeShopName = cleanText(shopName) || 'the shop';
  const customerName = getCustomerName(customer);
  const formattedAmount = formatReminderAmount(amount);
  const formattedBalance = formatReminderAmount(balance);
  const noteText = itemNote ? `\nNote: ${itemNote}` : '';
  const returnDateText = dueDate ? `\nReturn date: ${formatEthiopian(dueDate)}` : '\nReturn date: Not set';

  return [
    `Gebya note from ${safeShopName}`,
    `Customer: ${customerName}`,
    `Item/Note: ${itemNote || 'Not specified'}`,
    `Amount added: ${formattedAmount} birr`,
    `Return date: ${dueDate ? formatEthiopian(dueDate) : 'Not set'}`,
    `Remaining balance with ${safeShopName}: ${formattedBalance} birr`,
    'If this looks wrong, please contact the shop.',
  ].join('\n');
}

export function buildPaymentReceiptMessage({ customer, shopName, amount, balance, now = Date.now() }) {
  const safeShopName = cleanText(shopName) || 'the shop';
  const customerName = getCustomerName(customer);
  const formattedAmount = formatReminderAmount(amount);
  const formattedBalance = formatReminderAmount(balance);

  return [
    `Payment receipt from ${safeShopName}`,
    `Customer: ${customerName}`,
    `Amount paid: ${formattedAmount} birr`,
    `Date: ${formatEthiopian(now)}`,
    `Remaining balance with ${safeShopName}: ${formattedBalance} birr`,
    'Thank you.',
  ].join('\n');
}