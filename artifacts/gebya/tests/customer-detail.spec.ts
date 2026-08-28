import { expect, test, type Page } from '@playwright/test';

// CustomerDetail — Timeline Intelligence enhancement acceptance tests.
//
// Drives the REAL UI (local-first IndexedDB), unlike the previous version of
// this spec which mocked `/api/customers/**` and navigated to a `/customers/:id`
// route that does not exist in the app.
//
// Seeded scenario (deterministic):
//   - credit 'Sugar 5kg'      300 birr, created 30d ago, due 6d ago, UNPAID
//     → customer is 6 days overdue, balance 300
//   - credit 'Cooking oil'    500 birr, created 10d ago, due 1d from settlement
//   - payment 'Repaid'        500 birr, 2d ago (settles cooking-oil credit)
//     → avg payment period = 8 days; on-time data exists (1/1) but must be
//       HIDDEN from the shop-owner view.
const CUSTOMER_ID = 'cust-detail-test';

async function seedSettings(page: Page) {
  await page.evaluate(async () => {
    const request = indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as IDBDatabase);
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
      tx.onabort = () => reject(tx.abort);
    });
    db.close();
  });
}

async function seedCustomer(page: Page) {
  await page.evaluate(async (customerId: string) => {
    const request = indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as IDBDatabase);
      request.onerror = () => reject(request.error);
    });
    const now = Date.now();
    const day = 86400000;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['customers', 'customer_transactions'], 'readwrite');
      const customerStore = tx.objectStore('customers');
      const txStore = tx.objectStore('customer_transactions');
      customerStore.put({
        id: customerId,
        display_name: 'Addisu Test',
        phone_number: '+251911000009',
        balance: 300,
        has_overdue: true,
        overdue_days: 6,
        transaction_count: 3,
        on_time_eligible: 1,
        on_time_count: 1,
        avg_pay_days: 8,
        latest_due_date: now - 6 * day,
        promised_pay_date: null,
        promise_note: null,
        telegram_username: null,
        telegram_chat_id: 'chat-test-1',
        telegram_link_token: null,
        telegram_linked_at: now - 5 * day,
        telegram_link_requested_at: null,
        telegram_notify_enabled: true,
        archived_at: null,
        created_at: now - 40 * day,
        updated_at: now - day,
        photo_data: null,
        photo_caption: null,
      });
      // Settled credit (created 10d ago) — FIFO-settled by the payment 2d ago
      // → avg payment period = 8 days, settled before its due date → on time.
      txStore.put({
        id: 'tx-detail-1',
        customer_id: customerId,
        type: 'credit_add',
        amount: 500,
        item_note: 'Cooking oil',
        due_date: now - 1 * day,
        created_at: now - 10 * day,
        updated_at: now - 10 * day,
        payment_method: 'cash',
        reference_code: 'REF-D1',
        telegram_delivery_state: null,
        telegram_delivery_attempted_at: null,
      });
      // Overdue, unsettled credit (due 6 days ago, created after the settled one)
      txStore.put({
        id: 'tx-detail-2',
        customer_id: customerId,
        type: 'credit_add',
        amount: 300,
        item_note: 'Sugar 5kg',
        due_date: now - 6 * day,
        created_at: now - 7 * day,
        updated_at: now - 7 * day,
        payment_method: 'cash',
        reference_code: 'REF-D2',
        telegram_delivery_state: null,
        telegram_delivery_attempted_at: null,
      });
      txStore.put({
        id: 'tx-detail-3',
        customer_id: customerId,
        type: 'payment',
        amount: 500,
        item_note: 'Repaid',
        created_at: now - 2 * day,
        updated_at: now - 2 * day,
        payment_method: 'cash',
        reference_code: 'REF-D3',
        telegram_delivery_state: null,
        telegram_delivery_attempted_at: null,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.abort);
    });
    db.close();
  }, CUSTOMER_ID);
}

