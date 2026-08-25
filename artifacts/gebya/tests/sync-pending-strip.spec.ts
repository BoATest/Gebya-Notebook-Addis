import { expect, test } from '@playwright/test';

// End-to-end QA for the "Pending sync" lifecycle against a production build:
//   offline save -> record kept locally -> reconnect -> outbox drains -> strip clears.
//
// Strategy notes:
// - /api/auth/me is mocked from the start so the seeded token survives boot.
// - All navigation happens ONLINE first (views are lazy-loaded chunks; loading
//   them offline would fail). Only the actual WRITE happens offline.
// - Sync endpoints are mocked only during the ONLINE phase, so the offline
//   write exercises a genuine network failure.

const ME_PAYLOAD = {
  ok: true,
  user: { id: 1, phone_number: '+251911000000', display_name: 'Tigist' },
  role: 'owner',
  permissions: {},
  businesses: [{ business_id: 1, name: 'Tigist Shop', role: 'owner' }],
  has_password: false,
  is_platform_admin: false,
};

test('offline save shows pending state and clears after reconnect', async ({ page, context }) => {
  // Mobile viewport: the bottom `nav` with the Credit tab is the primary
  // (mobile-first) navigation surface this flow targets.
  await page.setViewportSize({ width: 390, height: 844 });

  // Block only the SW script: once registered it intercepts fetches before
  // Playwright's route mocks, making boot nondeterministic. Do NOT block
  // workbox-*.js chunks — that pattern also matches the workbox-window
  // library bundle the app itself loads.
  await context.route('**/sw.js', (route) => route.abort());

  await page.addInitScript(() => {
    window.localStorage.setItem('gebya_lang', 'en');
  });

  // Boot-time auth validation — keeps the seeded token alive.
  await page.route('**/api/auth/me*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ME_PAYLOAD) })
  );

  // First load creates GebyaDB, then we seed settings including an auth token
  // so the sync engine is signed-in (otherwise the strip says "Sign in to sync").
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const request = window.indexedDB.open('GebyaDB');

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('settings', 'readwrite');
      const store = transaction.objectStore('settings');
      store.put({ key: 'intro_seen', value: 'yes' });
      store.put({ key: 'shop_name', value: 'Tigist Shop' });
      store.put({ key: 'gebya_auth_token', value: 'e2e-test-token' });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

    db.close();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  // Wait until the app actually mounted (chunks downloaded, shell rendered)
  // BEFORE proceeding — networkidle never fires because the SW (blocked) and
  // analytics keep connections warm.
  await page.waitForFunction(() => document.body.innerText.length > 100, { timeout: 20_000 });

  // ── Online phase: create the customer and open the dubie sheet ──
  // (lazy-loaded view chunks must be fetched while online)
  await page.locator('nav').getByRole('button', { name: /credit/i }).click();
  await page.getByRole('button', { name: /add (your first )?customer/i }).click();
  await page.getByPlaceholder(/e\.g\. tigist/i).fill('Almaz');
  await page.getByRole('button', { name: /save customer/i }).click();
  await expect(page.getByText('Almaz', { exact: true }).first()).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: /you gave/i }).click();
  await expect(page.getByPlaceholder('0')).toBeVisible({ timeout: 10_000 });

  // ── Offline phase: the actual write happens with no network ──
  await context.setOffline(true);

  await page.getByPlaceholder('0').fill('250');
  await page.getByPlaceholder(/what they took/i).fill('Sugar');
  await page.getByRole('button', { name: /save (credit|dubie)/i }).click();

  // The credit is saved locally: balance and history update immediately.
  await expect(page.getByText(/250\.00/).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/sugar/i).first()).toBeVisible();

  // While offline the sync attempt fails for real; the strip must show a
  // blocked state ("Sync failed" or "Offline"), never "Pending sync" as if
  // the cloud were reachable.
  await expect(
    page.locator('[aria-live="polite"]').filter({ hasText: /sync failed|offline/i })
  ).toBeVisible({ timeout: 10_000 });

  // ── Online phase 2: mock the API, reconnect, watch the strip drain ──
  await page.route('**/api/sync/push*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, business_id: 1 }),
    })
  );
  await page.route('**/api/sync/pull*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        tables: {},
        hasMore: false,
        pulled_at: Date.now(),
      }),
    })
  );
  // Blanket-fallback for background calls (notifications, analytics, …) so
  // nothing else flips the engine into an error/unauthenticated state.
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    if (/\/sync\/(push|pull)/.test(url)) return route.fallback();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  await context.setOffline(false);

  // The engine syncs on the `online` event; once the push acks, the outbox
  // drains and every sync strip ("Pending sync" / "Sync failed" / "Offline")
  // disappears.
  await expect(
    page.locator('[aria-live="polite"]').filter({ hasText: /pending sync|sync failed|offline/i })
  ).toBeHidden({ timeout: 15_000 });

  // Record survived the round trip: the customers list shows Almaz with the
  // synced balance (no search needed — single customer).
  await page.locator('nav').getByRole('button', { name: /credit/i }).click();
  await expect(page.getByText('Almaz').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/250\.00/).first()).toBeVisible();
});
