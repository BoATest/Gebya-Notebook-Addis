/**
 * POST /shops phone-takeover guard — the client half.
 *
 * The server answers 409 PHONE_ALREADY_REGISTERED when an unauthenticated
 * "create my shop" request names a phone that already belongs to an account
 * (business-legacy.ts). What this screen does with that 409 is what locks:
 *
 *   1. The refusal must be shown. The bare `catch` used to route EVERY failure
 *      into the offline fallback, so a 409 produced an "offline" toast, stamped
 *      the owner role, wrote intro_seen and dropped the person into a local-only
 *      notebook that could never sync — while their real notebook sat under the
 *      number they had just typed. A refusal dressed as an outage is the exact
 *      data-loss trust failure this product cannot afford.
 *   2. Nothing may be persisted on refusal: no intro_seen, no shell, no owner
 *      stamp. The form has to stay open because no shop exists yet.
 *   3. "Continue without number" retries with the phone dropped. The guard only
 *      fires on a registered number, so the server creates a phoneless owner and
 *      returns a working token — a real cloud notebook, not a dead end.
 *
 * Runs against the built app:
 *   pnpm build && node scripts/run-playwright-isolated.mjs 4189 \
 *     tests/onboarding-phone-conflict.spec.ts --project=chromium
 */
import { expect, test } from '@playwright/test';

const CONFLICT_BODY = JSON.stringify({
  error: 'This phone number is already registered. Please sign in instead.',
  code: 'PHONE_ALREADY_REGISTERED',
});

const CREATED_BODY = JSON.stringify({
  shop_id: 'p9-shop',
  shop_name: 'Selam Shop',
  join_code: 'P9CODE12',
  join_url: 'http://127.0.0.1:4173/?join=P9CODE12',
  device_id: 'p9-device',
  device_token: 'p9-token',
  staff_id: 'p9-staff',
  display_name: 'Selam Shop',
  role: 'owner',
  permissions: {},
  device_status: 'active',
  phone_required: false,
  approval_required: false,
});

/** Reads a row from Dexie's settings table (keyPath 'key'), bypassing the app. */
function readSetting(page, key) {
  return page.evaluate((settingKey) => new Promise((resolve) => {
    const open = window.indexedDB.open('GebyaDB');
    open.onsuccess = () => {
      const database = open.result;
      if (!database.objectStoreNames.contains('settings')) { database.close(); resolve(undefined); return; }
      const tx = database.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get(settingKey);
      req.onsuccess = () => { database.close(); resolve(req.result?.value); };
      req.onerror = () => { database.close(); resolve(undefined); };
    };
    open.onerror = () => resolve(undefined);
  }), key);
}

/** Wipes local identity so the run starts on the onboarding choice screen. */
async function freshApp(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const request = window.indexedDB.deleteDatabase('GebyaDB');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/select account type/i)).toBeVisible();
  await page.getByRole('button', { name: /shop owner/i }).click();
  await expect(page.getByPlaceholder('Enter your name')).toBeVisible();
  await page.getByPlaceholder('Enter your name').fill('Selam Shop');
  await page.getByPlaceholder('912345678').fill('912345678');
}

test('a registered phone number is refused, not reported as an offline save', async ({ page }) => {
  await page.addInitScript(() => { window.localStorage.setItem('gebya_lang', 'en'); });

  await page.route('**/api/shops', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({ status: 409, contentType: 'application/json', body: CONFLICT_BODY });
  });

  await freshApp(page);
  await page.getByRole('button', { name: /start using gebya|start/i }).click();

  // The reason is on screen, in the form, next to the field that caused it.
  await expect(page.getByText(/already registered/i)).toBeVisible();
  // It must not be dressed up as a connectivity problem.
  await expect(page.getByText(/saved on this phone/i)).toHaveCount(0);
  // Nothing was created: still on the form, no shell, no intro_seen, no stamp.
  await expect(page.getByPlaceholder('Enter your name')).toBeVisible();
  await expect(page.locator('nav')).toHaveCount(0);
  expect(await readSetting(page, 'intro_seen')).toBeUndefined();
  expect(await readSetting(page, 'cached_permissions')).toBeUndefined();
});

test('continuing without the number creates a real shop and signs the owner in', async ({ page }) => {
  await page.addInitScript(() => { window.localStorage.setItem('gebya_lang', 'en'); });

  const bodies = [];
  let answer = 'conflict';
  await page.route('**/api/shops', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    bodies.push(JSON.parse(route.request().postData() ?? '{}'));
    return answer === 'conflict'
      ? route.fulfill({ status: 409, contentType: 'application/json', body: CONFLICT_BODY })
      : route.fulfill({ status: 201, contentType: 'application/json', body: CREATED_BODY });
  });
  await page.route('**/api/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      user: { id: 'p9-staff', display_name: 'Selam Shop' },
      role: 'owner',
      permissions: {},
      businesses: [{ business_id: 'p9-shop', name: 'Selam Shop' }],
    }),
  }));
  await page.route('**/api/auth/refresh', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'p9-token' }),
  }));

  await freshApp(page);
  await page.getByRole('button', { name: /start using gebya|start/i }).click();
  await expect(page.getByText(/already registered/i)).toBeVisible();

  answer = 'ok';
  await page.getByRole('button', { name: /continue without number/i }).click();

  // The retry drops the number entirely (JSON.stringify omits undefined keys),
  // which is what lets the server mint a fresh phoneless owner instead of
  // colliding with the account that already holds it.
  expect(bodies).toHaveLength(2);
  expect(bodies[0].phone).toBe('+251912345678');
  expect(bodies[1].phone).toBeUndefined();

  // And the person lands in a real notebook — owner, not local-only guest.
  await expect(page.getByText(/selam shop/i).first()).toBeVisible();
  await expect(page.locator('nav').getByRole('button', { name: /today/i })).toBeVisible();
  await expect(page.getByText(/saved on this phone/i)).toHaveCount(0);
  expect(await readSetting(page, 'intro_seen')).toBe('yes');
});

test('changing the number clears the refusal and the field', async ({ page }) => {
  await page.addInitScript(() => { window.localStorage.setItem('gebya_lang', 'en'); });

  await page.route('**/api/shops', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return route.fulfill({ status: 409, contentType: 'application/json', body: CONFLICT_BODY });
  });

  await freshApp(page);
  await page.getByRole('button', { name: /start using gebya|start/i }).click();
  await expect(page.getByText(/already registered/i)).toBeVisible();

  await page.getByRole('button', { name: /change number/i }).click();
  await expect(page.getByText(/already registered/i)).toHaveCount(0);
  await expect(page.getByPlaceholder('912345678')).toHaveValue('');
});

