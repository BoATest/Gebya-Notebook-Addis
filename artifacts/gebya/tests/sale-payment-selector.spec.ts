import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase('GebyaDB');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
  await page.reload({ waitUntil: 'networkidle' });

  if (await page.getByText(/start your notebook/i).isVisible()) {
    const input = page.getByPlaceholder(/e\.g\. tigist/i);
    await input.waitFor({ state: 'visible' });
    await input.fill('Tigist Shop');
    const btn = page.getByRole('button', { name: /start using gebya/i });
    await btn.waitFor({ state: 'visible' });
    await btn.click();
    await page.waitForURL(/^[^#]*$/, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);
  }
});

test('direct payment selector: Cash is visible and selected by default', async ({ page }) => {
  await page.getByRole('button', { name: /sale/i }).click();
  await expect(page.getByText(/how much total/i)).toBeVisible({ timeout: 5000 });

  await page.locator('input[inputmode="decimal"]').first().fill('100');

  const cashBtn = page.getByRole('button', { name: /cash/i }).first();
  await expect(cashBtn).toBeVisible();

  const paymentMethodLabel = page.getByText(/payment method/i);
  await expect(paymentMethodLabel).toBeVisible();
});

test('direct payment selector: wallet provider direct selection maps correctly', async ({ page }) => {
  await page.getByRole('button', { name: /sale/i }).click();
  await expect(page.getByText(/how much total/i)).toBeVisible({ timeout: 5000 });

  await page.locator('input[inputmode="decimal"]').first().fill('500');

  const telebirrBtn = page.getByRole('button', { name: /telebirr/i });
  await expect(telebirrBtn).toBeVisible();
  await telebirrBtn.click();

  const saveBtn = page.getByRole('button', { name: /save sale/i });
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();

  await expect(page.getByText(/birr.*saved/i)).toBeVisible({ timeout: 5000 });

  const stored = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('GebyaDB');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readonly');
      const req = tx.objectStore('transactions').openCursor();
      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const val = cursor.value;
          if (val.type === 'sale') resolve({ payment_type: val.payment_type, payment_provider: val.payment_provider });
          else cursor.continue();
        } else resolve(null);
      };
      req.onerror = () => reject(req.error);
    });
  });

  expect(stored).not.toBeNull();
  expect(stored.payment_type).toBe('wallet');
  expect(stored.payment_provider).toBe('telebirr');
});

test('direct payment selector: bank provider direct selection maps correctly', async ({ page }) => {
  await page.getByRole('button', { name: /sale/i }).click();
  await expect(page.getByText(/how much total/i)).toBeVisible({ timeout: 5000 });

  await page.locator('input[inputmode="decimal"]').first().fill('300');

  const cbeBtn = page.locator('button').filter({ hasText: 'CBE' }).nth(1);
  await expect(cbeBtn).toBeVisible();
  await cbeBtn.click();

  const saveBtn = page.getByRole('button', { name: /save sale/i });
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();

  await expect(page.getByText(/birr.*saved/i)).toBeVisible({ timeout: 5000 });

  const stored = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('GebyaDB');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readonly');
      const req = tx.objectStore('transactions').openCursor();
      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const val = cursor.value;
          if (val.type === 'sale') resolve({ payment_type: val.payment_type, payment_provider: val.payment_provider });
          else cursor.continue();
        } else resolve(null);
      };
      req.onerror = () => reject(req.error);
    });
  });

  expect(stored).not.toBeNull();
  expect(stored.payment_type).toBe('bank');
  expect(stored.payment_provider).toBe('CBE');
});

