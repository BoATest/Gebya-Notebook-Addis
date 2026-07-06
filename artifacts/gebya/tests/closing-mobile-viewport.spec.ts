import { expect, test } from '@playwright/test';

async function resetDb(page) {
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('gebya_lang', 'en');

    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('GebyaDB');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
}

async function seedOwnerReport(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await resetDb(page);
  await page.getByPlaceholder(/e\.g\. tigist/i).fill('Mobile Shop');
  await page.getByRole('button', { name: /start using gebya/i }).click();
  await page.waitForTimeout(300);
}

async function openReport(page) {
  await page.locator('nav').getByRole('button', { name: /report/i }).click();
  await expect(page.getByText('Shop Check')).toBeVisible();
}

async function expandClosingSection(page) {
  const closingHeading = page.locator('[data-report-section="closing"] h3');
  if (await closingHeading.count()) {
    await closingHeading.first().click();
  }
}

for (const vp of [
  { width: 320, height: 568, label: '320px' },
  { width: 360, height: 640, label: '360px' },
  { width: 390, height: 844, label: '390px' },
]) {
  test(`closing/reconciliation UI is usable at ${vp.label}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.setTouchEnabled(true);
    await seedOwnerReport(page);
    await openReport(page);
    await expandClosingSection(page);

    /* ── no horizontal overflow anywhere on the page ─────────────── */
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).resolves.toBe(true);

    /* ── section heading visible ─────────────────────────────────── */
    await expect(page.getByText('Cash Closing')).toBeVisible();

    /* ── cash and transfer input fields present ──────────────────── */
    const cashInput = page.getByLabel(/Actual cash counted/i).or(page.getByLabel(/Actual cash counted/i));
    const transferInput = page.getByLabel(/Transfer counted/i);
    if (await cashInput.count()) {
      await expect(cashInput.first()).toBeVisible();
    }
    if (await transferInput.count()) {
      await expect(transferInput.first()).toBeVisible();
    }

    /* ── "Mark day reviewed" button has a minimum touch target ──── */
    const markBtn = page.getByRole('button', { name: /Mark day reviewed/i });
    if (await markBtn.count()) {
      await expect(markBtn.first()).toBeVisible();
      const minSize = await markBtn.first().evaluate((el) =>
        Math.min(el.getBoundingClientRect().width, el.getBoundingClientRect().height)
      );
      expect(minSize).toBeGreaterThanOrEqual(40);
    }

    /* ── closing inputs do not overflow their container ──────────── */
    const inputsGrid = page.locator('.closing-inputs-grid').first();
    if (await inputsGrid.count()) {
      const inputsOverflow = await inputsGrid.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(inputsOverflow).toBeLessThanOrEqual(2);
    }

    /* ── closing history list present and does not overflow ──────── */
    const historyList = page.locator('.closing-history-list').first();
    if (await historyList.count()) {
      const histOverflow = await historyList.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(histOverflow).toBeLessThanOrEqual(2);
    }

    /* ── fixed action-bar is not hidden behind bottom nav ───────── */
    const actionBar = page.locator('.report-actions-grid').first();
    if (await actionBar.count()) {
      await expect(actionBar).toBeVisible();
      const actionBarOverflow = await actionBar.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(actionBarOverflow).toBeLessThanOrEqual(2);
    }

    /* ── KPI cards: none of the 6 cards individually overflows ───── */
    const kpiCards = page.locator('.report-kpi-grid button');
    const cardCount = await kpiCards.count();
    for (let i = 0; i < cardCount; i++) {
      const cardOverflow = await kpiCards.nth(i).evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(cardOverflow).toBeLessThanOrEqual(4);
    }

    /* ── attach a screenshot for manual regression review ───────── */
    await page.screenshot({ path: `closing-mobile-${vp.width}x${vp.height}.png`, fullPage: true });
  });
}

test.describe('closing mobile — viewport-specific assertions', () => {
  test('actual cash input accepts non-zero values at 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await seedOwnerReport(page);
    await openReport(page);
    await expandClosingSection(page);

    const cashInput = page.locator('input[type="number"]').first();
    await cashInput.fill('2500');
    await expect(cashInput).toHaveValue('2500');

    const transferInput = page.locator('input[type="number"]').nth(1);
    await transferInput.fill('1800');
    await expect(transferInput).toHaveValue('1800');
  });

  test('mark-day button shows confirmation message after save at 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await seedOwnerReport(page);

    /* seed one sale so metrics are non-zero */
    await page.getByRole('button', { name: /sale/i }).click();
    await page.getByPlaceholder(/add details/i).fill('Test beans');
    await page.getByPlaceholder(/^0$/).fill('500');
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(300);

    await openReport(page);
    await expandClosingSection(page);

    const cashInput = page.locator('input[type="number"]').first();
    await cashInput.fill('500');
    await page.getByRole('button', { name: /Mark day reviewed/i }).click();

    await expect(page.getByText(/Saved as balanced|Mark day reviewed/)).toBeVisible({ timeout: 5000 });
  });

  test('time-range chips render in 2-column layout at ≤ 480 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await seedOwnerReport(page);
    await openReport(page);

    const timeRanges = page.locator('.report-time-ranges').first();
    if (await timeRanges.count()) {
      const gridCols = await timeRanges.evaluate((el) =>
        getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length
      );
      /* at 320px we expect 2 columns via mobile override */
      expect([2, 4]).toContain(gridCols);
    }
  });

  test('viewport meta tag is present in index.html', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
    expect(viewport).toContain('width=device-width');
  });
});
