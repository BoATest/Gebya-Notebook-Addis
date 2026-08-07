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

async function seedTwoCustomers(page: import('@playwright/test').Page) {
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
        id: 'cust-source', display_name: 'Source Customer',
        phone_number: '+251911000010', balance: 1000,
        has_overdue: false, overdue_days: 0, transaction_count: 1,
        on_time_eligible: 0, on_time_count: 0, avg_pay_days: 0,
        latest_due_date: null, promised_pay_date: null, promise_note: null,
        telegram_username: null, telegram_chat_id: null, telegram_link_token: null,
        telegram_linked_at: null, telegram_link_requested_at: null,
        telegram_notify_enabled: false, archived_at: null,
        created_at: now - 86400000, updated_at: now - 86400000,
        photo_data: null, photo_caption: null,
      });
      customerStore.put({
        id: 'cust-target', display_name: 'Target Customer',
        phone_number: '+251911000020', balance: 0,
        has_overdue: false, overdue_days: 0, transaction_count: 0,
        on_time_eligible: 0, on_time_count: 0, avg_pay_days: 0,
        latest_due_date: null, promised_pay_date: null, promise_note: null,
        telegram_username: null, telegram_chat_id: null, telegram_link_token: null,
        telegram_linked_at: null, telegram_link_requested_at: null,
        telegram_notify_enabled: false, archived_at: null,
        created_at: now - 86400000, updated_at: now - 86400000,
        photo_data: null, photo_caption: null,
      });
      txStore.put({
        id: 'tx-source-1', customer_id: 'cust-source', type: 'credit_add',
        amount: 1000, item_note: 'Initial credit', payment_method: 'cash',
        created_at: now - 86400000, updated_at: now - 86400000,
        reference_code: 'REF-SRC-001',
        telegram_delivery_state: null, telegram_delivery_attempted_at: null,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
}

test.describe('Transfer Balance — full flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gebya_lang', 'en');
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await seedSettings(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await seedTwoCustomers(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('nav').getByRole('button', { name: /credit/i }).click();
    await page.getByRole('button', { name: /source customer/i }).click();
    await expect(page.getByText('Source Customer', { exact: true }).first()).toBeVisible();
  });

  test('shows transfer button on customer detail', async ({ page }) => {
    const transferButton = page.locator('[aria-label*="transfer" i]');
    await expect(transferButton).toBeVisible();
  });

  test('opens transfer sheet when transfer button clicked', async ({ page }) => {
    const transferButton = page.locator('[aria-label*="transfer" i]');
    await transferButton.click();
    await expect(page.getByText('Transfer Credit').first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByPlaceholder(/type customer name/i)).toBeVisible();
  });

  test('searches for target customer and selects', async ({ page }) => {
    const transferButton = page.locator('[aria-label*="transfer" i]');
    await transferButton.click();
    await expect(page.getByText('Transfer Credit').first()).toBeVisible({ timeout: 3000 });

    await page.getByPlaceholder(/type customer name/i).fill('Target');
    await expect(page.getByText('Target Customer')).toBeVisible();
    await page.getByText('Target Customer').click();
    // Target should now be shown as selected
    await expect(page.getByText('Target Customer').first()).toBeVisible();
  });

  test('enters amount and saves transfer', async ({ page }) => {
    const transferButton = page.locator('[aria-label*="transfer" i]');
    await transferButton.click();
    await expect(page.getByText('Transfer Credit').first()).toBeVisible({ timeout: 3000 });

    await page.getByPlaceholder(/type customer name/i).fill('Target');
    await page.getByText('Target Customer').click();

    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.fill('250');
    await page.getByRole('button', { name: 'Transfer Credit', exact: true }).click();
    await page.waitForTimeout(500);
  });

  test('transfer creates reversal + credit_add in IndexedDB', async ({ page }) => {
    const transferButton = page.locator('[aria-label*="transfer" i]');
    await transferButton.click();
    await expect(page.getByText('Transfer Credit').first()).toBeVisible({ timeout: 3000 });

    await page.getByPlaceholder(/type customer name/i).fill('Target');
    await page.getByText('Target Customer').click();

    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.fill('250');
    await page.getByRole('button', { name: 'Transfer Credit', exact: true }).click();
    await page.waitForTimeout(1000);

    const sourceTx = await page.evaluate(async () => {
      const request = indexedDB.open('GebyaDB');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const result = await new Promise<any[]>((resolve, reject) => {
        const tx = db.transaction('customer_transactions', 'readonly');
        const store = tx.objectStore('customer_transactions');
        const idx = store.index('customer_id');
        const req = idx.getAll('cust-source');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return result;
    });

    const reversal = sourceTx.find((e: any) => e.type === 'reversal');
    expect(reversal).toBeDefined();
    expect(Number(reversal.amount)).toBe(250);
    expect(reversal.payment_method).toBe('transfer');

    const targetTx = await page.evaluate(async () => {
      const request = indexedDB.open('GebyaDB');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const result = await new Promise<any[]>((resolve, reject) => {
        const tx = db.transaction('customer_transactions', 'readonly');
        const store = tx.objectStore('customer_transactions');
        const idx = store.index('customer_id');
        const req = idx.getAll('cust-target');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return result;
    });

    const creditAdd = targetTx.find((e: any) => e.type === 'credit_add');
    expect(creditAdd).toBeDefined();
    expect(Number(creditAdd.amount)).toBe(250);
    expect(creditAdd.payment_method).toBe('transfer');
  });

  test('transfer updates updated_at on both customers', async ({ page }) => {
    const beforeTransfer = Date.now();
    const transferButton = page.locator('[aria-label*="transfer" i]');
    await transferButton.click();
    await expect(page.getByText('Transfer Credit').first()).toBeVisible({ timeout: 3000 });

    await page.getByPlaceholder(/type customer name/i).fill('Target');
    await page.getByText('Target Customer').click();

    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.fill('100');
    await page.getByRole('button', { name: 'Transfer Credit', exact: true }).click();
    await page.waitForTimeout(1000);

    const customers = await page.evaluate(async () => {
      const request = indexedDB.open('GebyaDB');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const getResult = (id: string) => new Promise<any>((resolve, reject) => {
        const tx = db.transaction('customers', 'readonly');
        const req = tx.objectStore('customers').get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const source = await getResult('cust-source');
      const target = await getResult('cust-target');
      db.close();
      return { sourceUpdatedAt: source?.updated_at, targetUpdatedAt: target?.updated_at };
    });

    expect(customers.sourceUpdatedAt).toBeGreaterThanOrEqual(beforeTransfer);
    expect(customers.targetUpdatedAt).toBeGreaterThanOrEqual(beforeTransfer);
  });

  test('insufficient balance disables save button and shows error', async ({ page }) => {
    const transferButton = page.locator('[aria-label*="transfer" i]');
    await transferButton.click();
    await expect(page.getByText('Transfer Credit').first()).toBeVisible({ timeout: 3000 });

    await page.getByPlaceholder(/type customer name/i).fill('Target');
    await page.getByText('Target Customer').click();

    const amountInput = page.locator('input[placeholder="0"]');
    await amountInput.fill('2000');
    // Button should be disabled when amount exceeds balance
    const saveButton = page.getByRole('button', { name: 'Transfer Credit', exact: true });
    await expect(saveButton).toBeDisabled();
    // Inline error message should appear
    await expect(page.getByText(/exceeds available balance/i)).toBeVisible();
  });
});
