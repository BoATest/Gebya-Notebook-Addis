const ETHIOPIAN_MONTHS = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
];

const ETHIOPIAN_DAYS_OF_WEEK = ['እሁድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ'];

function gregorianToEthiopian(date) {
  const d = new Date(date);
  const gYear = d.getFullYear();
  const gMonth = d.getMonth() + 1;
  const gDay = d.getDate();

  const jdOffset = 1723856;
  const gToJD = (y, m, dd) => {
    const a = Math.floor((14 - m) / 12);
    const y2 = y + 4800 - a;
    const m2 = m + 12 * a - 3;
    return dd + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  };

  const jd = gToJD(gYear, gMonth, gDay);
  const r = jd - jdOffset;
  const n = r % 1461;
  const y = Math.floor(r / 1461) * 4;
  const mDay = n % 365;
  const eYear = y + Math.floor(n / 365) + 1;
  const eMonth = Math.floor(mDay / 30);
  const eDay = (mDay % 30) + 1;

  return {
    year: eYear,
    month: eMonth,
    day: eDay,
    monthName: ETHIOPIAN_MONTHS[eMonth] || 'ጳጉሜ'
  };
}

export function formatEthiopian(date) {
  const d = new Date(date);
  const eth = gregorianToEthiopian(d);
  return `${eth.day} ${eth.monthName} ${eth.year}`;
}

export function formatEthiopianShort(date) {
  const d = new Date(date);
  const eth = gregorianToEthiopian(d);
  return `${eth.day} ${eth.monthName}`;
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
    { label: 'ሚቀጥለው ሳምንት (Next Week)', value: nextWeek.getTime(), display: formatEthiopianShort(nextWeek) },
  ];
}

export function getCreditStatus(dueDateTs) {
  const now = Date.now();
  const daysUntil = Math.floor((dueDateTs - now) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return { label: 'Overdue', color: 'red', dot: '🔴' };
  if (daysUntil <= 2) return { label: 'Due soon', color: 'yellow', dot: '🟡' };
  return { label: 'OK', color: 'green', dot: '🟢' };
}

export function getDayOfWeekEthiopian(date) {
  const d = new Date(date);
  return ETHIOPIAN_DAYS_OF_WEEK[d.getDay()];
}
