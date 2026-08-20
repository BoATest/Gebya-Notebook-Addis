/**
 * Unit tests for utils/customerTelegram.js — Telegram message builders,
 * URL builders, link tokens, and transaction references.
 *
 * Run: pnpm vitest run tests/customerTelegram.test.mjs
 */
/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeTelegram,
  buildTelegramMessageUrl,
  createCustomerTelegramLinkToken,
  buildCustomerConnectMessage,
  buildCustomerConnectLink,
  buildCustomerLedgerTelegramMessage,
  createCustomerTransactionReference,
} from '../src/utils/customerTelegram.js';
import { CUSTOMER_TRANSACTION_TYPES } from '../src/utils/customerTransactionTypes';

describe('normalizeTelegram', () => {
  it('returns @handle when input is @handle', () => {
    expect(normalizeTelegram('@almaz')).toBe('@almaz');
  });

    it('returns empty for bare handle without @ (not auto-prefixed)', () => {
    expect(normalizeTelegram('almaz')).toBe('');
  });

  it('passes through https://t.me/... URLs', () => {
    expect(normalizeTelegram('https://t.me/almaz')).toBe('https://t.me/almaz');
  });

  it('normalizes t.me/... to https://t.me/...', () => {
    expect(normalizeTelegram('t.me/almaz')).toBe('https://t.me/almaz');
  });

  it('preserves query params in URL', () => {
    expect(normalizeTelegram('https://t.me/almaz?start=abc'))
      .toBe('https://t.me/almaz?start=abc');
  });

  it('returns empty string for nil input', () => {
    expect(normalizeTelegram('')).toBe('');
    expect(normalizeTelegram(null)).toBe('');
    expect(normalizeTelegram(undefined)).toBe('');
  });

  it('returns empty string for invalid values', () => {
    expect(normalizeTelegram('not a valid handle')).toBe('');
    expect(normalizeTelegram('javascript:alert(1)')).toBe('');
  });

  it('rejects handles with spaces', () => {
    expect(normalizeTelegram('almaz shop')).toBe('');
    expect(normalizeTelegram('@almaz shop')).toBe('');
  });
});

describe('buildTelegramMessageUrl', () => {
  it('builds URL with @handle (strips @)', () => {
    const url = buildTelegramMessageUrl('@almaz', 'Hello & bye');
    expect(url).toBe('https://t.me/almaz?text=' + encodeURIComponent('Hello & bye'));
  });

    it('returns null for bare handle without @ (not normalized)', () => {
    expect(buildTelegramMessageUrl('almaz', 'Hello')).toBeNull();
  });

  it('builds URL from https://t.me/... with ?', () => {
    const url = buildTelegramMessageUrl('https://t.me/almaz', 'Hello');
    expect(url).toBe('https://t.me/almaz?text=' + encodeURIComponent('Hello'));
  });

  it('builds URL from https://t.me/... with existing query using &', () => {
    const url = buildTelegramMessageUrl('https://t.me/almaz?start=abc', 'Hello');
    expect(url).toBe('https://t.me/almaz?start=abc&text=' + encodeURIComponent('Hello'));
  });

  it('builds URL from t.me/... (no protocol)', () => {
    const url = buildTelegramMessageUrl('t.me/almaz', 'Hello');
    expect(url).toBe('https://t.me/almaz?text=' + encodeURIComponent('Hello'));
  });

  it('returns null for invalid input', () => {
    expect(buildTelegramMessageUrl('invalid handle', 'Hello')).toBeNull();
    expect(buildTelegramMessageUrl('', 'Hello')).toBeNull();
    expect(buildTelegramMessageUrl(null, 'Hello')).toBeNull();
  });

    it('encodes special characters in message', () => {
    const url = buildTelegramMessageUrl('@almaz', 'Price: 500 ETB & thanks!');
    expect(url).toContain(encodeURIComponent('500 ETB & thanks!'));
  });
});

describe('createCustomerTelegramLinkToken', () => {
  it('returns token with customer ID prefix', () => {
    const token = createCustomerTelegramLinkToken('cust-123');
    expect(token).toMatch(/^cust-cust-123-/);
  });

  it('uses "new" when customer ID is omitted', () => {
    const token = createCustomerTelegramLinkToken();
    expect(token).toMatch(/^cust-new-/);
  });

  it('generates unique tokens for same customer', () => {
    const t1 = createCustomerTelegramLinkToken('cust-1');
    const t2 = createCustomerTelegramLinkToken('cust-1');
    expect(t1).not.toBe(t2);
  });

  it('contains a non-trivial suffix', () => {
    const token = createCustomerTelegramLinkToken(42);
    const suffix = token.split('cust-42-')[1];
    expect(suffix).toBeTruthy();
    expect(suffix.length).toBeGreaterThan(5);
  });
});

