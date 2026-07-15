import { test, expect } from '@playwright/test';

test('debug seed and reload', async ({ page }) => {
  // Capture console BEFORE any navigation
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  await page.addInitScript(() => localStorage.setItem('gebya_lang', 'en'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Seed the DB
  await page.evaluate(async () => {
    const request = window.indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('DB version:', db.version);
    console.log('Object stores:', Array.from(db.objectStoreNames));

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key: 'shop_name', value: 'Photo Proof Shop' });
      tx.objectStore('settings').put({ key: 'shop_phone', value: '' });
      tx.objectStore('settings').put({ key: 'shop_business_type', value: 'retail-shop' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    db.close();
  });

  // Reload
  await page.reload({ waitUntil: 'domcontentloaded' });

  // Wait for loadData to finish
  await page.waitForTimeout(10000);

  // Check what's on the page
  const bodyText = await page.locator('body').innerText();
  console.log('=== PAGE TEXT AFTER RELOAD ===');
  console.log(bodyText.substring(0, 500));

  // Check for onboarding
  const onboardingVisible = await page.getByText('Select Account Type').isVisible().catch(() => false);
  console.log('Onboarding visible:', onboardingVisible);

  // Check IndexedDB state after reload
  const dbState = await page.evaluate(async () => {
    const request = window.indexedDB.open('GebyaDB');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const settings = await new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    let identity: any = null;
    try {
      identity = await new Promise<any>((resolve, reject) => {
        const tx = db.transaction('identity', 'readonly');
        const req = tx.objectStore('identity').get('me');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch (e: any) {
      identity = 'ERROR: ' + e.message;
    }

    db.close();
    return { settings, identity, stores: Array.from(db.objectStoreNames) };
  });

  console.log('=== DB STATE AFTER RELOAD ===');
  console.log('Stores:', dbState.stores);
  console.log('Settings:', JSON.stringify(dbState.settings));
  console.log('Identity:', JSON.stringify(dbState.identity));

  // Print console messages
  console.log('=== CONSOLE MESSAGES ===');
  for (const msg of consoleMessages) {
    console.log(msg);
  }
});
