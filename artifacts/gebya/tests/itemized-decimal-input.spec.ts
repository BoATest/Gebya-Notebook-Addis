import { expect, test, type Page } from '@playwright/test';

// Regression guard for user report: "on the itemized page the . is not
// considered — even if I type a . to identify fractions or amount it ignores it".
//
// Root cause: the itemized row's qty input filtered with replace(/[^\d]/g,'')
// (digits only), so "1.5" collapsed to "15" and a lone "." snapped back to "1".
// The discount input was backed by a Number state, which re-rendered "2." as "2".
// Fix: both fields now delegate to numformat.js helpers that keep a single
// decimal separator as a STRING while typing. The tests use pressSequentially
// (not .fill()) so they exercise the per-keystroke controlled-input states
// where the regression used to trigger.

async function resetFreshOrigin(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('gebya_lang', 'en');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('gebya_lang', 'en');
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase('GebyaDB');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
}

/** Keeps identity calls hermetic so the notebook boots like a real offline phone. */
async function mockIdentityRoutes(page: Page) {
  await page.route('**/api/shops', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        shop_id: 'decimal-input-shop',
        shop_name: 'Tigist Shop',
        join_code: 'DEC-1234',
        join_url: 'http://127.0.0.1:4173/?join=DEC-1234',
        device_id: 'decimal-input-owner-device',
        device_token: 'decimal-input-owner-token',
        staff_id: 'decimal-input-owner-staff',
        display_name: 'Tigist Shop',
        role: 'owner',
        permissions: {},
        device_status: 'active',
        phone_required: false,
        approval_required: false,
      }),
    });
  });

  await page.route('**/api/shops/decimal-input-shop/staff', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ staff: [] }),
    });
  });
}

async function startEnglishNotebook(page: Page) {
  await mockIdentityRoutes(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('gebya_lang', 'en');
  });
  await resetFreshOrigin(page);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.getByText('Shop Owner').click();
  await page.getByPlaceholder('Enter your name').fill('Tigist Shop');
  await page.getByRole('button', { name: /^start$/i }).click();
  await expect(page.getByText('Recording as')).toBeVisible();
}

async function readSavedSale(page: Page) {
  return page.evaluate(async () => {
    const request = window.indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    try {
      return await new Promise<any>((resolve, reject) => {
        const tx = db.transaction('transactions', 'readonly');
        const store = tx.objectStore('transactions');
        const getAll = store.getAll();
        getAll.onsuccess = () => resolve(getAll.result.find((row: any) => row.type === 'sale') || null);
        getAll.onerror = () => reject(getAll.error);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  });
}

/** Onboarding lands on Today; the inline "Simple" sale strip is already visible. */
async function openItemizedSale(page: Page) {
  await startEnglishNotebook(page);

  // A fractional amount typed first — it must survive the SIMPLE -> ITEMIZED
  // hand-off and become row 1's unit price untouched.
  await page.getByPlaceholder('0').fill('10.5');
  await page.getByRole('button', { name: /add details/i }).click();

  const firstRow = page.locator('[data-row-id]').first();
  await expect(firstRow.locator('[data-field="price"]')).toHaveValue('10.5');
  return firstRow;
}

test('itemized qty keeps a decimal point and the fraction drives the line math', async ({ page }) => {
  const firstRow = await openItemizedSale(page);
  const qty = firstRow.locator('[data-field="qty"]');

  await qty.click();
  await qty.press('Control+a');
  await qty.pressSequentially('1.5');

  await expect(qty).toHaveValue('1.5');
  // 10.5 x 1.5 = 15.75 — the fraction must drive the math, not just the display.
  await expect(firstRow.locator('.total-col')).toHaveText('15.75');
});

test('itemized discount keeps a decimal point while typing', async ({ page }) => {
  await openItemizedSale(page);

  await page.getByRole('button', { name: /add discount/i }).click();
  // In the itemized stage the decimal-keypad inputs are the item rows' price
  // fields followed by the discount field (last in the DOM).
  const discountInput = page.locator('input[inputmode="decimal"]').last();

  await discountInput.click();
  await discountInput.press('Control+a');
  await discountInput.pressSequentially('2.5');

  await expect(discountInput).toHaveValue('2.5');
});
