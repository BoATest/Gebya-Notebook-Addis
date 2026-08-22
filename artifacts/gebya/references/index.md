# Mobile App Testing Guide

> Gebya is a **React + Vite web PWA** (not a native mobile app). Testing is done
> with **Vitest** (unit) and **Playwright** (end-to-end). This index adapts the
> generic mobile-app-testing template to the actual production stack.

## Table of Contents

- [Overview](#overview)
- [When to Use](#when-to-use)
- [Quick Start](#quick-start)
- [Reference Guides](#reference-guides)
- [Best Practices](#best-practices)
- [Key Flows to Test](#key-flows-to-test)

## Overview

Gebya's testing strategy covers four layers:

| Layer | Scope | Tool |
|---|---|---|
| **Unit** | Pure logic (formatters, message builders, selectors) | Vitest |
| **Store** | Zustand state logic (permissions, sync engine) | Vitest |
| **E2E** | Full user flows across the PWA UI | Playwright |
| **Performance** | Lighthouse scores, trace metrics, offline resilience | Playwright tracing + Lighthouse |

## When to Use

- Creating reliable web applications with test coverage
- Automating UI testing across desktop and mobile viewports
- Performance testing and optimization
- Integration testing with backend services (Telegram bot, sync API)
- Regression testing before releases

## Quick Start

### Unit test with Vitest

```js
/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { buildReminderMessage } from '../src/utils/reminders';

describe('Reminder utilities', () => {
  it('builds a gentle message in English', () => {
    const message = buildReminderMessage({
      template: 'gentle',
      lang: 'en',
      customer: { display_name: 'Almaz', balance: 500 },
      shopName: 'Tigist Shop',
    });
    expect(message).toContain('Almaz');
    expect(message).toContain('500');
  });
});
```

### E2E test with Playwright

```ts
import { test, expect } from '@playwright/test';

test('record credit → Telegram notification enqueued', async ({ page }) => {
  await seedSettings(page);
  await seedLinkedCustomer(page);
  await page.route('**/api/telegram/**', route => route.fulfill({...}));
  // Navigate + record credit → assert notification was enqueued
});
```

### Running

```bash
pnpm vitest run tests/reminders.test.mjs   # single unit test
pnpm test:e2e                              # all E2E tests
```

## Reference Guides

Detailed implementations:

| Guide | Contents |
|---|---|
| [Testing with Vitest & Playwright](testing-with-vitest-and-playwright.md) | Unit testing (Vitest), E2E testing (Playwright), mocking, IndexedDB seeding |
| [Cross-Browser & Mobile Viewport Testing](cross-browser-mobile-viewport-testing.md) | Device emulation, touch interaction, cross-browser CI matrix |
| [Performance Testing](performance-testing.md) | Lighthouse, Playwright tracing, offline resilience, CI perf gates |
| [Offline & Resilience Testing](offline-resilience-testing.md) | Service worker, offline transactions, sync queue, network resilience |

## Best Practices

### ✅ DO

- Write tests for business logic first (formatters, message builders, payment channels)
- Use dependency injection for testability (mock `fetch`, mock `db`)
- Mock external API calls in unit tests; seed real IndexedDB in E2E
- Test both success and failure paths (API 500, offline, unlinked customer)
- Automate UI testing for critical flows (record sale, credit, Telegram notify)
- Run tests on real browsers (Chromium) and mobile device descriptors
- Measure performance on target devices (Lighthouse, tracing)
- Keep tests isolated and independent (`beforeEach` resets)
- Use meaningful test names (`it('returns 404 when session not found')`)
- Maintain >80% code coverage for utility modules

### ❌ DON'T

- Skip testing UI-critical flows (credit recording, Telegram notification)
- Use hardcoded test data (use factory functions or seed helpers)
- Ignore performance regressions (add Lighthouse CI)
- Test implementation details (assert on outcomes, not internal calls)
- Make tests flaky or unreliable (mock time, use retries sparingly)
- Skip testing on mobile viewports (PWA targets phones ≤390px)
- Ignore accessibility testing (use Playwright accessibility assertions)
- Create interdependent tests (each test should reset its state)
- Test without mocking APIs in unit tests (mock `fetch` with `vi.fn()`)
- Deploy untested code

## Key Flows to Test

### Credit → Record → Telegram/SMS Notification

The most critical business flow in the `feature/credit-page-redesign` branch:

```
1. Shopkeeper records a credit sale (dubie) on CustomerDetail
2. AppShell.handleSaveCustomerTransaction persists the transaction
3. If customer.telegram_notify_enabled + telegram_chat_id + telegram_link_token:
   → buildCustomerLedgerTelegramMessage() builds the message
   → Sets telegram_delivery_state = 'bot_pending' (online) or 'bot_waiting_for_connection' (offline)
   → enqueueTelegramLedgerUpdate() queues the sync
4. Sync engine drains queue → sendTelegramLedgerUpdate() → POST /api/telegram/send-ledger-update
5. On failure → customer sees error in reminder history
6. Manual resend via CustomerReminderHistory → ReminderSheet → open channel deep link
```

**Test coverage needed:**
- [ ] Unit tests for `utils/reminders.js` (message templates, channel URLs)
- [ ] Unit tests for `utils/customerTelegram.js` (ledger messages, connect links)
- [ ] Unit tests for `api/reminders.js` (sendManualReminder, getHistory, getShopDefault)
- [ ] E2E test: credit recorded → Telegram notification enqueued → delivery state persisted
- [ ] E2E test: manual reminder flow (ReminderSheet → deep link → onSent callback)
