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

async function seedCustomer(page: import('@playwright/test').Page, overrides?: Record<string, unknown>) {
  await page.evaluate(async (ov) => {
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
        id: 'cust-archive-test',
        display_name: 'Archive Test',
        phone_number: '+251911000002',
        balance: 300,
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
        ...ov,
      });
      txStore.put({
        id: 'tx-archive-1',
        customer_id: 'cust-archive-test',
        type: 'credit_add',
        amount: 300,
        item_note: 'Coffee',
        payment_method: 'cash',
        created_at: now - 86400000,
        updated_at: now - 86400000,
        reference_code: 'REF-002',
        telegram_delivery_state: null,
        telegram_delivery_attempted_at: null,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, overrides);
}

async function getArchivedAt(page: import('@playwright/test').Page): Promise<unknown> {
  return page.evaluate(async () => {
    const request = indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction('customers', 'readonly');
      const store = tx.objectStore('customers');
      const req = store.get('cust-archive-test');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result?.archived_at ?? null;
  });
}

test.describe('Archive Customer — full flow', () => {
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
    await page.getByRole('button', { name: /archive test/i }).click();
    await expect(page.getByText('Archive Test', { exact: true }).first()).toBeVisible();
  });

  test('shows Archive button for non-archived customer', async ({ page }) => {
    await expect(page.getByRole('button', { name: /archive$/i })).toBeVisible();
  });

  test('opens confirmation dialog when Archive clicked', async ({ page }) => {
    await page.getByRole('button', { name: /archive$/i }).click();
    await expect(page.getByText(/archive "archive test"\?/i)).toBeVisible();
    await expect(page.getByText(/archived records are preserved/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^archive$/i })).toBeVisible();
  });

  test('archive sets archived_at timestamp in IndexedDB', async ({ page }) => {
    await page.getByRole('button', { name: /archive$/i }).click();
    await page.getByRole('button', { name: /^archive$/i }).last().click();
    await expect(page.getByText(/archive customer/i)).toBeVisible({ timeout: 5000 });

    const archivedAt = await getArchivedAt(page);
    expect(archivedAt).not.toBeNull();
    expect(typeof archivedAt).toBe('number');
    expect(archivedAt).toBeGreaterThan(Date.now() - 5000);
  });

  test('cancel closes dialog without archiving', async ({ page }) => {
    await page.getByRole('button', { name: /archive$/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByText(/archive "archive test"\?/i)).not.toBeVisible();

    const archivedAt = await getArchivedAt(page);
    expect(archivedAt).toBeNull();
  });

  test('archived customer shows Restore button instead of Archive', async ({ page }) => {
    // First archive the customer through the UI to ensure proper state
    await page.getByRole('button', { name: /archive$/i }).click();
    await page.getByRole('button', { name: /^archive$/i }).last().click();
    await page.waitForTimeout(1000);

    // Now the customer should show Restore instead of Archive
    await expect(page.getByRole('button', { name: /restore/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /archive$/i })).toHaveCount(0);
  });

  test('restore clears archived_at in IndexedDB', async ({ page }) => {
    // Archive through UI first
    await page.getByRole('button', { name: /archive$/i }).click();
    await page.getByRole('button', { name: /^archive$/i }).last().click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: /restore/i })).toBeVisible();

    // Now restore
    await page.getByRole('button', { name: /restore/i }).click();
    await page.getByRole('button', { name: /^archive$/i }).last().click();
    await expect(page.getByText(/archive customer/i)).toBeVisible({ timeout: 5000 });

    const archivedAt = await getArchivedAt(page);
    expect(archivedAt).toBeNull();
  });
});
