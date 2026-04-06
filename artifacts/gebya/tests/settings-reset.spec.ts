import { expect, test } from '@playwright/test';

test('settings allows optional phone and full reset returns to onboarding', async ({ page }) => {
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
      store.put({ key: 'shop_name', value: 'Tigist Shop' });
      store.put({ key: 'shop_phone', value: '' });
      store.put({ key: 'shop_telegram', value: '' });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

    db.close();
  });

  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.locator('nav').getByRole('button', { name: /settings/i }).click();
  await expect(page.getByText(/you can add your phone later in settings/i)).toBeVisible();

  const nameInput = page.getByPlaceholder(/e\.g\. tigist/i);
  await nameInput.fill('Tigist Shop Updated');
  await page.getByRole('button', { name: /save changes/i }).click();
  await expect(page.getByRole('button', { name: /saved!/i })).toBeVisible();

  await page.getByRole('button', { name: /your data/i }).click();
  const clearAllButton = page.getByRole('button', { name: /start over on this phone/i });
  await expect(clearAllButton).toBeVisible();
  await clearAllButton.click();
  await expect(page.getByText(/deletes 0 entries, 0 customer ledgers, your owner profile, and saved app setup on this phone/i)).toBeVisible();
  await page.getByRole('button', { name: /start over now/i }).click();

  await expect(page.getByText(/start your notebook/i)).toBeVisible();
  await expect(page.getByPlaceholder(/e\.g\. tigist/i)).toBeVisible();
});
