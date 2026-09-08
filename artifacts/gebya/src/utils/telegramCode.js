// telegramCode.js — One-time code generation for frictionless Telegram linking.
//
// Instead of QR scanning or deep links, the merchant shows the customer a
// short 4-character code. The customer sends it to the shared Gebya bot.
// The backend resolves the code → links the chat_id → confirms to the owner.
//
// This is the lowest-friction method: no camera needed, no app switching,
// works on any phone with Telegram installed.

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 (ambiguous)
const CODE_LENGTH = 4;
const CODE_TTL_MS =15 * 60 * 1000; // 15 minutes

/**
 * Generate a short, unambiguous one-time code.
 * @returns {string} e.g. "X7K9"
 */
export function generateTelegramCode() {
  let code = '';
  const max = CODE_CHARS.length;
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * max);
    code += CODE_CHARS[idx];
  }
  return code;
}

/**
 * Validate a code format (4 chars from the allowed set).
 * @param {string} code
 * @returns {boolean}
 */
export function isValidTelegramCode(code) {
  if (!code || typeof code !== 'string') return false;
  const upper = code.trim().toUpperCase();
  if (upper.length !== CODE_LENGTH) return false;
  return [...upper].every(ch => CODE_CHARS.includes(ch));
}

/**
 * Get the TTL for a code.
 * @returns {number} milliseconds
 */
export function getCodeTTL() {
  return CODE_TTL_MS;
}

export default { generateTelegramCode, isValidTelegramCode, getCodeTTL };
