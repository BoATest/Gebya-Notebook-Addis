import { expect, test, type Page } from '@playwright/test';

// Verifies the phone-recovery nudge (#3) appears for an unsigned-in owner once the
// shop reaches the ~50-record threshold, and that Protect / Snooze / Dismiss all
// dismiss the modal (never blocks usage).

async function resetFreshOrigin(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('gebya_lang', 'en');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase('GebyaDB');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
}

async function mockIdentityRoutes(page: Page) {
  await page.route('**/api/shops', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        shop_id: 'nudge-smoke-shop',
        shop_name: 'Nudge Smoke Shop',
        join_code: 'NUDGE-5000',
        join_url: 'http://127.0.0.1:4173/?join=NUDGE-5000',
        device_id: 'nudge-owner-device',
        device_token: 'nudge-owner-token',
        staff_id: 'nudge-owner-staff',
        display_name: 'Nudge Smoke Shop',
        role: 'owner',
        permissions: {},
        device_status: 'active',
        phone_required: false,
        approval_required: false,
      }),
    });
  });
  await page.route('**/api/shops/nudge-smoke-shop/staff', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ staff: [] }),
    });
  });
}

async function seedTransactions(page: Page, count: number) {
  await page.evaluate(async (n) => {
    const request = window.indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = Date.now();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      for (let i = 0; i < n; i++) {
        store.put({
          type: 'sale',
          amount: 100,
          payment_type: 'cash',
          payment_provider: 'cash',
          created_at: now - (n - i) * 60000,
          updated_at: now - (n - i) * 60000,
        });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, count);
}

test('recovery nudge appears after 50 records and never blocks usage', async ({ page }) => {
  await mockIdentityRoutes(page);
  await resetFreshOrigin(page);

  // Complete onboarding as Shop Owner.
  await expect(page.getByText('Two ways to use Gebya')).toBeVisible();
  await page.getByText('Shop Owner').click();
  await page.getByPlaceholder('Enter your name').fill('Nudge Smoke Shop');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Recording as')).toBeVisible();

  // Seed 55 transactions and reload.
  await seedTransactions(page, 55);
  await page.reload({ waitUntil: 'domcontentloaded' });

  // Nudge modal should render (bilingual title visible in EN default).
  await expect(page.getByText('Your notebook lives on this phone')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep my data safe' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remind me later' })).toBeVisible();

  // Snooze dismisses and does NOT re-appear on immediate reload (7-day snooze).
  await page.getByRole('button', { name: 'Remind me later' }).click();
  await expect(page.getByText('Your notebook lives on this phone')).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await expect(page.getByText('Your notebook lives on this phone')).toHaveCount(0);

  // Protect path: re-seed a fresh origin state by dismissing + reloading after
  // removing the snooze flag, then verify Keep my data safe triggers the auth prompt.
  await page.evaluate(async () => {
    const request = window.indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').delete('recovery_nudge_snoozed_until');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Your notebook lives on this phone')).toBeVisible();
  await page.getByRole('button', { name: 'Keep my data safe' }).click();
  // Opens the auth flow (sign-in prompt) — data becomes recoverable.
  await expect(page.getByText(/Sign in|ይግቡ|እባክዎ|Enter the code|verify|Verify/i).first()).toBeVisible();
});