test.describe('CustomerDetail — Timeline Intelligence', () => {
  // This machine is slow — seed reloads can take a while.
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gebya_lang', 'en');
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await seedSettings(page);
    await seedCustomer(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('nav').getByRole('button', { name: /credit/i }).click();
    await page.getByRole('button', { name: /addisu test/i }).click();
    await expect(page.getByText('Addisu Test', { exact: true }).first()).toBeVisible();
  });

  test('owner view hides the On-time % KPI (moved to admin/analytics)', async ({ page }) => {
    // Seeded data has on-time history (1/1 eligible) — the old UI showed
    // "100% on time". It must not appear anywhere on the owner page.
    await expect(page.getByText(/on time/i)).toHaveCount(0);
    await expect(page.getByText(/\d+%\s*on time/)).toHaveCount(0);
  });

  test('average payment period renders as "8 days" (not "8D")', async ({ page }) => {
    await expect(page.getByText('Avg pay:').first()).toBeVisible();
    await expect(page.getByText('8 days', { exact: true })).toBeVisible();
    await expect(page.getByText('8D')).toHaveCount(0);
  });

  test('overdue pill uses natural language "6 days overdue"', async ({ page }) => {
    await expect(page.getByText('6 days overdue')).toBeVisible();
    await expect(page.getByText(/6d\s*overdue/i)).toHaveCount(0);
  });

  test('summary emphasizes the amount owed and entry count', async ({ page }) => {
    await expect(page.getByText('You are owed').first()).toBeVisible();
    await expect(page.getByText('300.00').first()).toBeVisible();
    await expect(page.getByText(/3\s*entries/).first()).toBeVisible();
  });

  test('Transfer is a visible first-class action', async ({ page }) => {
    const transfer = page.locator('[aria-label*="transfer" i]');
    await expect(transfer).toBeVisible();
    await expect(transfer).toContainText('Transfer');
  });

  test('existing communication actions remain available', async ({ page }) => {
    await expect(page.getByRole('link', { name: /call/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^sms$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /linked/i })).toBeVisible();
  });

  test('More sheet keeps Send Reminder / Edit / Archive reachable', async ({ page }) => {
    await page.getByRole('button', { name: /more actions/i }).click();
    await expect(page.getByText('More actions')).toBeVisible();
    // .last() scopes to the sheet — the header edit button shares the name.
    await expect(page.getByRole('button', { name: /send reminder/i }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: /edit customer/i }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: /archive customer/i }).last()).toBeVisible();
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByText('More actions')).toHaveCount(0);
  });

  test('Mark Fully Paid remains the dominant financial action', async ({ page }) => {
    await expect(page.getByText(/mark fully paid/i).first()).toBeVisible();
  });

  test('Follow-up groups Promise and Reminders', async ({ page }) => {
    await expect(page.getByText('Follow-up')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /record promise/i }).first()).toBeVisible();
    await expect(page.getByText(/no reminders sent/i).first()).toBeVisible();
  });

  test('promise to pay also appears as a timeline entry', async ({ page }) => {
    test.setTimeout(120000);
    await page.addInitScript(() => localStorage.setItem('gebya_lang', 'en'));
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await seedSettings(page);
    await seedCustomer(page);
    // Record a promise on the seeded customer.
    await page.evaluate((cid) => new Promise((res) => {
      const r = indexedDB.open('GebyaDB');
      r.onsuccess = () => {
        const db = r.result;
        const tx = db.transaction('customers', 'readwrite');
        const store = tx.objectStore('customers');
        const get = store.get(cid);
        get.onsuccess = () => {
          const c = get.result;
          c.promised_pay_date = Date.now() + 2 * 86400000;
          c.promise_note = 'Friday market';
          store.put(c);
          tx.oncomplete = () => { db.close(); res(); };
        };
      };
    }), CUSTOMER_ID);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('nav').getByRole('button', { name: /credit/i }).click();
    await page.getByRole('button', { name: /addisu test/i }).click();
    await expect(page.getByText('Addisu Test', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/promise to pay/i).first()).toBeVisible();
    // "Friday market" appears in both the Follow-up note and the timeline entry.
    await expect(page.getByText('Friday market').first()).toBeVisible();
  });

  test('timeline keeps search, filters and transaction rows', async ({ page }) => {
    await expect(page.getByPlaceholder('Search items...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /credits/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /payments/i })).toBeVisible();
    await expect(page.getByText('Sugar 5kg')).toBeVisible();
    await expect(page.getByText('Repaid')).toBeVisible();
  });

  test('bottom action bar keeps You Gave (Dubie) / You Got (Paid)', async ({ page }) => {
    await expect(page.getByText(/you gave/i).first()).toBeVisible();
    await expect(page.getByText(/you got/i).first()).toBeVisible();
  });

  test.describe('mobile viewport', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test('sticky balance block collapses on scroll', async ({ page }) => {
      const balanceBlock = page.locator('#balanceBlock');
      await expect(balanceBlock).toBeVisible();
      // Mark Fully Paid is now the dominant Tier‑1 action in the Quick Actions
      // row (beside Transfer), not inside the balance block.
      await expect(page.getByRole('button', { name: /mark fully paid/i }).first()).toBeVisible();
      // Scroll the main container (overflow-y-auto) past the 30px collapse
      // threshold. Dispatch the event explicitly for browsers that don't
      // fire it on programmatic scrollTop changes. Also extend the body so
      // window scroll works as a fallback.
      await page.evaluate(() => {
        document.body.style.minHeight = '200vh';
        const el = document.getElementById('scrollable')
          || document.querySelector('main');
        if (el) {
          el.scrollTop = 300;
          el.dispatchEvent(new Event('scroll', { bubbles: true }));
        }
        window.scrollTo(0, 300);
        window.dispatchEvent(new Event('scroll', { bubbles: true }));
      });
      await page.waitForTimeout(400);
      // Collapsed bar replaces the expanded block (dominant CTA hidden).
      await expect(balanceBlock).not.toContainText('Mark Fully Paid');
      await expect(balanceBlock).toContainText('birr');
    });
  });

  test('renders the complete page without crashing', async ({ page }) => {
    // .first() — the name also appears in the sticky collapsed header.
    await expect(page.getByText('Addisu Test', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/back · customers/i)).toBeVisible();
    await expect(page.locator('#balanceBlock')).toBeVisible();
    await expect(page.getByText(/backed up securely/i)).toBeVisible();
  });
});
