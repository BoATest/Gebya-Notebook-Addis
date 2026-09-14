/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { fmtInput, parseInput, sanitizeQtyInput, sanitizeAmountInput } from '../src/utils/numformat.js';

describe('fmtInput — live-typing amount formatter', () => {
  it('keeps a trailing decimal separator the merchant just typed', () => {
    expect(fmtInput('10.')).toBe('10.');
    expect(fmtInput('.5')).toBe('.5');
  });

  it('groups thousands without touching the fractional part', () => {
    expect(fmtInput('1000.25')).toBe('1,000.25');
    expect(fmtInput('1234567')).toBe('1,234,567');
  });
});

describe('parseInput', () => {
  it('drops grouping separators so parseFloat sees a plain number', () => {
    expect(parseFloat(parseInput('1,000.25'))).toBe(1000.25);
  });
});

describe('sanitizeQtyInput — fractional quantities (1.5 kg, 2.5 litres)', () => {
  it('keeps a single decimal point typed mid-value', () => {
    expect(sanitizeQtyInput('1.5')).toBe('1.5');
    expect(sanitizeQtyInput('1.')).toBe('1.');
    expect(sanitizeQtyInput('.5')).toBe('.5');
  });

  it('reads a comma keypad separator as the decimal mark, not a thousands mark', () => {
    // The legacy filter deleted it, turning "1,5" into "15" — a silent 10x error.
    expect(sanitizeQtyInput('1,5')).toBe('1.5');
  });

  it('collapses extra separators into a single decimal point', () => {
    expect(sanitizeQtyInput('1.5.2')).toBe('1.52');
    expect(sanitizeQtyInput('1..5')).toBe('1.5');
  });

  it('strips letters and currency symbols', () => {
    expect(sanitizeQtyInput('1.5kg')).toBe('1.5');
    expect(sanitizeQtyInput('2 ETB')).toBe('2');
  });
});

describe('sanitizeAmountInput — money fields backed by fmtInput', () => {
  it('strips the thousands separators fmtInput added', () => {
    expect(sanitizeAmountInput('1,000.25')).toBe('1000.25');
  });

  it('keeps a trailing decimal separator while typing', () => {
    expect(sanitizeAmountInput('10.')).toBe('10.');
  });

  it('collapses extra decimal points', () => {
    expect(sanitizeAmountInput('1.5.2')).toBe('1.52');
  });

  it('never treats a comma as a decimal mark (it is a grouping separator here)', () => {
    expect(sanitizeAmountInput('1,5')).toBe('15');
  });

  it('strips everything that is not a digit or separator', () => {
    expect(sanitizeAmountInput('12abc.5')).toBe('12.5');
  });
});