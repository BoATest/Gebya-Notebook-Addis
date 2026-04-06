import { expect, test } from '@playwright/test';

test('telegram connect sheet avoids automatic API chatter on slow connection', async ({ page }) => {
  let telegramRequestCount = 0;

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: {
        effectiveType: '3g',
        saveData: false,
      },
    });
  });

  await page.route('**/api/telegram/**', async (route) => {
    telegramRequestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        configured: true,
        bot_username: 'gebya_bot',
      }),
    });
  });

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
      const settingsTx = db.transaction('settings', 'readwrite');
      const settingsStore = settingsTx.objectStore('settings');
      settingsStore.put({ key: 'intro_seen', value: 'yes' });
      settingsStore.put({ key: 'shop_name', value: 'Tigist Shop' });
      settingsStore.put({ key: 'shop_phone', value: '' });
      settingsStore.put({ key: 'shop_telegram', value: '' });
      settingsTx.oncomplete = () => resolve();
      settingsTx.onerror = () => reject(settingsTx.error);
      settingsTx.onabort = () => reject(settingsTx.error);
    });

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['customers', 'customer_transactions'], 'readwrite');
      tx.objectStore('customers').add({
        display_name: 'Almaz',
        note: '',
        phone_number: '',
        telegram_username: null,
        telegram_chat_id: null,
        telegram_notify_enabled: false,
        telegram_link_token: 'cust-1-slow-test',
        telegram_linked_at: null,
        telegram_link_requested_at: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    db.close();
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('nav').getByRole('button', { name: /dubie/i }).click();
  await page.getByRole('button', { name: /almaz/i }).click();
  await page.getByRole('button', { name: /connect telegram/i }).click();

  await expect(page.getByText(/slow connection detected/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /open link/i })).toBeVisible();

  await page.waitForTimeout(1000);
  expect(telegramRequestCount).toBe(0);
});
