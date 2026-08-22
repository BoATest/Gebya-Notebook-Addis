# Mobile Viewport & Cross-Browser Testing

> The generic template mentions **iOS XCTest** and **Android Espresso** for
> native mobile testing. Gebya is a **PWA** — it runs in the browser on iOS
> Safari and Android Chrome. We test every mobile scenario with **Playwright**,
> which can emulate both mobile viewports and real mobile browsers via
> device descriptors.

## Table of Contents

- [When to Use](#when-to-use)
- [Device Emulation](#device-emulation)
- [Touch Interaction Testing](#touch-interaction-testing)
- [Mobile-Specific Assertions](#mobile-specific-assertions)
- [Cross-Browser Testing](#cross-browser-testing)

## When to Use

- When laying out the Credit tab on phones ≤ 390 px width
- When testing the "sticky bottom" layout of ReminderSheet on mobile
- When the shopkeeper uses the bottom navigation bar on a small screen
- When verifying PWA install banner / "Add to Home Screen"
- When testing photo capture (camera permissions, file input) on mobile

## Device Emulation

Playwright ships with built-in mobile device descriptors:

```ts
import { devices } from '@playwright/test';

// These are already in playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

Run on a specific device:

```bash
pnpm test:e2e -- --project="Mobile Chrome"
```

## Touch Interaction Testing

```ts
test('Send Reminder button is tappable on mobile', async ({ page }) => {
  // Simulate a real tap (not just a click)
  await page.getByRole('button', { name: /send reminder/i }).tap();
  await expect(page.locator('text=Sending…')).toBeVisible({ timeout: 2000 });
});
```

## Mobile-Specific Assertions

```ts
test('credit balance block fits on 375px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await page.getByRole('button', { name: /credit/i }).click();

  const balanceBlock = page.locator('#balanceBlock');
  const box = await balanceBlock.boundingBox();
  // Should not overflow the screen
  expect(box.x + box.width).toBeLessThanOrEqual(375);
});
```

## Cross-Browser Testing

Gebya targets:

| Platform | Browser | Test status |
|---|---|---|
| Android | Chrome (Chromium) | ✅ Playwright Chromium |
| iOS | Safari | ✅ Playwright WebKit |
| Desktop | Chrome / Edge | ✅ Playwright Chromium |
| Desktop | Firefox | ✅ Playwright Firefox |
| Desktop | Safari (macOS) | ✅ Playwright WebKit |

Add browser projects to `playwright.config.ts`:

```ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
],
```

## Best Practices

- ✅ Test on at least one mobile viewport for every new UI component
- ✅ Use `.tap()` instead of `.click()` for touch targets
- ✅ Verify minimum touch target size (44×44 px per WCAG)
- ✅ Test both portrait and landscape on at least one device
- ✅ Use `page.addInitScript()` to set `localStorage` language before first render
- ❌ Don't hardcode pixel values — use relative selectors and `boundingBox`
- ❌ Don't test native iOS/Android APIs (PWA has no access)