test('direct payment selector: Cash selection maps to payment_type cash with empty provider', async ({ page }) => {
  await page.getByRole('button', { name: /sale/i }).click();
  await expect(page.getByText(/how much total/i)).toBeVisible({ timeout: 5000 });

  await page.locator('input[inputmode="decimal"]').first().fill('200');

  const cashBtn = page.getByRole('button', { name: /cash/i }).first();
  await expect(cashBtn).toBeVisible();
  await cashBtn.click();

  const saveBtn = page.getByRole('button', { name: /save sale/i });
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();

  await expect(page.getByText(/birr.*saved/i)).toBeVisible({ timeout: 5000 });

  const stored = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('GebyaDB');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readonly');
      const req = tx.objectStore('transactions').openCursor();
      req.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const val = cursor.value;
          if (val.type === 'sale') resolve({ payment_type: val.payment_type, payment_provider: val.payment_provider });
          else cursor.continue();
        } else resolve(null);
      };
      req.onerror = () => reject(req.error);
    });
  });

  expect(stored).not.toBeNull();
  expect(stored.payment_type).toBe('cash');
  expect(stored.payment_provider).toBeNull();
});

test('Dubie summary: shows To collect (Dubie) label and correct subtext', async ({ page }) => {
  await page.getByRole('button', { name: /sale/i }).click();
  await expect(page.getByText(/how much total/i)).toBeVisible({ timeout: 5000 });

  await page.locator('input[inputmode="decimal"]').first().fill('800');

  await page.getByTestId('sale-settlement-pay_later').click();

  await expect(page.getByText(/to collect \(dubie\)/i)).toBeVisible({ timeout: 3000 });
  await expect(page.getByText('800.00 birr', { exact: true })).toBeVisible();
  await expect(page.locator('p').filter({ hasText: 'This sale will be added to Dubie.' }).first()).toBeVisible();

  await expect(page.getByText(/payment method/i)).not.toBeVisible();
  await expect(page.getByText(/payment type/i)).not.toBeVisible();
});

test('Dubie sale save flow unchanged: saves with correct remaining_amount and customer', async ({ page }) => {
  await page.getByRole('button', { name: /sale/i }).click();
  await expect(page.getByText(/how much total/i)).toBeVisible({ timeout: 5000 });

  await page.locator('input[inputmode="decimal"]').first().fill('800');

  await page.getByTestId('sale-settlement-pay_later').click();

  const customerInput = page.getByPlaceholder(/name, nickname, relation, place, or vehicle clue/i);
  await customerInput.fill('Sam');

  await page.waitForTimeout(600);

  const saveBtn = page.getByRole('button', { name: /save dubie 800\.00 birr/i });
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();

  await expect(page.getByText(/birr.*saved/i)).toBeVisible({ timeout: 5000 });

  const linked = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('GebyaDB');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['transactions', 'customer_transactions'], 'readonly');
      const transactions = [];
      const customerTransactions = [];
      tx.objectStore('transactions').openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          transactions.push(cursor.value);
          cursor.continue();
        }
      };
      tx.objectStore('customer_transactions').openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          customerTransactions.push(cursor.value);
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve({ transactions, customerTransactions });
      tx.onerror = () => reject(tx.error);
    });
  });

  expect(linked.transactions.some(tx => tx.type === 'sale' && tx.remaining_amount === 800 && tx.sale_settlement_mode === 'pay_later')).toBe(true);
  expect(linked.customerTransactions.some(tx => tx.type === 'credit_add' && tx.amount === 800)).toBe(true);
});

test('Partial sale behavior unchanged: remaining balance still shows Remaining balance label', async ({ page }) => {
  await page.getByRole('button', { name: /sale/i }).click();
  await expect(page.getByText(/how much total/i)).toBeVisible({ timeout: 5000 });

  await page.locator('input[inputmode="decimal"]').first().fill('1000');
  await page.getByPlaceholder(/e\.g\. bread, sugar/i).fill('Tea');

  await page.getByTestId('sale-settlement-paid_partly').click();

  await page.getByPlaceholder(/name, nickname, relation, place, or vehicle clue/i).fill('Abebe');
  await page.locator('input[inputmode="decimal"]').nth(1).fill('400');

  await page.waitForTimeout(600);

  await expect(page.getByText(/remaining balance/i)).toBeVisible({ timeout: 3000 });
  await expect(page.getByText('600.00 birr', { exact: true })).toBeVisible();

  const trackBtn = page.getByRole('button', { name: /save \+ track 600\.00 birr/i });
  await expect(trackBtn).toBeEnabled();
  await trackBtn.click();

  await expect(page.getByText(/birr.*saved/i)).toBeVisible({ timeout: 5000 });
});
