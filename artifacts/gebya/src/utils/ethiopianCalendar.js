import { toEthiopian } from 'ethiopian-date';

const ETHIOPIAN_MONTHS = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
];

function getEthiopianParts(date) {
  const d = new Date(date);
  const [ethYear, ethMonthIdx, ethDay] = toEthiopian(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate()
  );
  const monthName = ETHIOPIAN_MONTHS[ethMonthIdx - 1] || 'ጳጉሜ';
  return { year: ethYear, month: ethMonthIdx, day: ethDay, monthName };
}

export function formatEthiopian(date) {
  const { day, monthName, year } = getEthiopianParts(date);
  return `${day} ${monthName} ${year}`;
}

const ETHIOPIAN_TIME_PERIODS = {
  MORNING: 'ጠዋት',   // 6AM–11:59AM (Western)
  DAY: 'ቀን',         // 12PM–5:59PM
  EVENING: 'ማታ',     // 6PM–11:59PM
  NIGHT: 'ሌሊት',     // 12AM–5:59AM
};

function getEthiopianHour(westernHours) {
  const ethHour = (westernHours + 6) % 12;
  return ethHour === 0 ? 12 : ethHour;
}

function getEthiopianPeriod(westernHours) {
  if (westernHours >= 6 && westernHours < 12) return ETHIOPIAN_TIME_PERIODS.MORNING;
  if (westernHours >= 12 && westernHours < 18) return ETHIOPIAN_TIME_PERIODS.DAY;
  if (westernHours >= 18 && westernHours < 24) return ETHIOPIAN_TIME_PERIODS.EVENING;
  return ETHIOPIAN_TIME_PERIODS.NIGHT;
}

export function formatEthiopianTime(timestamp) {
  const d = new Date(timestamp);
  const westernHours = d.getHours();
  const hour = getEthiopianHour(westernHours);
  const period = getEthiopianPeriod(westernHours);
  return `${hour} ${period}`;
}

export function formatEthiopianShort(date) {
  const { day, monthName } = getEthiopianParts(date);
  return `${day} ${monthName}`;
}

export function getCurrentEthiopianDate() {
  return formatEthiopian(new Date());
}

export function getDueDateOptions() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const todayParts = getEthiopianParts(today);
  const tomorrowParts = getEthiopianParts(tomorrow);
  const nextWeekParts = getEthiopianParts(nextWeek);

  return [
    { label: `ዛሬ ${todayParts.day}`, value: today.getTime(), day: todayParts.day, display: formatEthiopianShort(today) },
    { label: `ነገ ${tomorrowParts.day}`, value: tomorrow.getTime(), day: tomorrowParts.day, display: formatEthiopianShort(tomorrow) },
    { label: `ሳም ${nextWeekParts.day}`, value: nextWeek.getTime(), day: nextWeekParts.day, display: formatEthiopianShort(nextWeek) },
  ];
}

export function getCreditStatus(dueDateTs) {
  const now = Date.now();
  const daysUntil = Math.floor((dueDateTs - now) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return { label: 'Overdue', color: 'red', dot: '🔴' };
  if (daysUntil <= 2) return { label: 'Due soon', color: 'red', dot: '🔴' };
  if (daysUntil <= 7) return { label: 'Due this week', color: 'yellow', dot: '🟡' };
  return { label: 'OK', color: 'green', dot: '🟢' };
}
