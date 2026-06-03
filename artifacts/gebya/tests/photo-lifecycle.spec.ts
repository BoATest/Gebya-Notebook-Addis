import { expect, test } from '@playwright/test';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
);

const photoFile = {
  name: 'proof.png',
  mimeType: 'image/png',
  buffer: tinyPng,
};

async function startEnglishShop(page) {
  await page.addInitScript(() => localStorage.setItem('gebya_lang', 'en'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const request = window.indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key: 'shop_name', value: 'Photo Proof Shop' });
      tx.objectStore('settings').put({ key: 'shop_phone', value: '' });
      tx.objectStore('settings').put({ key: 'shop_business_type', value: 'retail-shop' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/photo proof shop/i)).toBeVisible();
}

async function seedEnglishShopWithCustomer(page, customerName = 'Photo Customer') {
  await page.addInitScript(() => localStorage.setItem('gebya_lang', 'en'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async (name) => {
    const request = window.indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['settings', 'customers'], 'readwrite');
      tx.objectStore('settings').put({ key: 'shop_name', value: 'Photo Proof Shop' });
      tx.objectStore('settings').put({ key: 'shop_phone', value: '' });
      tx.objectStore('settings').put({ key: 'shop_business_type', value: 'retail-shop' });
      tx.objectStore('customers').add({
        display_name: name,
        phone_number: '',
        note: '',
        telegram_username: '',
        telegram_chat_id: null,
        telegram_notify_enabled: false,
        telegram_link_token: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, customerName);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/photo proof shop/i)).toBeVisible();
}

async function uploadTransactionPhoto(page) {
  await page.locator('input[type="file"][capture="environment"]').setInputFiles(photoFile);
  await expect(page.getByText(/photo attached/i)).toBeVisible();
}

async function clickBottomAction(page, label: RegExp) {
  await page.locator('button').filter({ hasText: label }).last().click();
}

test('sale photo is previewed, saved, visible on Today and History, and opens full viewer after reload', async ({ page }) => {
  await startEnglishShop(page);

  await clickBottomAction(page, /^Sale$/i);
  await page.getByPlaceholder(/add details/i).fill('Photo audit sale');
  await page.getByPlaceholder('0').first().fill('123');
  await uploadTransactionPhoto(page);
  await page.getByRole('button', { name: /save sale/i }).click();

  await expect(page.getByText(/photo audit sale/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /view transaction photo/i })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/photo audit sale/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /view transaction photo/i })).toBeVisible();

  await page.getByRole('button', { name: /view transaction photo/i }).click();
  await expect(page.getByRole('dialog', { name: /view transaction photo/i })).toBeVisible();
  await page.getByRole('button', { name: /close/i }).click();

  await page.locator('nav').getByRole('button', { name: /report/i }).click();
  await expect(page.getByRole('button', { name: /view transaction photo/i })).toBeVisible();
});

test('expense photo stays transaction-level and remains visible after reload', async ({ page }) => {
  await startEnglishShop(page);

  await clickBottomAction(page, /^Expense$/i);
  await page.getByPlaceholder(/add details/i).fill('Photo audit expense');
  await page.getByPlaceholder('0').first().fill('45');
  await uploadTransactionPhoto(page);
  await page.getByRole('button', { name: /save expense/i }).click();

  await expect(page.getByText(/photo audit expense/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /view transaction photo/i })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/photo audit expense/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /view transaction photo/i })).toBeVisible();
});

test('pay later sale copies transaction photo into the generated customer Dubie row', async ({ page }) => {
  await seedEnglishShopWithCustomer(page);

  await clickBottomAction(page, /^Sale$/i);
  await page.getByPlaceholder(/add details/i).fill('Photo pay later sale');
  await page.getByPlaceholder('0').first().fill('300');
  await uploadTransactionPhoto(page);
  await page.getByRole('button', { name: /later/i }).click();
  await page.getByRole('button', { name: /photo customer/i }).click();
  await page.getByRole('button', { name: /save sale/i }).click();

  await expect(page.getByText(/photo pay later sale/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /view transaction photo/i })).toBeVisible();

  await page.locator('nav').getByRole('button', { name: /credit/i }).click();
  await page.getByRole('button', { name: /photo customer/i }).click();
  await expect(page.getByText(/photo pay later sale/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /view item photo/i })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('nav').getByRole('button', { name: /credit/i }).click();
  await page.getByRole('button', { name: /photo customer/i }).click();
  await expect(page.getByRole('button', { name: /view item photo/i })).toBeVisible();
});

test('direct Dubie photo remains visible after reload and payment rows stay photo-free', async ({ page }) => {
  await seedEnglishShopWithCustomer(page);

  await page.locator('nav').getByRole('button', { name: /credit/i }).click();
  await page.getByRole('button', { name: /photo customer/i }).click();
  await page.locator('main').getByRole('button', { name: /^credit$/i }).click();
  await page.getByPlaceholder('0').first().fill('250');
  await page.getByPlaceholder(/what they took/i).fill('Direct photo dubie');
  await page.getByRole('button', { name: /item photo/i }).click();
  await page.locator('input[type="file"][accept="image/*"]').last().setInputFiles(photoFile);
  await expect(page.getByText(/item photo attached/i)).toBeVisible();
  await page.getByRole('button', { name: /save credit/i }).click();

  await expect(page.getByText(/direct photo dubie/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /view item photo/i })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('nav').getByRole('button', { name: /credit/i }).click();
  await page.getByRole('button', { name: /photo customer/i }).click();
  await expect(page.getByRole('button', { name: /view item photo/i })).toBeVisible();

  await page.getByRole('button', { name: /payment/i }).click();
  await page.getByPlaceholder('0').first().fill('50');
  await page.getByRole('button', { name: /save payment/i }).click();
  await expect(page.getByRole('button', { name: /view item photo/i })).toHaveCount(1);
});
