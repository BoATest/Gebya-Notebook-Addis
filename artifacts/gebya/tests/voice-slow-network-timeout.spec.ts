import { expect, test } from '@playwright/test';

test('voice flow shows the slow-network timeout message when transcript parsing takes too long', async ({ page }) => {
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

    globalThis.SpeechRecognition = FakeSpeechRecognition;
    globalThis.webkitSpeechRecognition = FakeSpeechRecognition;

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
        this._stopHandlers = [];
      }

      start() {
        this.state = 'recording';
      }

      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({
          data: new Blob(['voice sample'], { type: 'audio/webm' }),
        });
        setTimeout(() => {
          this._stopHandlers.forEach((handler) => handler());
        }, 0);
      }

      addEventListener(event, callback) {
        if (event === 'stop') {
          this._stopHandlers.push(callback);
        }
      }
    }

    globalThis.MediaRecorder = FakeMediaRecorder;
  });

  await page.route('**/api/transcribe', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 12000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        transcript: 'two hundred birr',
        detected_total: 200,
      }),
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

  await page.getByRole('button', { name: /speak to record sale/i }).click();
  const startVoiceButton = page.getByRole('button', { name: /start voice recording/i });
  if (await startVoiceButton.waitFor({ state: 'visible', timeout: 1000 }).then(() => true).catch(() => false)) {
    await startVoiceButton.click();
  }
  await page.getByRole('button', { name: /^stop$/i }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: /^stop$/i }).click();

  await expect(page.getByText(/the connection is slow\. you can retry or type the sale instead\./i)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('button', { name: /type sale/i })).toBeVisible();
});
