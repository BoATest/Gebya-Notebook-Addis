/**
 * PayPage link builder (Phase 9)
 *
 * Pure helper — builds the customer-facing /pay?… URL that shows the
 * customer how to pay a dubie (USSD codes + shop account copy buttons).
 *
 * The PayPage itself ("routing only, never processes money") already ships;
 * this helper exists so the *merchant* can hand the link to the customer in
 * one tap after recording a credit/partial sale.
 *
 * Sensitive account details live in the PayPage's sessionStorage (it strips
 * them from the address bar). We only put public-ish keys in the URL:
 *   to, amount, from, ref, phone, tg
 */

function enc(value) {
  return encodeURIComponent(String(value == null ? '' : value));
}

/**
 * @param {object} opts
 * @param {string} opts.shopName        — shop display name (PayPage title)
 * @param {number} opts.amount          — amount owed (net, after any discount)
 * @param {string} [opts.customerName]  — customer's display name
 * @param {string} [opts.ref]           — transaction/customer ref (plain, for note only)
 * @param {string} [opts.shopPhone]     — E.164 shop phone (wallet/USSD target)
 * @param {string} [opts.shopTelegram]  — shop @handle or t.me username
 * @param {string} [opts.lang]          — 'am' | 'en'
 * @param {string} [opts.base]          — overridable origin for tests
 * @returns {string} absolute /pay?… URL
 */
export function buildPayPageLink({ shopName, amount, customerName, ref, shopPhone, shopTelegram, lang = 'en', base }) {
  const params = new URLSearchParams();
  const shop = String(shopName || '').trim();
  if (shop) params.set('to', shop);
  if (amount && Number(amount) > 0) params.set('amount', String(Number(amount)));
  const cust = String(customerName || '').trim();
  if (cust) params.set('from', cust);
  if (ref) params.set('ref', String(ref).slice(0, 60));
  // phone + tg ride along so the PayPage can prefill wallet targets.
  if (shopPhone) params.set('phone', shopPhone);
  if (shopTelegram) params.set('tg', shopTelegram);
  const qs = params.toString();
  const origin = base || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${origin}/pay${qs ? `?${qs}` : ''}`;
}

/**
 * Pre-filled chat message to accompany the link (bilingual).
 * @returns {string} readable message for WhatsApp/Telegram/SMS
 */
export function buildPayPageMessage({ shopName, amount, lang = 'en' }) {
  const who = String(shopName || '').trim();
  const amt = Number(amount || 0);
  if (lang === 'am') {
    return `ሰላም! ለ${who} የካቶርን ክፈያ በዚህ ማገናኛ መክፈል ይችላሉ። የሚከፈል መጠን: ${amt} ብር።`;
  }
  const whoPart = who ? ` to ${who}` : '';
  return `Hello! You can pay your balance${whoPart} here: ${amt} birr.`;
}

export default buildPayPageLink;