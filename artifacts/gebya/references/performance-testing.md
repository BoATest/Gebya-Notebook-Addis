# Performance Testing

> Adapted for the Gebya web PWA. The generic "Mobile App Testing" template
> mentions Android Espresso profiler and iOS Instruments — for a PWA we use
> Chrome DevTools Protocol (via Playwright tracing + Lighthouse) and browser
> DevTools CPU/memory profiling.

## Table of Contents

- [When to Use](#when-to-use)
- [Tools](#tools)
- [Measuring Startup Performance](#measuring-startup-performance)
- [Measuring Runtime Performance](#measuring-runtime-performance)
- [Measuring Offline Resilience](#measuring-offline-resilience)
- [CI Integration](#ci-integration)

## When to Use

- Before a release with new heavy components (e.g. the Credit tab with many
  customers)
- After adding new API calls or IndexedDB operations
- When users report jank or slowness on low-end devices
- When auditing bundle size or PWA installability

## Tools

| Tool | Use case |
|---|---|
| `lighthouse` CLI | Audit Lighthouse scores (FCP, LCP, TTI, bundle) |
| `@playwright/test` tracing | Capture network, CPU, memory, console |
| Chrome DevTools (manual) | Deep CPU/memory profiling |
| `chrome-web-vitals` npm | Capture Core Web Vitals in production |

## Measuring Startup Performance

```bash
# Audit the served build
npx lighthouse http://127.0.0.1:4173 --output=json --output-path=./lh-report.json
```

Playwright can capture a trace with timing:

```ts
import { test, devices } from '@playwright/test';

test('credit tab loads quickly', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const metrics = await page.metrics();
  // Assert on task duration, JS heap size, etc.
});
```

## Measuring Runtime Performance

Use Playwright's tracing to capture a full user flow:

```ts
test('recording a credit transaction is jank-free', async ({ page }) => {
  test.setTimeout(30000);
  await page.tracing.start({ screenshots: true, snapshots: true });

  // Seed + navigate + interact
  await page.goto('/');
  await page.getByRole('button', { name: /credit/i }).click();
  // ... record a credit transaction ...

  await page.tracing.stop({ path: 'credit-flow-trace.zip' });
});
```

Open the trace:

```bash
npx playwright show-trace credit-flow-trace.zip
```

### Synthetic perf assertions

```ts
// Assert the transaction input responds in < 200ms
await page.getByPlaceholder('0').fill('100');
const t1 = Date.now();
await page.getByRole('button', { name: /save/i }).click();
await expect(page.locator('toast')).toHaveText(/saved/i);
const elapsed = Date.now() - t1;
expect(elapsed).toBeLessThan(200);
```

## Measuring Offline Resilience

Since Gebya is a PWA with IndexedDB storage, test:

1. **Offline data persistence** — Record a transaction while offline, then go
   online and verify the sync queue fires `enqueueTelegramLedgerUpdate`.
2. **PWA install prompt** — Verify `beforeinstallprompt` fires in E2E.
3. **Service worker** — Verify cached assets and offline shell load in < 1s.

```ts
test('app works offline after first load', async ({ page }) => {
  await page.goto('/');
  // Wait for service worker to register
  await page.evaluate(() => navigator.serviceWorker?.ready);
  // Go offline
  await page.context().setOffline(true);
  // Navigate again — should serve from cache
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByText(/gebya/i)).toBeVisible();
});
```

## CI Integration

Add a performance gate to CI using the isolated test runner:

```yml
# .github/workflows/performance.yml
- name: Run performance E2E
  run: pnpm test:design-smoke
  # or a dedicated perf spec:
  # pnpm build && node scripts/run-playwright-isolated.mjs 4190 tests/perf-credit-flow.spec.ts
```

## Best Practices

- ✅ Measure on a simulated 4G / 3G connection (`page.context().route`)
- ✅ Assert on LCP / FID, not just "page loaded"
- ✅ Track bundle size over time — flag deltas > 10%
- ✅ Use `page.on('console', ...)` to catch slow-render warnings
- ❌ Don't rely on wall-clock time in CI (flaky) — use Playwright tracing metrics instead