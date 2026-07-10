/**
 * parseItemDraft and parseItemInput unit tests.
 *
 * Tests the Amharic currency marker "ብር" (U+1265 U+122B) alongside
 * the existing Latin "birr"/"etb" markers.
 */
import { describe, it, expect } from 'vitest';
import { parseItemDraft, parseItemInput } from '../src/components/TransactionForm';

describe('parseItemDraft', () => {
  describe('Amharic currency marker "ብር"', () => {
    it('parses "ስኳር 500 ብር" into name=ስኳር, amount=500', () => {
      const result = parseItemDraft('ስኳር 500 ብር');
      expect(result).toEqual({
        kind: 'item',
        name: 'ስኳር',
        qty: 1,
        unitPrice: 500,
        raw: 'ስኳር 500 ብር',
      });
    });

    it('parses "ቡና 3x100 ብር" — quantity pattern not supported by simple regex, treated as full name', () => {
      const result = parseItemDraft('ቡና 3x100 ብር');
      // The 3x100 pattern is not parsed by the simple name+amount regex;
      // the entire string becomes the item name
      expect(result).toEqual({
        kind: 'item',
        name: 'ቡና 3x100 ብር',
        qty: 1,
        unitPrice: null,
        raw: 'ቡና 3x100 ብር',
      });
    });

    it('parses "ክፍያ 1500 ብር" into name=ክፍያ, amount=1500', () => {
      const result = parseItemDraft('ክፍያ 1500 ብር');
      expect(result).toEqual({
        kind: 'item',
        name: 'ክፍያ',
        qty: 1,
        unitPrice: 1500,
        raw: 'ክፍያ 1500 ብር',
      });
    });
  });

  describe('Latin currency markers (regression)', () => {
    it('parses "ሰርving 250 birr" with Latin birr', () => {
      const result = parseItemDraft('ሰርving 250 birr');
      expect(result).toEqual({
        kind: 'item',
        name: 'ሰርving',
        qty: 1,
        unitPrice: 250,
        raw: 'ሰርving 250 birr',
      });
    });

    it('parses "ዱብያ 1000 etb" with Latin etb', () => {
      const result = parseItemDraft('ዱብያ 1000 etb');
      expect(result).toEqual({
        kind: 'item',
        name: 'ዱብያ',
        qty: 1,
        unitPrice: 1000,
        raw: 'ዱብያ 1000 etb',
      });
    });

    it('parses "BIRR 500" case-insensitively', () => {
      const result = parseItemDraft('coffee 500 BIRR');
      expect(result).toEqual({
        kind: 'item',
        name: 'coffee',
        qty: 1,
        unitPrice: 500,
        raw: 'coffee 500 BIRR',
      });
    });
  });

  describe('no currency marker', () => {
    it('parses "ክፍያ 500" without any marker', () => {
      const result = parseItemDraft('ክፍያ 500');
      expect(result).toEqual({
        kind: 'item',
        name: 'ክፍያ',
        qty: 1,
        unitPrice: 500,
        raw: 'ክፍያ 500',
      });
    });
  });

  describe('edge cases', () => {
    it('returns empty for blank input', () => {
      expect(parseItemDraft('')).toEqual({ kind: 'empty', raw: '' });
    });

    it('returns fallback for text with no number', () => {
      const result = parseItemDraft('ስኳር');
      expect(result).toEqual({
        kind: 'item',
        name: 'ስኳር',
        qty: 1,
        unitPrice: null,
        raw: 'ስኳር',
      });
    });

    it('handles decimal amounts with ብር', () => {
      const result = parseItemDraft('ስኳር 12.50 ብር');
      expect(result).toEqual({
        kind: 'item',
        name: 'ስኳር',
        qty: 1,
        unitPrice: 12.5,
        raw: 'ስኳር 12.50 ብር',
      });
    });

    it('matches catalog entries first', () => {
      const catalog = [{ name: 'ስኳር', code: 'sugar' }];
      const result = parseItemDraft('ስኳር', catalog);
      expect(result.kind).toBe('catalog');
      expect(result.entry).toBe(catalog[0]);
    });
  });
});

describe('parseItemInput', () => {
  describe('Amharic currency marker "ብር"', () => {
    it('parses "ስኳር 500 ብር" into name=ስኳር, amount=500', () => {
      const result = parseItemInput('ስኳር 500 ብር');
      expect(result).toEqual({
        kind: 'item',
        name: 'ስኳር',
        unitPrice: 500,
        qty: 1,
        raw: 'ስኳር 500 ብር',
      });
    });
  });

  describe('Latin currency markers (regression)', () => {
    it('parses "coffee 250 birr"', () => {
      const result = parseItemInput('coffee 250 birr');
      expect(result).toEqual({
        kind: 'item',
        name: 'coffee',
        unitPrice: 250,
        qty: 1,
        raw: 'coffee 250 birr',
      });
    });

    it('parses "tea 100 etb"', () => {
      const result = parseItemInput('tea 100 etb');
      expect(result).toEqual({
        kind: 'item',
        name: 'tea',
        unitPrice: 100,
        qty: 1,
        raw: 'tea 100 etb',
      });
    });
  });

  describe('qty × name pattern', () => {
    it('parses "3x ቡና" into name=ቡና, qty=3', () => {
      const result = parseItemInput('3x ቡና');
      expect(result).toEqual({
        kind: 'item',
        name: 'ቡና',
        qty: 3,
        unitPrice: null,
        raw: '3x ቡና',
      });
    });
  });

  describe('pure number', () => {
    it('parses "500" as amount', () => {
      const result = parseItemInput('500');
      expect(result).toEqual({
        kind: 'amount',
        value: 500,
        raw: '500',
      });
    });
  });

  describe('edge cases', () => {
    it('returns null for empty input', () => {
      expect(parseItemInput('')).toBeNull();
    });

    it('handles decimal amounts with ብር', () => {
      const result = parseItemInput('ስኳር 12.50 ብር');
      expect(result).toEqual({
        kind: 'item',
        name: 'ስኳር',
        unitPrice: 12.5,
        qty: 1,
        raw: 'ስኳር 12.50 ብር',
      });
    });
  });
});
