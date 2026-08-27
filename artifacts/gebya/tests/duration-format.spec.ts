import { describe, it, expect } from 'vitest';
import { formatDays, formatDaysAgo, formatDaysOverdue } from '../src/utils/durationFormat.js';

describe('formatDays — natural-language day counts (replaces "8D")', () => {
  it('uses plural for zero and multiple days (English)', () => {
    expect(formatDays(0, 'en')).toBe('0 days');
    expect(formatDays(2, 'en')).toBe('2 days');
    expect(formatDays(8, 'en')).toBe('8 days');
    expect(formatDays(26, 'en')).toBe('26 days');
  });

  it('uses singular for exactly one day (English)', () => {
    expect(formatDays(1, 'en')).toBe('1 day');
  });

  it('handles string and fractional inputs defensively', () => {
    expect(formatDays('8', 'en')).toBe('8 days');
    expect(formatDays(1.9, 'en')).toBe('1 day');
    expect(formatDays(null, 'en')).toBe('0 days');
    expect(formatDays(undefined, 'en')).toBe('0 days');
    expect(formatDays(-3, 'en')).toBe('0 days');
  });

  it('formats Amharic day counts', () => {
    expect(formatDays(1, 'am')).toBe('1 ቀን');
    expect(formatDays(8, 'am')).toBe('8 ቀናት');
  });

  it('never emits the compact "D" style', () => {
    for (const n of [0, 1, 2, 5, 8, 26]) {
      const out = formatDays(n, 'en');
      expect(out).not.toMatch(/\bd\b/i);
      expect(out).toMatch(/\bdays?\b/);
    }
  });
});

describe('formatDaysAgo — reminder history timestamps', () => {
  it('formats singular and plural (English)', () => {
    expect(formatDaysAgo(1, 'en')).toBe('1 day ago');
    expect(formatDaysAgo(5, 'en')).toBe('5 days ago');
  });

  it('formats Amharic', () => {
    expect(formatDaysAgo(1, 'am')).toBe('ከ1 ቀን በፊት');
    expect(formatDaysAgo(5, 'am')).toBe('ከ5 ቀን በፊት');
  });
});

describe('formatDaysOverdue — status pills', () => {
  it('formats singular and plural (English)', () => {
    expect(formatDaysOverdue(1, 'en')).toBe('1 day overdue');
    expect(formatDaysOverdue(6, 'en')).toBe('6 days overdue');
    expect(formatDaysOverdue(26, 'en')).toBe('26 days overdue');
  });

  it('formats Amharic (matches existing dictionary phrasing)', () => {
    expect(formatDaysOverdue(6, 'am')).toBe('6 ቀን ያለፈው');
  });
});
