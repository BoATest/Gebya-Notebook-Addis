import { expect, test } from '@playwright/test';

test.describe('SettingsPage tab navigation persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.evaluate(async () => {
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
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });

      db.close();
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
  });

  test('navigates between Shop, Money, and Data tabs', async ({ page }) => {
    await page.locator('nav').getByRole('button', { name: /settings/i }).click();

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
    await page.locator('nav').getByRole('button', { name: /settings/i }).click();

    await page.getByRole('tab', { name: /money/i }).click();
    await page.getByRole('tab', { name: /data/i }).click();

    await expect(page.getByRole('tab', { name: /data/i })).toHaveAttribute('aria-selected', 'true');

    // Navigate away
    await page.locator('nav').getByRole('button', { name: /home/i }).click();
    await expect(page).toHaveURL(/\/$/);

    // Navigate back
    await page.locator('nav').getByRole('button', { name: /settings/i }).click();

    // Should return to Data tab, not Shop
    await expect(page.getByRole('tab', { name: /data/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('keyboard navigation works with arrow keys', async ({ page }) => {
    await page.locator('nav').getByRole('button', { name: /settings/i }).click();

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

  test('dev mode requires 5 taps within time window', async ({ page }) => {
    await page.locator('nav').getByRole('button', { name: /settings/i }).click();

    const versionText = page.getByText(/Gebya.*v/i);
    await expect(versionText).toBeVisible();

    // First tap should not show dev mode
    await versionText.click();
    await expect(page.locator('text=Shop Admin')).not.toBeVisible();

    // Should show tap count
    await expect(page.getByText(/more taps/i)).toBeVisible();
  });

  test('tab panels have matching aria-labelledby attributes', async ({ page }) => {
    await page.locator('nav').getByRole('button', { name: /settings/i }).click();

    const shopTab = page.getByRole('tab', { name: /shop/i });
    const shopPanel = page.getByRole('tabpanel');

    await expect(shopTab).toHaveAttribute('aria-controls', 'panel-shop');
    await expect(shopPanel).toHaveAttribute('id', 'panel-shop');
  });
});
