export function useTimeOfDay() {
  const hour = new Date().getHours();
  let period, greetingEn, greetingAm;

  if (hour < 5) {
    period = 'night';
    greetingEn = 'Good evening';
    greetingAm = 'እንደምን አመሸህ';
  } else if (hour < 12) {
    period = 'morning';
    greetingEn = 'Good morning';
    greetingAm = 'እንደምን አደርክ';
  } else if (hour < 17) {
    period = 'afternoon';
    greetingEn = 'Good afternoon';
    greetingAm = 'እንደምን ዋልክ';
  } else if (hour < 20) {
    period = 'evening';
    greetingEn = 'Good evening';
    greetingAm = 'እንደምን አመሸህ';
  } else {
    period = 'night';
    greetingEn = 'Good evening';
    greetingAm = 'እንደምን አመሸህ';
  }

  return { period, greeting: { en: greetingEn, am: greetingAm } };
}
