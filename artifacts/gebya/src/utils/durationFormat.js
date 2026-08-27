// durationFormat.js — natural-language day formatting for the customer page.
//
// Replaces the compact "8D" / "5d" / "6d OVERDUE" style with readable text:
//   formatDays(8)        → "8 days"     (avg payment period)
//   formatDays(1)        → "1 day"      (singular/plural handled)
//   formatDaysAgo(5)     → "5 days ago" (reminder history)
//   formatDaysOverdue(6) → "6 days overdue" (status pills)
//
// Amharic mirrors the phrasing already used in dictionaries.js
// (ቀን = day, ቀናት = days, ያለፈው = overdue, ከ… በፊት = … ago).
//
// Pure functions — no locale APIs, safe for unit tests and SSR.

function normalizeDays(days) {
  const n = Math.floor(Number(days) || 0);
  return n < 0 ? 0 : n;
}

/** "8 days" / "1 day" — average payment period and compact day counts. */
export function formatDays(days, lang = 'en') {
  const n = normalizeDays(days);
  if (lang === 'am') return n === 1 ? '1 ቀን' : `${n} ቀናት`;
  return n === 1 ? '1 day' : `${n} days`;
}

/** "5 days ago" / "1 day ago" — reminder history timestamps. */
export function formatDaysAgo(days, lang = 'en') {
  const n = normalizeDays(days);
  if (lang === 'am') return n === 1 ? 'ከ1 ቀን በፊት' : `ከ${n} ቀን በፊት`;
  return n === 1 ? '1 day ago' : `${n} days ago`;
}

/** "6 days overdue" / "1 day overdue" — status pills. */
export function formatDaysOverdue(days, lang = 'en') {
  const n = normalizeDays(days);
  if (lang === 'am') return `${n} ቀን ያለፈው`;
  return n === 1 ? '1 day overdue' : `${n} days overdue`;
}
