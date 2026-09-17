import { expect, test } from '@playwright/test';

test('first-run onboarding is lean and deterministic', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('gebya_lang', 'en');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase('GebyaDB');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/select account type|የአጠቃቀም አይነት ይምረጡ/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /shop owner|የሱቅ ባለቤት የራስዎን ማስታወሻ ይፍጠሩ/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /join a shop|ሱቅ ይቀላቀሉ እንደ ሰራተኛ ይገናኙ/i })).toBeVisible();
  await page.getByRole('button', { name: /shop owner|የሱቅ ባለቤት የራስዎን ማስታወሻ ይፍጠሩ/i }).click();
  await expect(page.getByPlaceholder('Enter your name')).toBeVisible();
  await expect(page.getByText(/simple notebook for sales, spending, and dubie/i)).toBeVisible();
  await expect(page.getByText(/start with your name only/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /start using gebya|rocket start using gebya|ጀምር|start/i })).toBeVisible();
  await page.getByPlaceholder('Enter your name').fill('Tigist Shop');
  await page.getByRole('button', { name: /start using gebya|rocket start using gebya|ጀምር|start/i }).click();
  await expect(page.getByText(/tigist shop/i)).toBeVisible();
  await expect(page.locator('nav').getByRole('button', { name: /today/i })).toBeVisible();
  await expect(page.getByText(/start your notebook|select account type|የአጠቃቀም አይነት ይምረጡ/i)).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/tigist shop/i)).toBeVisible();
  await expect(page.getByText(/start your notebook|select account type|የአጠቃቀም አይነት ይምረጡ/i)).toHaveCount(0);
});

async function mockOwnerIdentity(page) {
  await page.route('**/api/shops', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ shop_id: 'gatec-shop', shop_name: 'Gate C Shop', join_code: 'GATEC12', join_url: 'http://127.0.0.1:4173/?join=GATEC12', device_id: 'gatec-device', device_token: 'gatec-token', staff_id: 'gatec-staff', display_name: 'Gate C Shop', role: 'owner', permissions: {}, device_status: 'active', phone_required: false, approval_required: false }) });
  });
  await page.route('**/api/me', async (route) => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'gatec-staff', display_name: 'Gate C Shop' }, role: 'owner', permissions: {}, businesses: [{ business_id: 'gatec-shop', name: 'Gate C Shop' }] }) });
  });
  await page.route('**/api/auth/refresh', async (route) => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'gatec-token' }) });
  });
}

/**
 * Gate C — the race, not the reload.
 *
 * Root cause: usePermissionsStore boots at { permissions: null, role: null }.
 * hasPermission() then falls through to STAFF_MINIMAL_SAFE (can_add_records
 * only), so a brand-new owner rendered staff-fallthrough surfaces — STAFF
 * label, Reports off, no owner/admin section — until an unrelated auth
 * refresh happened to land. The fix is stampOwnerPermissions() in
 * OnboardingScreen.jsx, which writes role:'owner' the moment onboarding
 * succeeds, BEFORE onComplete() hands control to the shell.
 *
 * This test holds `/api/me` open on purpose. If owner state could only arrive
 * from the auth path, then nothing can be owner while /api/me is still
 * pending, and step 3 below fails.
 *
 * MUTATION CHECK: delete the two stampOwnerPermissions() calls in
 * OnboardingScreen.jsx and this test MUST go red at step 3.
 */
