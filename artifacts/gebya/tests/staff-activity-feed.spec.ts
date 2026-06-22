import { expect, test, type Page } from '@playwright/test';

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

async function startOwnerAndOpenTeam(page: Page) {
  await mockOwner(page);
  await resetFreshOrigin(page);
  await page.getByRole('button', { name: /own.*manage a shop/i }).click();
  await page.getByPlaceholder(/e\.g\. tigist/i).fill('Activity Shop');
  await page.getByRole('button', { name: /start using gebya/i }).click();
  await expect(page.getByRole('heading', { name: /activity shop/i })).toBeVisible();
  await page.locator('nav').getByRole('button', { name: /more/i }).click();
  await page.getByRole('button', { name: /Team & Staff/ }).click();
}

test('owner sees populated Staff Activity Feed with friendly labels', async ({ page }) => {
  await page.route('**/api/events/activity', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ activities: activityRows(), persistence: 'in_memory_preview' }),
  }));

  await startOwnerAndOpenTeam(page);

  await expect(page.getByText('Staff activity', { exact: true })).toBeVisible();
  await expect(page.getByText('What staff recorded')).toBeVisible();
  await expect(page.getByText('Sale', { exact: true })).toBeVisible();
  await expect(page.getByText('Customer paid', { exact: true })).toBeVisible();
  await expect(page.getByText('Added to Dubie', { exact: true })).toBeVisible();
  await expect(page.getByText(/Marta ·/)).toHaveCount(3);
  await expect(page.getByText(/120(?:\.00)? birr/)).toBeVisible();
  await expect(page.getByText(/50(?:\.00)? birr/)).toBeVisible();
  await expect(page.getByText(/95(?:\.00)? birr/)).toBeVisible();
  await expect(page.getByText('Synced').first()).toBeVisible();
  await expect(page.getByText(/not durable backup history yet/i)).toBeVisible();
  await expect(page.getByText('customer_credit')).toHaveCount(0);
});

test('Staff Activity Feed empty state is clear', async ({ page }) => {
  await page.route('**/api/events/activity', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ activities: [], persistence: 'in_memory_preview' }),
  }));

  await startOwnerAndOpenTeam(page);

  await expect(page.getByText('No activity yet')).toBeVisible();
  await expect(page.getByText(/When staff records sales, payments, or Dubie/i)).toBeVisible();
});

test('Staff Activity Feed shows error and retry recovers', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/events/activity', async (route) => {
    calls += 1;
    if (calls === 1) {
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'temporary outage' }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ activities: activityRows().slice(0, 1), persistence: 'in_memory_preview' }),
    });
  });

  await startOwnerAndOpenTeam(page);

  await expect(page.getByText('Could not refresh server activity.')).toBeVisible();
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Added to Dubie')).toBeVisible();
  await expect(page.getByText(/95(?:\.00)? birr/)).toBeVisible();
});
