export function fmt(n) {
  return Number(n ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtInput(str) {
  if (str === '' || str === null || str === undefined) return '';
  const s = String(str);
  const [int, dec] = s.split('.');
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${intFormatted}.${dec}` : intFormatted;
}

export function parseInput(str) {
  return String(str ?? '').replace(/,/g, '');
}
