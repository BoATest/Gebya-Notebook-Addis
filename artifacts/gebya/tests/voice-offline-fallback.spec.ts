import { expect, test } from '@playwright/test';

test('voice flow falls back cleanly to typed sale when offline', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeSpeechRecognition {
      lang = 'am-ET';
      interimResults = true;
      maxAlternatives = 1;
      continuous = true;
      onresult = null;
      onerror = null;
      onend = null;

      start() {}
      stop() {}
    }

    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: FakeSpeechRecognition,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }],
        }),
      },
    });

    class FakeMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      constructor() {
        this.state = 'inactive';
        this.mimeType = 'audio/webm';
        this.ondataavailable = null;
      }

      start() {
        this.state = 'recording';
      }

      stop() {
        this.state = 'inactive';
      }

      addEventListener(event, callback, options) {
        if (event === 'stop') {
          setTimeout(() => callback(), 0);
        }
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: FakeMediaRecorder,
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

  await page.evaluate(async () => {
    const request = window.indexedDB.open('GebyaDB');

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('settings', 'readwrite');
      const store = transaction.objectStore('settings');
      store.put({ key: 'intro_seen', value: 'yes' });
      store.put({ key: 'shop_name', value: 'Tigist Shop' });
      store.put({ key: 'shop_phone', value: '' });
      store.put({ key: 'shop_telegram', value: '' });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

    db.close();
  });

  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
  });

  await page.getByRole('button', { name: /speak to record sale/i }).click();
  await expect(page.getByText(/no internet connection/i)).toBeVisible();
  await page.getByRole('button', { name: /type sale instead/i }).click();

  await expect(page.getByRole('button', { name: /save sale/i })).toBeVisible();
  await expect(page.getByPlaceholder(/e\.g\./i)).toBeVisible();
});
