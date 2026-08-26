// Pure presentational + helper utilities extracted from CustomerDetail.jsx
// (no hooks / no module state — safe to reuse across components)
export const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Telegram SVG logo ────────────────────────────────────────────────
export function TelegramIcon({ className, style }) {
  return (
    <svg
      className={className}
      style={style}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────
export function initialsOf(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function telegramState(customer) {
  if (customer?.telegram_chat_id) return 'linked';
  if (customer?.telegram_username) return 'manual';
  return 'none';
}
