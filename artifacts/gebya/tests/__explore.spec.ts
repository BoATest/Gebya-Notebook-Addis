// __explore.spec.ts — one-off exploratory journey through the whole app.
// Records a sale, walks every tab, screenshots everything for review.
import { expect, test, type Page } from '@playwright/test';

async function resetFreshOrigin(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('gebya_lang', 'en');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }
    if ('caches' in window) {
      for (const key of await caches.keys()) await caches.delete(key);
    }
    await new Promise<void>((resolve) => {
      const req = window.indexedDB.deleteDatabase('GebyaDB');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
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
        shop_id: 'design-smoke-shop',
        shop_name: 'Exploration Shop',
        join_code: 'SAFE-UI12',
        join_url: 'http://127.0.0.1:4173/?join=SAFE-UI12',
        device_id: 'design-smoke-owner-device',
        device_token: 'design-smoke-owner-token',
        staff_id: 'design-smoke-owner-staff',
        display_name: 'Exploration Shop',
        role: 'owner',
        permissions: {},
        device_status: 'active',
        phone_required: false,
        approval_required: false,
      }),
    });
  });
  await page.route('**/api/shops/design-smoke-shop/staff', async (route) => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ staff: [] }) });
  });
}

const OUT = 'test-results/explore';

test('explore the full merchant journey', async ({ page }) => {
  test.setTimeout(120000);
  await mockIdentityRoutes(page);
  await resetFreshOrigin(page);
  await page.reload({ waitUntil: 'domcontentloaded' });

  // Onboarding
  await page.getByText('Shop Owner').click();
  await page.getByPlaceholder('Enter your name').fill('Exploration Shop');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Recording as')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: `${OUT}/e01-owner-home.png`, fullPage: true });

  // Open the Sale recorder
  await page.getByRole('button', { name: /Record a Sale/ }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/e02-sale-form.png`, fullPage: true });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Credit tab
  await page.locator('nav').getByRole('button', { name: 'Credit' }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/e03-credit.png`, fullPage: true });

  // Report tab
  await page.locator('nav').getByRole('button', { name: 'Report' }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/e04-report.png`, fullPage: true });

  // Staff tab
  await page.locator('nav').getByRole('button', { name: 'Staff' }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/e05-staff.png`, fullPage: true });

  // More tab
  await page.locator('nav').getByRole('button', { name: 'More' }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/e06-more.png`, fullPage: true });

  // Money tab inside settings
  await page.getByRole('button', { name: 'Money', exact: true }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/e07-more-money.png`, fullPage: true });

  // Data tab inside settings
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/e08-more-data.png`, fullPage: true });
});