test('Gate C: owner is stamped same-session (before /api/me) and never downgraded', async ({ page }) => {
  // Node-side gate: /api/me stays unanswered until releaseMe() is called.
  let releaseMe: () => void = () => {};
  const meLanded = new Promise<void>((resolve) => { releaseMe = resolve; });

  await page.addInitScript(() => {
    window.localStorage.setItem('gebya_lang', 'en');
  });
  await page.route('**/api/shops', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ shop_id: 'gatec-shop', shop_name: 'Gate C Shop', join_code: 'GATEC12', join_url: 'http://127.0.0.1:4173/?join=GATEC12', device_id: 'gatec-device', device_token: 'gatec-token', staff_id: 'gatec-staff', display_name: 'Gate C Shop', role: 'owner', permissions: {}, device_status: 'active', phone_required: false, approval_required: false }) });
  });
  await page.route('**/api/auth/refresh', async (route) => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'gatec-token' }) });
  });
  // The auth path that could otherwise mask the bug — deliberately held open.
  await page.route('**/api/me', async (route) => {
    await meLanded;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'gatec-staff', display_name: 'Gate C Shop' }, role: 'owner', permissions: {}, businesses: [{ business_id: 'gatec-shop', name: 'Gate C Shop' }] }) });
  });

  // setPermissions() mirrors in-memory state into db.settings['cached_permissions'].
  // That row is the ONLY source the cold-boot loader can read synchronously at
  // first render, so it is the honest place to observe who the user is.
  const readStampedPermissions = () => page.evaluate(async () => {
    return await new Promise<{ value?: { role?: string | null; permissions?: Record<string, boolean> } } | null>((resolve) => {
      const open = window.indexedDB.open('GebyaDB');
      open.onerror = () => resolve(null);
      open.onsuccess = () => {
        const database = open.result;
        if (!database.objectStoreNames.contains('settings')) { database.close(); resolve(null); return; }
        const req = database.transaction('settings', 'readonly').objectStore('settings').get('cached_permissions');
        req.onsuccess = () => { database.close(); resolve(req.result ?? null); };
        req.onerror = () => { database.close(); resolve(null); };
      };
    });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase('GebyaDB');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  // 1 - pick "Shop Owner".
  await expect(page.getByText(/select account type/i)).toBeVisible();
  await page.getByRole('button', { name: /shop owner/i }).click();

  // 2 - name + start. POST /api/shops resolves; /api/me deliberately does NOT.
  await expect(page.getByPlaceholder('Enter your name')).toBeVisible();
  await page.getByPlaceholder('Enter your name').fill('Gate C Shop');
  await page.getByRole('button', { name: /start using gebya|start/i }).click();
  await expect(page.getByText(/gate c shop/i)).toBeVisible();

  // 3 - OWNER STATE IS LIVE WHILE /api/me IS STILL PENDING.
  //     meLanded has NOT been released. This is the assertion the bug fails:
  //     without stampOwnerPermissions() the store stays {null, null} here and
  //     nothing can write role:owner into cached_permissions.
  await expect
    .poll(async () => (await readStampedPermissions())?.value?.role ?? null, {
      timeout: 5000,
      message: 'owner must be stamped in the SAME session, with /api/me still pending',
    })
    .toBe('owner');

  // The stamped payload must be the owner defaults, not an empty object - the
  // whole point is that can_edit_settings / can_view_reports / can_manage_team
  // are TRUE from the first render.
  await expect
    .poll(async () => (await readStampedPermissions())?.value?.permissions?.can_edit_settings ?? null, {
      timeout: 5000,
      message: 'stamped owner must carry OWNER_FULL_ACCESS, not STAFF_MINIMAL_SAFE',
    })
    .toBe(true);

  await expect
    .poll(async () => (await readStampedPermissions())?.value?.permissions?.can_view_reports ?? null, {
      timeout: 5000,
      message: 'Reports must be ON for a brand-new owner in the first session',
    })
    .toBe(true);

  // Owner surfaces render in the same session.
  await expect(page.locator('nav').getByRole('button', { name: /today/i })).toBeVisible();
  await expect(page.locator('nav').getByRole('button', { name: /(^|\s)Staff(\s|$)/i })).toBeVisible();

  // 4 - release auth. /api/me now answers as owner: assert NO downgrade.
  releaseMe();
  await expect(page.locator('nav').getByRole('button', { name: /(^|\s)Staff(\s|$)/i })).toBeVisible();
  await expect(page.getByText(/gate c shop/i)).toBeVisible();
  await expect(page.getByText(/start your notebook|select account type/i)).toHaveCount(0);
  await expect
    .poll(async () => (await readStampedPermissions())?.value?.role ?? null, { timeout: 5000 })
    .toBe('owner');

  // 5 - returning owner: reload must not drop back to staff fall-through.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('nav').getByRole('button', { name: /(^|\s)Staff(\s|$)/i })).toBeVisible();
  await expect(page.getByText(/gate c shop/i)).toBeVisible();
  await expect
    .poll(async () => (await readStampedPermissions())?.value?.role ?? null, { timeout: 5000 })
    .toBe('owner');
});
