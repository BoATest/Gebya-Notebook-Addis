import { expect, test, type Page } from '@playwright/test';

async function setTestAuthToken(page: Page) {
  await page.evaluate(async () => {
    const open = indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key: 'gebya_auth_token', value: 'test-jwt-token' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
}

async function resetFreshOrigin(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('gebya_lang', 'en');
    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase('GebyaDB');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function mockOwner(page: Page) {
  await page.route('**/api/shops', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        shop_id: 'activity-shop',
        shop_name: 'Activity Shop',
        join_code: 'ACTV-1234',
        join_url: '/join?c=ACTV-1234',
        device_id: 'activity-owner-device',
        device_token: 'activity-owner-token',
        staff_id: 'activity-owner-staff',
        display_name: 'Owner Tigist',
        role: 'owner',
        permissions: { can_view_staff_feed: true },
        device_status: 'active',
        phone_required: false,
        approval_required: false,
      }),
    });
  });

  await page.route('**/api/shops/activity-shop/staff', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      staff: [
        {
          id: 'staff-1',
          staff_id: 'staff-1',
          display_name: 'Marta',
          role: 'staff',
          active: true,
          devices: [],
        },
      ],
    }),
  }));
}

function activityRows() {
  return [
    {
      id: '11111111-1111-4111-8111-111111111111',
      client_event_id: 'staff-device:credit-1',
      event_type: 'customer_credit',
      staff_name: 'Marta',
      staff_role: 'staff',
      amount: 95,
      summary: 'Sugar',
      note: 'promised tomorrow',
      payment_method_label: null,
      occurred_at_device: '2026-06-13T08:45:00.000Z',
      created_at_server: '2026-06-13T08:46:00.000Z',
      sync_state: 'synced',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      client_event_id: 'staff-device:payment-1',
      event_type: 'customer_payment',
      staff_name: 'Marta',
      staff_role: 'staff',
      amount: 50,
      summary: 'Almaz',
      note: null,
      payment_method_label: 'Cash',
      occurred_at_device: '2026-06-13T08:30:00.000Z',
      created_at_server: '2026-06-13T08:31:00.000Z',
      sync_state: 'synced',
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      client_event_id: 'staff-device:sale-1',
      event_type: 'sale',
      staff_name: 'Marta',
      staff_role: 'staff',
      amount: 120,
      summary: 'Coffee',
      note: 'morning',
      payment_method_label: 'Cash',
      occurred_at_device: '2026-06-13T08:10:00.000Z',
      created_at_server: '2026-06-13T08:11:00.000Z',
      sync_state: 'synced',
    },
  ];
}

async function startOwnerAndOpenActivity(page: Page) {
  await mockOwner(page);
  await resetFreshOrigin(page);
  await page.getByRole('button', { name: /shop owner/i }).click();
  await page.getByPlaceholder(/enter your name/i).fill('Activity Shop');
  await page.getByRole('button', { name: /^\s*start\s*$/i }).click();
  await expect(page.getByText(/owner tigist|activity shop/i)).toBeVisible();
  await setTestAuthToken(page);
  await page.locator('nav').getByRole('button', { name: /staff/i }).click();
  await page.getByRole('button', { name: /^activity$/i }).click();
}

test('owner sees populated Staff Activity Feed grouped by period', async ({ page }) => {
  await page.route('**/api/events/activity', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ activities: activityRows(), persistence: 'in_memory_preview' }),
  }));

  await startOwnerAndOpenActivity(page);

  await expect(page.getByText(/older/i)).toBeVisible();
  await expect(page.getByText(/3 activities/i)).toBeVisible();
  await expect(page.getByText(/265/)).toBeVisible();

  await page.getByText(/older/i).click();
  await expect(page.getByText('Marta').first()).toBeVisible();
  await expect(page.getByText('Sugar')).toBeVisible();
  await expect(page.getByText('Almaz')).toBeVisible();
  await expect(page.getByText('Coffee')).toBeVisible();
  await expect(page.getByText('95 birr')).toBeVisible();
  await expect(page.getByText('50 birr')).toBeVisible();
  await expect(page.getByText('120 birr')).toBeVisible();
});

test('Staff Activity Feed empty state is clear', async ({ page }) => {
  await page.route('**/api/events/activity', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ activities: [], persistence: 'in_memory_preview' }),
  }));

  await startOwnerAndOpenActivity(page);

  await expect(page.getByText(/staff activity will appear here/i)).toBeVisible();
});

test('Staff Activity Feed filter narrows to one event type', async ({ page }) => {
  await page.route('**/api/events/activity', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ activities: activityRows(), persistence: 'in_memory_preview' }),
  }));

  await startOwnerAndOpenActivity(page);
  await page.getByText(/older/i).click();

  await page.getByRole('button', { name: /sales/i }).click();
  await expect(page.getByText('Coffee')).toBeVisible();
  await expect(page.getByText('Sugar')).toHaveCount(0);
  await expect(page.getByText('Almaz')).toHaveCount(0);
});