describe('buildCustomerConnectMessage', () => {
  it('includes shop name, customer name, and token', () => {
    const msg = buildCustomerConnectMessage({
      shopName: 'Tigist Shop', customerName: 'Almaz', token: 'abc-123',
    });
    expect(msg).toContain('🏪 Tigist Shop');
    expect(msg).toContain('👤 Almaz');
    expect(msg).toContain('🔢 abc-123');
  });

  it('defaults shop name to Gebya', () => {
    const msg = buildCustomerConnectMessage({ customerName: 'Almaz', token: 'tok' });
    expect(msg).toContain('🏪 Gebya');
  });

  it('defaults customer name to Customer', () => {
    const msg = buildCustomerConnectMessage({ shopName: 'Shop', token: 'tok' });
    expect(msg).toContain('👤 Customer');
  });

  it('falls back to timestamp-based token when token is missing', () => {
    const msg = buildCustomerConnectMessage({ shopName: 'Shop', customerName: 'A' });
    expect(msg).toMatch(/🔢 pending-\w+/);
  });

    it('mentions opening the bot', () => {
    const msg = buildCustomerConnectMessage({ shopName: 'S', customerName: 'A', token: 't' });
    expect(msg).toContain('Open the Gebya bot');
  });
});

describe('buildCustomerConnectLink', () => {
  const base = { shopName: 'Tigist', customerName: 'Almaz', token: 'tok-123' };

  it('builds t.me bot link when botUsername provided', () => {
    const url = buildCustomerConnectLink({ ...base, botUsername: 'shopnotebookbot' });
    expect(url).toBe('https://t.me/shopnotebookbot?start=' + encodeURIComponent('tok-123'));
  });

  it('strips leading @ from botUsername', () => {
    const url = buildCustomerConnectLink({ ...base, botUsername: '@shopnotebookbot' });
    expect(url).toBe('https://t.me/shopnotebookbot?start=' + encodeURIComponent('tok-123'));
  });

  it('strips multiple leading @ from botUsername', () => {
    const url = buildCustomerConnectLink({ ...base, botUsername: '@@shopbot' });
    expect(url).toBe('https://t.me/shopbot?start=' + encodeURIComponent('tok-123'));
  });

  it('falls back to shopTelegram URL when no botUsername', () => {
    const url = buildCustomerConnectLink({
      ...base, botUsername: null, shopTelegram: '@tgistshop',
    });
    expect(url).toContain('https://t.me/tgistshop');
    expect(url).toContain('text=');
  });

  it('falls back to share URL when neither botUsername nor shopTelegram', () => {
    const url = buildCustomerConnectLink({ ...base, botUsername: null, shopTelegram: null });
    expect(url).toContain('https://t.me/share/url');
    expect(url).toContain('url=');
    expect(url).toContain('text=');
  });

  it('share URL fallback includes the connect message', () => {
    const url = buildCustomerConnectLink({ ...base, botUsername: null, shopTelegram: null });
    expect(url).toContain(encodeURIComponent('🔢 tok-123'));
  });
});

describe('buildCustomerLedgerTelegramMessage', () => {
  it('builds credit_add message with item note', () => {
    const msg = buildCustomerLedgerTelegramMessage({
      shopName: 'Tigist Shop', customerName: 'Almaz',
      type: CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD,
      amount: 500, itemNote: 'Tea', previousBalance: 0, updatedBalance: 500,
      createdAt: Date.now(), referenceCode: 'TX0001',
    });
    expect(msg).toContain('🏪 Tigist Shop');
    expect(msg).toContain('🧾 Credit Added');
    expect(msg).toContain('+500.00 ETB');
    expect(msg).toContain('👤 Almaz');
    expect(msg).toContain('📦 Tea');
    expect(msg).toContain('Previous: 0.00 ETB');
    expect(msg).toContain('New: 500.00 ETB');
    expect(msg).toContain('🔢 Ref: TX0001');
  });

  it('builds payment message with negative sign', () => {
    const msg = buildCustomerLedgerTelegramMessage({
      shopName: 'Shop', customerName: 'Bob',
      type: CUSTOMER_TRANSACTION_TYPES.PAYMENT,
      amount: 300, previousBalance: 500, updatedBalance: 200,
      createdAt: Date.now(), referenceCode: null,
    });
    expect(msg).toContain('💰 Payment Received');
    expect(msg).toContain('-300.00 ETB');
    expect(msg).toContain('Remaining: 200.00 ETB');
  });

  it('omits item note when not provided for credit', () => {
    const msg = buildCustomerLedgerTelegramMessage({
      shopName: 'S', customerName: 'A',
      type: CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD,
      amount: 100, itemNote: null, previousBalance: 0, updatedBalance: 100,
      createdAt: Date.now(), referenceCode: null,
    });
    expect(msg).not.toContain('📦');
    expect(msg).not.toContain('🔢 Ref:');
  });
});

describe('createCustomerTransactionReference', () => {
  it('creates TX-prefixed code for numeric ID', () => {
    expect(createCustomerTransactionReference(1)).toBe('TX0001');
    expect(createCustomerTransactionReference(42)).toBe('TX0042');
    expect(createCustomerTransactionReference(9999)).toBe('TX9999');
  });

  it('pads to 4 digits', () => {
    expect(createCustomerTransactionReference(7)).toBe('TX0007');
    expect(createCustomerTransactionReference(123)).toBe('TX0123');
  });

  it('falls back to timestamp for non-numeric ID', () => {
    const ref = createCustomerTransactionReference('abc');
    expect(ref).toMatch(/^TX\d+$/);
  });

  it('uses createdAt when ID is non-numeric', () => {
    const ref = createCustomerTransactionReference('invalid', 1609459200000);
    expect(ref).toBe('TX' + String(1609459200000).slice(-6));
  });
});
