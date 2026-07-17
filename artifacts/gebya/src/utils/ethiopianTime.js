// utils/ethiopianTime.js — Convert a 24h local clock time to the Ethiopian 12-hour clock.
//
// The Ethiopian day starts at 6:00 AM local (= 12:00 Ethiopian "day" hour 1).
// Mapping examples: 7:00 → 1, 8:00 → 2, 11:00 → 5, 13:00 → 7, 17:00 → 11.
// Minutes are unchanged. This is a clock-shift display conversion only — it does
// NOT change the wall-clock moment an alarm fires (that stays in local time).

export function ethiopianHourFromLocal(localHour) {
  const h = ((Number(localHour) + 5) % 12) + 1;
  return h;
}

// Returns { ethHour, ethLabel } for a "HH:MM" 24h string.
export function toEthiopianClock(time24) {
  const [hStr, mStr] = (time24 || '20:00').split(':');
  const localHour = Number(hStr);
  const minute = Number(mStr);
  const ethHour = ethiopianHourFromLocal(localHour);
  const hh = String(ethHour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return {
    ethHour,
    ethLabel: `${hh}:${mm}`,
    localLabel: `${String(localHour).padStart(2, '0')}:${mm}`,
  };
}

// ms until the next occurrence of a "HH:MM" time today (or tomorrow if already passed).
export function msUntilNext(time24) {
  const [hStr, mStr] = (time24 || '20:00').split(':');
  const target = new Date();
  target.setHours(Number(hStr), Number(mStr), 0, 0);
  let diff = target.getTime() - Date.now();
  if (diff <= 0) diff += 24 * 60 * 60 * 1000;
  return diff;
}
