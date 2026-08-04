/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  formatEthiopian,
  formatEthiopianTime,
  formatEthiopianShort,
  getDueDateOptions,
  getCreditStatus,
} from '../src/utils/ethiopianCalendar.js';

describe('ethiopianCalendar', () => {
  describe('formatEthiopian', () => {
    it('formats a known date correctly', () => {
      // September 11, 2024 = 1 Meskerem 2017 (Ethiopian New Year)
      const result = formatEthiopian(new Date(2024, 8, 11));
      expect(result).toBe('1 መስከረም 2017');
    });

    it('formats end of year correctly', () => {
      // September 10, 2024 = 13 ጳጉሜ 2016 (last day of Ethiopian year)
      const result = formatEthiopian(new Date(2024, 8, 10));
      expect(result).toMatch(/ጳጉሜ/);
    });

    it('accepts timestamp input', () => {
      const ts = new Date(2024, 0, 15).getTime(); // Jan 15, 2024
      const result = formatEthiopian(ts);
      expect(result).toMatch(/\d+ \S+ \d{4}/);
    });
  });

  describe('formatEthiopianTime', () => {
    it('formats morning hours (6-11)', () => {
      // 8:30 AM = 2:30 Ethiopian
      const ts = new Date(2024, 0, 15, 8, 30).getTime();
      const result = formatEthiopianTime(ts);
      expect(result).toBe('2:30 ጠዋት');
    });

    it('formats day hours (12-17)', () => {
      // 2:15 PM = 8:15 Ethiopian
      const ts = new Date(2024, 0, 15, 14, 15).getTime();
      const result = formatEthiopianTime(ts);
      expect(result).toBe('8:15 ቀን');
    });

    it('formats evening hours (18-23)', () => {
      // 7:00 PM = 1:00 Ethiopian
      const ts = new Date(2024, 0, 15, 19, 0).getTime();
      const result = formatEthiopianTime(ts);
      expect(result).toBe('1:00 ማታ');
    });

    it('formats night hours (0-5)', () => {
      // 3:45 AM = 9:45 Ethiopian
      const ts = new Date(2024, 0, 15, 3, 45).getTime();
      const result = formatEthiopianTime(ts);
      expect(result).toBe('9:45 ሌሊት');
    });

    it('pads single-digit minutes', () => {
      const ts = new Date(2024, 0, 15, 8, 5).getTime();
      const result = formatEthiopianTime(ts);
      expect(result).toBe('2:05 ጠዋት');
    });
  });

  describe('formatEthiopianShort', () => {
    it('returns day and month name without year', () => {
      const result = formatEthiopianShort(new Date(2024, 8, 11));
      expect(result).toBe('1 መስከረም');
    });
  });

  describe('getCreditStatus', () => {
    it('returns Overdue for past dates', () => {
      const past = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago
      const result = getCreditStatus(past);
      expect(result.label).toBe('Overdue');
      expect(result.color).toBe('red');
    });

    it('returns Due soon for 1 day ahead', () => {
      const tomorrow = Date.now() + 1 * 24 * 60 * 60 * 1000;
      const result = getCreditStatus(tomorrow);
      expect(result.label).toBe('Due soon');
      expect(result.color).toBe('red');
    });

    it('returns Due this week for 5 days ahead', () => {
      const in5Days = Date.now() + 5 * 24 * 60 * 60 * 1000;
      const result = getCreditStatus(in5Days);
      expect(result.label).toBe('Due this week');
      expect(result.color).toBe('yellow');
    });

    it('returns OK for 10 days ahead', () => {
      const in10Days = Date.now() + 10 * 24 * 60 * 60 * 1000;
      const result = getCreditStatus(in10Days);
      expect(result.label).toBe('OK');
      expect(result.color).toBe('green');
    });
  });

  describe('getDueDateOptions', () => {
    it('returns 3 options', () => {
      const options = getDueDateOptions();
      expect(options).toHaveLength(3);
    });

    it('each option has label, value, day, display', () => {
      const options = getDueDateOptions();
      for (const opt of options) {
        expect(typeof opt.label).toBe('string');
        expect(typeof opt.value).toBe('number');
        expect(typeof opt.day).toBe('number');
        expect(typeof opt.display).toBe('string');
      }
    });

    it('first option is today', () => {
      const options = getDueDateOptions();
      expect(options[0].label).toMatch(/^ዛሬ/);
    });

    it('second option is tomorrow', () => {
      const options = getDueDateOptions();
      expect(options[1].label).toMatch(/^ነገ/);
    });
  });
});
