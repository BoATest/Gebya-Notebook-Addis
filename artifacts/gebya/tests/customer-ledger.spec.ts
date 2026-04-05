import { expect, test } from '@playwright/test';

test('customer ledger flow stays trustworthy after reload', async ({ page }) => {
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
      store.put({ key: 'shop_phone', value: '' });
      store.put({ key: 'shop_telegram', value: '' });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

    db.close();
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('nav').getByRole('button', { name: /dubie/i }).click();
  await expect(page.getByRole('button', { name: /add customer/i })).toBeVisible();
  await page.getByRole('button', { name: /add customer/i }).click();

  await page.getByPlaceholder(/name, nickname, relation, place, or vehicle clue/i).fill('Almaz');
  await page.getByRole('button', { name: /save customer/i }).click();

  await expect(page.getByText(/almaz/i)).toBeVisible();
  await expect(page.getByText(/current balance/i)).toBeVisible();
  await expect(page.getByText(/^0(?:\.00)? birr$/i)).toBeVisible();

  await page.getByRole('button', { name: /add dubie/i }).click();
  await page.getByPlaceholder('0').fill('250');
  await page.getByPlaceholder(/what they took/i).fill('Sugar');
  await page.getByRole('button', { name: /save dubie/i }).click();

  await expect(page.getByText(/^250(?:\.00)? birr$/i)).toBeVisible();
  await expect(page.getByText(/sugar/i)).toBeVisible();

  await page.getByRole('button', { name: /record payment/i }).click();
  await page.getByPlaceholder('0').fill('80');
  await page.getByPlaceholder(/any note about this payment/i).fill('Cash');
  await page.getByRole('button', { name: /save payment/i }).click();

  await expect(page.getByText(/^170(?:\.00)? birr$/i)).toBeVisible();
  await expect(page.getByText(/balance after this entry: 170(\.00)? birr/i)).toBeVisible();
  await expect(page.getByText(/balance after this entry: 250(\.00)? birr/i)).toBeVisible();

  await page.getByRole('button', { name: /back to customers/i }).click();
  await page.getByPlaceholder(/search customer or note/i).fill('Alm');
  await expect(page.getByRole('button', { name: /almaz/i })).toBeVisible();
  await page.getByRole('button', { name: /almaz/i }).click();

  await page.reload();
  await page.locator('nav').getByRole('button', { name: /dubie/i }).click();
  await page.getByPlaceholder(/search customer or note/i).fill('Alm');
  await page.getByRole('button', { name: /almaz/i }).click();
  await expect(page.getByText(/almaz/i)).toBeVisible();
  await expect(page.getByText(/^170(?:\.00)? birr$/i)).toBeVisible();
  await expect(page.getByText(/sugar/i)).toBeVisible();
  await expect(page.getByText(/cash/i)).toBeVisible();
});

