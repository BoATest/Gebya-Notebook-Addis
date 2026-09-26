import { expect, test } from '@playwright/test';

const OWNER_PERMISSIONS = {
  can_manage_team: true,
  can_delete_records: true,
  can_edit_settings: true,
  can_add_records: true,
  can_view_reports: true,
};

async function mockOwnerAuth(page) {
  await page.route('**/api/auth/refresh', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ token: 'test-owner-token' }),
  }));
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      user: {
        id: 'test-user',
        phone_number: '+251911234567',
        preferred_lang: 'en',
        created_at: new Date().toISOString(),
      },
      has_password: false,
      role: 'owner',
      permissions: OWNER_PERMISSIONS,
      businesses: [{
        business_id: 'shop-1',
        name: 'Test Shop',
        plan: 'free',
        role: 'owner',
        permissions: OWNER_PERMISSIONS,
      }],
      is_platform_admin: false,
    }),
  }));
}

test.describe('SettingsPage tab navigation persistence', () => {
  test.beforeEach(async ({ page }) => {
    await mockOwnerAuth(page);
    // This spec uses page.route() for API mocking. Chromium service workers
    // bypass page routes, so keep this fixture deterministic by preventing the
    // preview PWA from registering before the first navigation.
    await page.addInitScript(() => {
      Object.defineProperty(navigator.serviceWorker, 'register', {
        configurable: true,
        value: async () => ({ unregister: async () => true }),
      });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(async () => {
      localStorage.clear();
      // The app defaults to Amharic (LangContext) — the nav renders
      // 'ተጨማሪ' not 'More'. Pin English so role-name queries match.
      localStorage.setItem('gebya_lang', 'en');

      await new Promise<void>((resolve, reject) => {
        const request = window.indexedDB.deleteDatabase('GebyaDB');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
      });
    });

    await page.reload({ waitUntil: 'domcontentloaded' });

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
        store.put({ key: 'shop_name', value: 'Test Shop' });
        store.put({ key: 'shop_phone', value: '+251911234567' });
        store.put({ key: 'shop_category', value: 'grocery' });
        store.put({ key: 'shop_description', value: 'A test shop' });
        store.put({ key: 'gebya_auth_token', value: 'test-owner-token' });
        // Resolve the session as owner via the permissions cache — the store
        // hydrates this on cold boot. Without it the role falls back to
        // STAFF and role-gated surfaces (dev unlock) are inaccessible.
        store.put({
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
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });

      db.close();
    });


    await page.reload({ waitUntil: 'domcontentloaded' });

    // Open Settings so the role badge mounts, then wait for the owner badge.
    // The permissions store hydrates from IndexedDB asynchronously and the
    // auth flow re-confirms the role; without this wait the dev-unlock test can
    // click while the role still reads as STAFF (which makes the version tap a
    // no-op). Return to Today afterwards so each test keeps its original
    // starting state.
    await page.locator('nav').getByRole('button', { name: 'More' }).click();
    await expect(page.getByText('Owner', { exact: true })).toBeVisible();
    await page.locator('nav').getByRole('button', { name: 'Today' }).click();
  });

  test('navigates between Shop, Money, and Data tabs', async ({ page }) => {
    await page.locator('nav').getByRole('button', { name: 'More' }).click();

    const shopTab = page.getByRole('tab', { name: /shop/i });
    const moneyTab = page.getByRole('tab', { name: /money/i });
    const dataTab = page.getByRole('tab', { name: /data/i });

    await expect(shopTab).toHaveAttribute('aria-selected', 'true');

    await moneyTab.click();
    await expect(moneyTab).toHaveAttribute('aria-selected', 'true');
    await expect(shopTab).toHaveAttribute('aria-selected', 'false');

    await dataTab.click();
    await expect(dataTab).toHaveAttribute('aria-selected', 'true');
    await expect(moneyTab).toHaveAttribute('aria-selected', 'false');
  });

  test('tab state persists across navigation away and back', async ({ page }) => {
    await page.locator('nav').getByRole('button', { name: 'More' }).click();

    await page.getByRole('tab', { name: /money/i }).click();
    await page.getByRole('tab', { name: /data/i }).click();

    await expect(page.getByRole('tab', { name: /data/i })).toHaveAttribute('aria-selected', 'true');

    // Navigate away
    await page.locator('nav').getByRole('button', { name: 'Today' }).click();
    await expect(page).toHaveURL(/\/$/);

    // Navigate back
    await page.locator('nav').getByRole('button', { name: 'More' }).click();

    // Should return to Data tab, not Shop
    await expect(page.getByRole('tab', { name: /data/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('keyboard navigation works with arrow keys', async ({ page }) => {
    await page.locator('nav').getByRole('button', { name: 'More' }).click();

    const shopTab = page.getByRole('tab', { name: /shop/i });

    await shopTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /money/i })).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /data/i })).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('tab', { name: /money/i })).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: /data/i })).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Home');
    await expect(page.getByRole('tab', { name: /shop/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('notification preferences expose five group switches and save atomically', async ({ page }) => {
    const allTypes = [
      'sale',
      'credit',
      'payment',
      'payment_confirmed',
      'supplier_payment',
      'supplier_purchase',
      'expense',
      'staff_joined',
      'staff_submitted_collection',
      'rbac_violation',
      'overdue_alert',
      'device_approval',
      'announcement',
      'support_reply',
    ];
    const preferences = Object.fromEntries(
      allTypes.map((key) => [key, { inApp: true, push: true }]),
    );
    preferences.sale = { inApp: false, push: false };
    let getCount = 0;
    let putCount = 0;
    let putPayload: { preferences?: Record<string, { inApp: boolean; push: boolean }> } | null = null;

    await page.route('**/api/notifications/preferences', async (route) => {
      if (route.request().method() === 'PUT') {
        putCount += 1;
        putPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
        return;
      }
      getCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ preferences, quietHoursStart: null, quietHoursEnd: null }),
      });
    });

    await page.locator('nav').getByRole('button', { name: 'More' }).click();
    await page.getByRole('tab', { name: 'Data' }).click();
    await expect.poll(() => getCount).toBeGreaterThan(0);

    const groupNames = ['Money in', 'Credit–Dubie', 'Money out', 'Team', 'Gebya & support'];
    for (const name of groupNames) {
      await expect(page.getByRole('switch', { name: `${name} notifications` })).toBeVisible();
    }

    await expect(page.getByRole('switch', { name: 'Money in notifications' })).not.toBeChecked();

    const creditSwitch = page.getByRole('switch', { name: 'Credit–Dubie notifications' });
    await expect(creditSwitch).toBeChecked();
    await expect(creditSwitch).toBeDisabled();

    const securitySwitch = page.getByRole('switch', { name: 'Security alerts' });
    await expect(securitySwitch).toBeChecked();
    await expect(securitySwitch).toBeDisabled();

    const moneyInToggle = page.getByRole('button', { name: 'Money in' });
    await moneyInToggle.click();
    await expect(moneyInToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('region', { name: 'Money in' })).toBeHidden();
    await moneyInToggle.click();
    await expect(page.getByRole('region', { name: 'Money in' })).toBeVisible();

    const teamSwitch = page.getByRole('switch', { name: 'Team notifications' });
    await expect(teamSwitch).toBeChecked();
    await teamSwitch.click();
    await expect(teamSwitch).not.toBeChecked();

    await expect.poll(() => putPayload).not.toBeNull();
    await expect.poll(() => putCount).toBe(1);
    const saved = putPayload!.preferences!;
    for (const key of ['staff_joined', 'staff_submitted_collection', 'device_approval']) {
      expect(saved[key]).toEqual({ inApp: false, push: false });
    }
    expect(saved.sale).toEqual({ inApp: false, push: false });
    for (const key of ['payment', 'credit', 'overdue_alert', 'rbac_violation']) {
      expect(saved[key]).toEqual({ inApp: true, push: true });
    }
  });

  test('notification preferences do not render defaults after a failed load and retry hydrates', async ({ page }) => {
    let getCount = 0;
    await page.route('**/api/notifications/preferences', async (route) => {
      getCount += 1;
      if (getCount === 1) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preferences: {
            sale: { inApp: false, push: false },
            credit: { inApp: true, push: true },
            overdue_alert: { inApp: true, push: true },
            rbac_violation: { inApp: true, push: true },
          },
          quietHoursStart: null,
          quietHoursEnd: null,
        }),
      });
    });

    await page.locator('nav').getByRole('button', { name: 'More' }).click();
    await page.getByRole('tab', { name: 'Data' }).click();
    await expect(page.getByRole('alert')).toContainText('Could not load notification preferences.');
    await expect(page.getByRole('switch', { name: 'Money in notifications' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Try again' }).click();
    await expect.poll(() => getCount).toBe(2);
    await expect(page.getByRole('switch', { name: 'Money in notifications' })).not.toBeChecked();
  });


  test('dev mode requires 5 taps within time window', async ({ page }) => {
    await page.locator('nav').getByRole('button', { name: 'More' }).click();

    const versionText = page.getByText(/Gebya · v/);
    await expect(versionText).toBeVisible();

    // One tap only starts the unlock counter — dev mode is not unlocked yet,
    // and no unlock toast appears.
    await versionText.click();
    await expect(page.getByText(/more taps/i)).toBeVisible();
    await expect(page.getByText(/dev mode unlocked/i)).not.toBeVisible();
  });

  test('tab panels have matching aria-labelledby attributes', async ({ page }) => {
    await page.locator('nav').getByRole('button', { name: 'More' }).click();

    const shopTab = page.getByRole('tab', { name: /shop/i });
    const shopPanel = page.getByRole('tabpanel');

    await expect(shopTab).toHaveAttribute('aria-controls', 'panel-shop');
    await expect(shopPanel).toHaveAttribute('id', 'panel-shop');
  });
});
