# Offline & Sync Testing Guide

> Gebya's sync system enables seamless offline-first experience: transactions record locally even offline, then sync automatically when online.

## Overview

The sync system consists of:

| Component | Purpose |
|---|---|
| **IndexedDB Outbox** | Queue for offline transactions |
| **SyncEngine** | Background sync orchestrator |
| **Service Worker** | Background sync when PWA closed |
| **WiFi/Online Detection** | Triggers sync on network restore |

## Key Flows to Test

### 1. Offline Transaction Recording

```
1. User goes offline (disable WiFi/network)
2. Record transaction (sale/credit/etc.)
3. Verify sync_outbox count increases
4. Re-enable network
5. Verify sync happens automatically
6. Verify no "Sign in to sync" button appears
```

### 2. Sign-in Auto-Sync

```
1. User is offline and records transactions
2. User goes online and signs in
3. Verify sync is triggered automatically after auth token is set
4. Verify outbox is drained
5. Verify sync status returns to "idle"
```

### 3. Background Sync (Service Worker)

```
1. User records transaction offline
2. User opens PWA, records another transaction
3. User closes PWA (swipe away/quit)
4. Reopen PWA or wait for background sync
5. Verify transactions synced
```

## Unit Tests

### setAuthToken Auto-Sync Test

```javascript
it('triggers sync after setAuthToken when pending records exist', async () => {
  mockDb.sync_outbox.count.mockResolvedValue(5);
  mockDb.sync_outbox.toArray.mockResolvedValue([
    { table: 'transactions', record_id: 1, key: 'tx1' }
  ]);
  
  const { initSyncEngine, setAuthToken } = await import('../src/utils/syncEngine.js');
  engine = await initSyncEngine();
  
  const syncSpy = vi.spyOn(engine, 'sync');
  
  await setAuthToken('new-token');
  
  // Allow microtask to flush
  await new Promise(resolve => setTimeout(resolve, 10));
  
  expect(syncSpy).toHaveBeenCalled();
});
```

### Online Event Handler Test

```javascript
it('triggers sync on online event when pending records exist', async () => {
  mockDb.sync_outbox.count.mockResolvedValue(3);
  
  engine.pendingCount = 3;
  
  // Simulate online event
  window.dispatchEvent(new Event('online'));
  
  await new Promise(resolve => setTimeout(resolve, 10));
  
  expect(syncSpy).toHaveBeenCalled();
});
```

## E2E Tests with Playwright

### Test Offline Transactions

```typescript
import { test, expect } from '@playwright/test';

test('transactions sync automatically after sign-in', async ({ page }) => {
  // Start offline
  await page.context().setOffline(true);
  
  // Record a transaction
  await seedShop(page);
  await page.goto('/customers');
  await page.click('[data-cy="new-customer"]');
  // ... record transaction
  
  // Verify outbox has pending records
  const outboxCount = await page.evaluate(() => {
    // Access IndexedDB directly
    return new Promise(resolve => { /* ... */ });
  });
  expect(outboxCount).toBeGreaterThan(0);
  
  // Go online
  await page.context().setOffline(false);
  
  // Sign in
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('[type="submit"]');
  
  // Wait for auto-sync
  await page.waitForTimeout(2000);
  
  // Verify sync status is idle
  await expect(page.locator('[data-cy="sync-status"]')).toContainText('Idle');
  
  // Verify "Sign in to sync" button does NOT appear
  await expect(page.locator('text=Sign in to sync')).not.toBeVisible();
});
```

## Manual Testing Checklist

| Scenario | Expected Behavior | Status |
|---|---|---|
| Offline transaction | Records in IndexedDB, shows "Pending sync" | ✅ |
| Online sign-in | Sync triggers automatically | ✅ |
| User goes offline then online | Sync starts immediately | ✅ |
| PWA closed, background sync | Sync runs via SW | ✅ |
| Multiple offline transactions | All sync in batch | ✅ |
| Token expires during sync | 401 triggers auth prompt | ✅ |

## Troubleshooting

| Issue | Possible Cause |
|---|---|
| "Sign in to sync" still appears | Browser cache, not yet deployed |
| Transactions not syncing | Network error, check DevTools Network tab |
| Background sync not firing | SW not controlling page, check `navigator.serviceWorker.controller` |
| Pending count stuck | Server API returning errors, check console logs |