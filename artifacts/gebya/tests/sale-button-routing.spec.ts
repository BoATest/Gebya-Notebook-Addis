import { expect, test, type Page } from '@playwright/test';

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

test('Itemized button opens the itemized sale view and Simple button opens the simple sale form', async ({ page }) => {
  await resetFreshOrigin(page);

  await page.getByRole('button', { name: /shop owner/i }).click();
  await page.getByPlaceholder('Enter your name').fill('Tigist');
  await page.getByRole('button', { name: /^start$/i }).click();
  await expect(page.getByRole('button', { name: /^itemized$/i })).toBeVisible();

  // Green "Itemized" button opens the itemized sale recorder.
  await page.getByRole('button', { name: /^itemized$/i }).click();
  await expect(page.getByText('New Sale')).toBeVisible();
  await page.getByRole('button', { name: /back/i }).click();
  await expect(page.getByText('New Sale')).toBeHidden();

  // Amber "Simple" button opens the quick simple sale form.
  await page.getByRole('button', { name: /^simple$/i }).click();
  await expect(page.getByText('+ Sale')).toBeVisible();
  await expect(page.getByPlaceholder(/add details/i)).toBeVisible();
  await page.getByRole('button', { name: /back/i }).click();
  await expect(page.getByText('+ Sale')).toBeHidden();
});