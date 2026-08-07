import { expect, test } from '@playwright/test';

async function seedSettings(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const request = indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key: 'intro_seen', value: 'yes' });
      store.put({ key: 'shop_name', value: 'Test Shop' });
      store.put({ key: 'shop_phone', value: '' });
      store.put({ key: 'shop_telegram', value: '' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
}

async function seedCustomer(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const request = indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = Date.now();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['customers', 'customer_transactions'], 'readwrite');
      const customerStore = tx.objectStore('customers');
      const txStore = tx.objectStore('customer_transactions');
      customerStore.put({
        id: 'cust-promise-test',
        display_name: 'Promise Test',
        phone_number: '+251911000001',
        balance: 500,
        has_overdue: false,
        overdue_days: 0,
        transaction_count: 1,
        on_time_eligible: 0,
        on_time_count: 0,
        avg_pay_days: 0,
        latest_due_date: null,
        promised_pay_date: null,
        promise_note: null,
        telegram_username: null,
        telegram_chat_id: null,
        telegram_link_token: null,
        telegram_linked_at: null,
        telegram_link_requested_at: null,
        telegram_notify_enabled: false,
        archived_at: null,
        created_at: now - 86400000,
        updated_at: now - 86400000,
        photo_data: null,
        photo_caption: null,
      });
      txStore.put({
        id: 'tx-promise-1',
        customer_id: 'cust-promise-test',
        type: 'credit_add',
        amount: 500,
        item_note: 'Sugar',
        payment_method: 'cash',
        created_at: now - 86400000,
        updated_at: now - 86400000,
        reference_code: 'REF-001',
        telegram_delivery_state: null,
        telegram_delivery_attempted_at: null,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
}

async function getCustomerField(page: import('@playwright/test').Page, field: string): Promise<unknown> {
  return page.evaluate(async (f: string) => {
    const request = indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction('customers', 'readonly');
      const store = tx.objectStore('customers');
      const req = store.get('cust-promise-test');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result?.[f] ?? null;
  }, field);
}

async function clickPromiseButton(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent?.includes('Record Promise'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(300);
}

const NOTE_INPUT = 'input.promise-input[type="text"]';

test.describe('Promise Recording — full flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gebya_lang', 'en');
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await seedSettings(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await seedCustomer(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('nav').getByRole('button', { name: /credit/i }).click();
    await page.getByRole('button', { name: /promise test/i }).click();
    await expect(page.getByText('Promise Test', { exact: true }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /record promise/i }).first()).toBeVisible();
  });

  test('shows Record Promise button when no promise exists', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /record promise/i }).first()).toBeVisible();
  });

  test('opens promise form with date and note inputs', async ({ page }) => {
    await clickPromiseButton(page);
    await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(NOTE_INPUT)).toBeVisible();
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i }).first()).toBeVisible();
  });

  test('saves promise and persists to IndexedDB', async ({ page }) => {
    await clickPromiseButton(page);
    await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 5000 });

    const futureDate = new Date(Date.now() + 7 * 86400000);
    const dateStr = futureDate.toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(dateStr);
    await page.locator(NOTE_INPUT).fill('Will pay next week');
    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(page.locator('input[type="date"]')).not.toBeVisible();

    const promisedDate = await getCustomerField(page, 'promised_pay_date');
    expect(promisedDate).not.toBeNull();
    expect(typeof promisedDate).toBe('number');
    const promiseNote = await getCustomerField(page, 'promise_note');
    expect(promiseNote).toBe('Will pay next week');
  });

  test('displays promise info after saving', async ({ page }) => {
    await clickPromiseButton(page);
    await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 5000 });

    const futureDate = new Date(Date.now() + 7 * 86400000);
    const dateStr = futureDate.toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(dateStr);
    await page.locator(NOTE_INPUT).fill('Test promise');
    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(page.getByText(/promised to pay/i)).toBeVisible();
  });

  test('clear promise resets fields to null', async ({ page }) => {
    await clickPromiseButton(page);
    await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 5000 });

    const futureDate = new Date(Date.now() + 7 * 86400000);
    const dateStr = futureDate.toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(dateStr);
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/promised to pay/i)).toBeVisible();

    await page.getByRole('button', { name: /clear/i }).click();

    const promisedDate = await getCustomerField(page, 'promised_pay_date');
    expect(promisedDate).toBeNull();
    const promiseNote = await getCustomerField(page, 'promise_note');
    expect(promiseNote).toBeNull();
    await expect(page.locator('button').filter({ hasText: /record promise/i }).first()).toBeVisible();
  });

  test('cancel closes form without saving', async ({ page }) => {
    await clickPromiseButton(page);
    await expect(page.locator('input[type="date"]')).toBeVisible({ timeout: 5000 });

    await page.locator('input[type="date"]').fill('2099-01-15');
    await page.locator(NOTE_INPUT).fill('Should not save');
    await page.getByRole('button', { name: /cancel/i }).first().click();

    await expect(page.locator('input[type="date"]')).not.toBeVisible();

    const promisedDate = await getCustomerField(page, 'promised_pay_date');
    expect(promisedDate).toBeNull();
  });
});
