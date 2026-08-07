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

async function seedLinkedCustomer(page: import('@playwright/test').Page) {
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
        id: 'cust-tg-test',
        display_name: 'Telegram Test',
        phone_number: '+251911000030',
        balance: 200,
        has_overdue: false,
        overdue_days: 0,
        transaction_count: 1,
        on_time_eligible: 0,
        on_time_count: 0,
        avg_pay_days: 0,
        latest_due_date: null,
        promised_pay_date: null,
        promise_note: null,
        telegram_username: 'tg_test_user',
        telegram_chat_id: 'chat-123456',
        telegram_link_token: 'tok_test_abc123',
        telegram_linked_at: now - 3600000,
        telegram_link_requested_at: now - 7200000,
        telegram_notify_enabled: true,
        archived_at: null,
        created_at: now - 86400000,
        updated_at: now - 86400000,
        photo_data: null,
        photo_caption: null,
      });
      txStore.put({
        id: 'tx-tg-1',
        customer_id: 'cust-tg-test',
        type: 'credit_add',
        amount: 200,
        item_note: 'Tea',
        payment_method: 'cash',
        created_at: now - 86400000,
        updated_at: now - 86400000,
        reference_code: 'REF-TG-001',
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

test.describe('Telegram Resend — full flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gebya_lang', 'en');
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await seedSettings(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await seedLinkedCustomer(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('nav').getByRole('button', { name: /credit/i }).click();
    await page.getByRole('button', { name: /telegram test/i }).click();
    await expect(page.getByText('Telegram Test', { exact: true }).first()).toBeVisible();
  });

  test('shows Resend button when telegram is linked', async ({ page }) => {
    await expect(page.getByText('Linked')).toBeVisible();
    await expect(page.getByText('Resend')).toBeVisible();
  });

  test('calls sync + resend API on click (delivered)', async ({ page }) => {
    let syncCalled = false;
    let resendCalled = false;
    let resendToken = '';

    await page.route('**/api/telegram/customers/sync', async (route) => {
      syncCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route('**/api/telegram/resend-latest', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      resendToken = body.token;
      resendCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ delivered: true }),
      });
    });

    await page.getByText('Resend').click();
    await expect(page.getByText(/latest borrower update sent/i)).toBeVisible({ timeout: 5000 });

    expect(syncCalled).toBe(true);
    expect(resendCalled).toBe(true);
    expect(resendToken).toBe('tok_test_abc123');
  });

  test('shows "no update ready" when not delivered', async ({ page }) => {
    await page.route('**/api/telegram/customers/sync', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route('**/api/telegram/resend-latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ delivered: false }),
      });
    });

    await page.getByText('Resend').click();
    await expect(page.getByText(/no borrower update is ready/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows error toast on API failure', async ({ page }) => {
    await page.route('**/api/telegram/customers/sync', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route('**/api/telegram/resend-latest', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await page.getByText('Resend').click();
    await expect(page.getByText(/could not resend|server error/i)).toBeVisible({ timeout: 5000 });
  });

  test('does not show Resend when telegram is not linked', async ({ page }) => {
    await page.evaluate(async () => {
      const request = indexedDB.open('GebyaDB');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');
        const req = store.get('cust-tg-test');
        req.onsuccess = () => {
          const customer = req.result;
          if (customer) {
            customer.telegram_chat_id = null;
            customer.telegram_link_token = null;
            store.put(customer);
          }
          resolve();
        };
        req.onerror = () => reject(req.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('nav').getByRole('button', { name: /credit/i }).click();
    await page.getByRole('button', { name: /telegram test/i }).click();
    await expect(page.getByText('Resend')).toHaveCount(0);
  });
});
