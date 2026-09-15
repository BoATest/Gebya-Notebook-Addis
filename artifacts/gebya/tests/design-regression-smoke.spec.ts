import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function resetFreshOrigin(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('gebya_lang', 'en');

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }

    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase('GebyaDB');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
}

// Seed the permissions cache as owner AFTER the app has created its IndexedDB
// (onboarding itself doesn't resolve a role without a backend — the store
// hydrates cached_permissions on cold boot). Then reload so the store picks
// it up before any role-gated surface renders.
async function seedOwnerRole(page: Page) {
  await page.evaluate(async () => {
    const request = window.indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({
        key: 'cached_permissions',
        value: {
          permissions: {
            can_manage_team: true,
            can_delete_records: true,
            can_edit_settings: true,
            can_add_records: true,
            can_view_reports: true,
          },
          role: 'owner',
          cached_at: Date.now(),
        },
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
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
        shop_name: 'Design Smoke Shop',
        join_code: 'SAFE-UI12',
        join_url: 'http://127.0.0.1:4173/?join=SAFE-UI12',
        device_id: 'design-smoke-owner-device',
        device_token: 'design-smoke-owner-token',
        staff_id: 'design-smoke-owner-staff',
        display_name: 'Design Smoke Shop',
        role: 'owner',
        permissions: {},
        device_status: 'active',
        phone_required: false,
        approval_required: false,
      }),
    });
  });

  await page.route('**/api/shops/design-smoke-shop/staff', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ staff: [] }),
    });
  });
}

test('design regression smoke protects core merchant surfaces', async ({ page }, testInfo) => {
  await mockIdentityRoutes(page);
  await resetFreshOrigin(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await seedOwnerRole(page);

  await expect(page.getByText('Gebya').first()).toBeVisible();
  await expect(page.locator('img[alt="Gebya"]')).toBeVisible();
  // Current onboarding copy (Two ways / Select Account Type)
  await expect(page.getByText('Two ways to use Gebya')).toBeVisible();
  await expect(page.getByText('Shop Owner')).toBeVisible();
  await expect(page.getByText('Join a Shop')).toBeVisible();
  await expect(page.getByText('All data stays on your phone · Not connected with your bank · Free')).toBeVisible();
  await attachScreenshot(page, testInfo, '01-onboarding');

  await page.getByText('Shop Owner').click();
  await page.getByPlaceholder('Enter your name').fill('Design Smoke Shop');
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  await expect(page.getByText('Recording as')).toBeVisible();
  await expect(page.getByText('Design Smoke Shop').first()).toBeVisible();
  await expect(page.getByText(/TODAY\s+.*NET/i)).toBeVisible();
  // The scoreboard renders in compact one-line form (SaleWorkspace v1);
  // expand it to reach the trust line it now hides by default.
  await page.getByRole('button', { name: 'Show details' }).click();
  await expect(page.getByText('Saved on this phone only.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Record a Sale' })).toBeVisible();
  await expect(page.locator('nav').getByRole('button', { name: 'Today' })).toBeVisible();
  await expect(page.locator('nav').getByRole('button', { name: 'Report' })).toBeVisible();
  await expect(page.locator('nav').getByRole('button', { name: 'More' })).toBeVisible();
  await attachScreenshot(page, testInfo, '02-owner-home');

  await page.locator('nav').getByRole('button', { name: 'More' }).click();
  // Current settings layout: tabbed (Shop / Money / Data) with accordion cards
  // Settings tabs are real ARIA tabs (role="tab"), not plain buttons.
  await expect(page.getByRole('tab', { name: 'Shop' })).toBeVisible();
  await expect(page.getByText('Shop Profile')).toBeVisible();
  await expect(page.getByText('Items', { exact: true })).toBeVisible();
  await expect(page.getByText('Recurring Expenses', { exact: true })).toBeVisible();
  await attachScreenshot(page, testInfo, '03-settings-more');

  // R1 dedupe: reminder / notification / password panels are rendered ONCE,
  // at the top of the Data tab (no longer outside the tab panels).
  await page.getByRole('tab', { name: 'Data', exact: true }).click();
  await expect(page.getByText('AUTO REMINDERS')).toBeVisible();
  await expect(page.getByText('NOTIFICATION PREFERENCES')).toBeVisible();
  await expect(page.getByText('PASSWORD LOGIN')).toBeVisible();

  // Team & Staff lives on the dedicated Staff tab (owner tab bar + join code).
  // 'Team' is an ARIA tab in the staff surface, not a plain button.
  await page.locator('nav').getByRole('button', { name: 'Staff' }).click();
  await expect(page.getByRole('tab', { name: 'Team' })).toBeVisible();
  await expect(page.getByText('Join code')).toBeVisible();
  await expect(page.getByText('SAFE-UI12')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset code' })).toBeVisible();
  await expect(page.getByText('Add Staff')).toBeVisible();
  await attachScreenshot(page, testInfo, '04-staff-team');

  await page.locator('nav').getByRole('button', { name: 'Report' }).click();
  await expect(page.getByRole('heading', { name: /Notebook/ })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: '🌅 Today' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: '📅 Week' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: '🗓 Month' })).toBeVisible();
  // Empty shop renders the welcome/empty state (current ReportView copy)
  await expect(page.getByText('Welcome to your shop')).toBeVisible();
  await expect(page.getByText('Record your first sale today — your shop summary appears here instantly.')).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: /Sale/ })).toBeVisible();
  await attachScreenshot(page, testInfo, '05-report');
});
