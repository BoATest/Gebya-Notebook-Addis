# Testing with Vitest & Playwright

> **Stack note:** Gebya is a React + Vite **web PWA** (not React Native). Unit tests
> use **Vitest**; end-to-end tests use **Playwright**. This guide replaces the
> generic "Jest & Detox" template — the same testing principles apply, adapted to
> the actual toolchain.

## Table of Contents

- [When to Use](#when-to-use)
- [Project Setup](#project-setup)
- [Unit Testing with Vitest](#unit-testing-with-vitest)
- [End-to-End Testing with Playwright](#end-to-end-testing-with-playwright)
- [Best Practices](#best-practices)

## When to Use

| Scenario | Tool | File pattern |
|---|---|---|
| Pure business logic (formatters, selectors, message builders) | Vitest | `tests/*.test.mjs` |
| Store logic (Zustand, permissions, sync state) | Vitest | `tests/*.spec.ts` |
| Full user flow across the PWA UI | Playwright | `tests/*.spec.ts` |
| Component rendering in isolation | Playwright (component mode) or Vitest + React Testing Library | — |

## Project Setup

### Vitest

Already configured in `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@workspace/db': path.resolve(__dirname, '../lib/db/src'),
    },
  },
  test: {
    include: ['tests/**/*.spec.ts', 'tests/**/*.test.mjs'],
    environment: 'node',
  },
});
```

Install (already in `devDependencies`):

```bash
pnpm add -D vitest fake-indexeddb
```

### Playwright

Configured in `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `pnpm serve -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.GEBYA_PLAYWRIGHT_ISOLATED,
    timeout: 120000,
    cwd: configDir,
  },
});
```

Install:

```bash
pnpm add -D @playwright/test
npx playwright install --with-deps chromium
```

## Unit Testing with Vitest

### Minimal working example

```js
/**
 * @vitest-environment node
 */
import 'fake-indexeddb/auto';
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
    expect(message).toContain('Tigist Shop');
  });
});
```

### Mocking external dependencies

Mock external modules before importing the module under test:

```js
import { describe, it, expect, vi } from 'vitest';

const { mockFetch, mockDb } = vi.hoisted(() => ({
  mockDb: { settings: { get: vi.fn(), put: vi.fn() } },
  mockFetch: vi.fn(),
}));

vi.mock('../src/db', () => ({ default: mockDb, db: mockDb }));
```

### Running

```bash
pnpm vitest run tests/reminders.test.mjs  # single file
pnpm vitest run                          # all unit tests
pnpm vitest                              # watch mode
```

## End-to-End Testing with Playwright

### Seeding IndexedDB before each test

Tests seed the app's Dexie IndexedDB (`GebyaDB`) directly from the browser
context:

```ts
async function seedSettings(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const request = indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key: 'intro_seen', value: 'yes' });
      store.put({ key: 'shop_name', value: 'Test Shop' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
}
```

### Mocking API endpoints

```ts
await page.route('**/api/telegram/**', async (route) => {
  const body = JSON.parse(route.request().postData() || '{}');
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true }),
  });
});
```

### Asserting on IndexedDB state after interaction

```ts
const customer = await page.evaluate(async () => {
  const request = window.indexedDB.open('GebyaDB');
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const result = await new Promise<any>((resolve, reject) => {
    const tx = db.transaction('customers', 'readonly');
    const req = tx.objectStore('customers').get('cust-1');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
});
expect(customer.telegram_notify_enabled).toBe(true);
```

### Running

```bash
pnpm test:e2e                              # start server + run all E2E
pnpm test:e2e -- credit-telegram-notification.spec.ts  # single spec
pnpm playwright show-trace credit-flow-trace.zip       # inspect a trace
```

## Best Practices

- ✅ Mock external APIs and IndexedDB in unit tests; seed real data in E2E tests
- ✅ Keep tests isolated — `beforeEach` should reset mocks with `vi.clearAllMocks()`
- ✅ Use `fake-indexeddb/auto` in unit tests that touch IndexedDB
- ✅ Mock `fetch` with `vi.fn()` and assert on `mockFetch.mock.calls`
- ✅ For clipboard/DOM APIs not in Node env, use `Object.defineProperty(globalThis, ...)`
- ✅ Assert on the **outcome** (IndexedDB state, API call payloads), not implementation details
- ✅ Run E2E tests in CI on every push to `main` and release branches
- ❌ Don't test implementation details — test behavior through the public API
- ❌ Don't make tests interdependent — each test should be independently runnable

