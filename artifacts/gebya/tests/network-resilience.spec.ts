import { expect, test, type Page } from '@playwright/test';

async function seedShopProfile(page: Page, shopName = 'Tigist Shop') {
  await page.evaluate(async (name) => {
    const request = window.indexedDB.open('GebyaDB');

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('settings', 'readwrite');
      const store = transaction.objectStore('settings');
      store.put({ key: 'intro_seen', value: 'yes' });
      store.put({ key: 'shop_name', value: name });
      store.put({ key: 'shop_phone', value: '' });
      store.put({ key: 'shop_telegram', value: '' });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

    db.close();
  }, shopName);
}

test('core notebook actions still work while offline', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await seedShopProfile(page);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    window.dispatchEvent(new Event('offline'));
  });

  await page.getByRole('button', { name: /type sale/i }).click();
  await page.getByPlaceholder(/e\.g\./i).fill('Offline sale');
  await page.getByPlaceholder('0').fill('120');
  await page.getByRole('button', { name: /save sale/i }).click();

  await expect(page.getByText(/offline sale/i)).toBeVisible();
  await expect(page.getByText(/120(?:\.00)? birr/i).first()).toBeVisible();

  await context.close();
});

test('slow-network guidance shows before voice and telegram flows', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await seedShopProfile(page);
  await page.evaluate(() => {
    window.localStorage.setItem('gebya_test_connection', JSON.stringify({
      effectiveType: '2g',
      saveData: false,
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.getByText(/voice may take longer/i)).toBeVisible();

  await page.locator('nav').getByRole('button', { name: /dubie/i }).click();
  await page.getByRole('button', { name: /add customer/i }).click();
  await page.getByPlaceholder(/name, nickname, relation, place, or vehicle clue/i).fill('Slow Network Buyer');
  await page.getByRole('button', { name: /more \(optional\)/i }).click();
  await page.getByPlaceholder(/@username, t\.me/i).fill('@slowbuyer');
  await page.getByRole('button', { name: /save customer/i }).click();

  await expect(page.getByText(/slow network buyer/i)).toBeVisible();
  await expect(page.getByText(/use refresh after the borrower opens telegram/i)).toBeVisible();

  await context.close();
});
