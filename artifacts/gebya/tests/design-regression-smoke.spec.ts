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
  await expect(page.getByText('Saved on this phone only.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Record a Sale' })).toBeVisible();
  await expect(page.locator('nav').getByRole('button', { name: 'Today' })).toBeVisible();
  await expect(page.locator('nav').getByRole('button', { name: 'Report' })).toBeVisible();
  await expect(page.locator('nav').getByRole('button', { name: 'More' })).toBeVisible();
  await attachScreenshot(page, testInfo, '02-owner-home');

  await page.locator('nav').getByRole('button', { name: 'More' }).click();
  // Current settings layout: tabbed (Shop / Money / Data) with accordion cards
  await expect(page.getByRole('button', { name: 'Shop', exact: true })).toBeVisible();
  await expect(page.getByText('Shop Profile')).toBeVisible();
  await expect(page.getByText('Items', { exact: true })).toBeVisible();
  await expect(page.getByText('Recurring Expenses', { exact: true })).toBeVisible();
  await expect(page.getByText('AUTO REMINDERS')).toBeVisible();
  await expect(page.getByText('PASSWORD LOGIN')).toBeVisible();
  await attachScreenshot(page, testInfo, '03-settings-more');

  // Team & Staff lives on the dedicated Staff tab (owner tab bar + join code)
  await page.locator('nav').getByRole('button', { name: 'Staff' }).click();
  await expect(page.getByRole('button', { name: 'Team', exact: true })).toBeVisible();
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
  // Empty shop renders the welcome/empty state
  await expect(page.getByText('Welcome to your shop')).toBeVisible();
  await expect(page.getByText('Record a sale or expense to get started.')).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: /Sale/ })).toBeVisible();
  await attachScreenshot(page, testInfo, '05-report');
});
