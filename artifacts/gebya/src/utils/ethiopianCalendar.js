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

  return [
    { label: 'ዛሬ (Today)', value: today.getTime(), display: formatEthiopianShort(today) },
    { label: 'ነገ (Tomorrow)', value: tomorrow.getTime(), display: formatEthiopianShort(tomorrow) },
    { label: 'ሚቀጥ. ሳምንት', value: nextWeek.getTime(), display: formatEthiopianShort(nextWeek) },
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
