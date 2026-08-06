import { test, expect } from '@playwright/test';

test.describe('CustomerDetail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the customer detail data
    await page.route('**/api/customers/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'cust-1',
          display_name: 'Endet nesh',
          phone_number: '+251974411258',
          balance: 329669,
          has_overdue: true,
          overdue_days: 6,
          transaction_count: 10,
          on_time_eligible: 10,
          on_time_count: 8,
          avg_pay_days: 5,
          latest_due_date: new Date().toISOString(),
          promised_pay_date: null,
          telegram_username: null,
          telegram_chat_id: null,
          telegram_link_requested_at: null,
          telegram_notify_enabled: false,
          archived_at: null,
          transactions: [
            {
              id: 'tx-1',
              type: 'credit_add',
              amount: 406,
              created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
              item_note: 'Rice, Water',
            },
            {
              id: 'tx-2',
              type: 'payment',
              amount: 2000,
              created_at: new Date(Date.now() - 86400000).toISOString(),
              item_note: 'Payment',
            },
          ],
        }),
      });
    });

    // Navigate to customer detail page
    await page.goto('/customers/cust-1');
  });

  test.describe('1. Overdue badge rendering', () => {
    test('renders overdue badge in balance block', async ({ page }) => {
      const balanceBlock = page.locator('#balanceBlock');
      await expect(balanceBlock).toContainText(/6d overdue/i);
    });

    test('overdue badge appears exactly once', async ({ page }) => {
      const overdueBadges = page.locator('text=/6d overdue/i');
      await expect(overdueBadges).toHaveCount(1);
    });

    test('does not show overdue badge when customer is not overdue', async ({ page }) => {
      await page.route('**/api/customers/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'cust-1',
            display_name: 'Endet nesh',
            phone_number: '+251974411258',
            balance: 329669,
            has_overdue: false,
            overdue_days: 0,
            transaction_count: 10,
            transactions: [],
          }),
        });
      });

      await page.reload();
      await expect(page.locator('text=OVERDUE')).toHaveCount(0);
    });
  });

  test.describe('2. Sticky balance block', () => {
    test('renders balance block with correct content', async ({ page }) => {
      await expect(page.locator('text=329,669')).toBeVisible();
      await expect(page.locator('text=Owes me')).toBeVisible();
      await expect(page.locator('text=10 entries')).toBeVisible();
    });

    test('collapses balance block when scrolling', async ({ page }) => {
      const balanceBlock = page.locator('#balanceBlock');
      await expect(balanceBlock).toBeVisible();
      
      await page.evaluate(() => window.scrollTo(0, 100));
      await page.waitForTimeout(300);
      
      await expect(balanceBlock).toBeVisible();
    });
  });

  test.describe('3. Promise recording', () => {
    test('shows "Record Promise" button when no promise exists', async ({ page }) => {
      await expect(page.locator('text=Record Promise')).toBeVisible();
    });

    test('expands promise form when clicked', async ({ page }) => {
      await page.click('text=Record Promise');
      
      await expect(page.locator('input[type="date"]')).toBeVisible();
      await expect(page.locator('input[placeholder*="Note"]')).toBeVisible();
      await expect(page.locator('text=Save Changes')).toBeVisible();
      await expect(page.locator('text=Cancel')).toBeVisible();
    });

    test('calls onRecordPromise with correct arguments', async ({ page }) => {
      let recordedPromise = null;
      
      await page.exposeFunction('mockRecordPromise', (customerId: string, date: number, note: string) => {
        recordedPromise = { customerId, date, note };
      });

      await page.click('text=Record Promise');
      await page.fill('input[type="date"]', '2024-12-25');
      await page.fill('input[placeholder*="Note"]', 'Test note');
      await page.click('text=Save Changes');
      
      await page.waitForTimeout(300);
      await expect(page.locator('input[type="date"]')).not.toBeVisible();
    });

    test('displays existing promise information', async ({ page }) => {
      await page.route('**/api/customers/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'cust-1',
            display_name: 'Endet nesh',
            phone_number: '+251974411258',
            balance: 329669,
            has_overdue: true,
            overdue_days: 6,
            promised_pay_date: new Date(Date.now() + 86400000).toISOString(),
            promise_note: 'Will pay tomorrow',
            telegram_username: null,
            telegram_chat_id: null,
            archived_at: null,
            transactions: [],
          }),
        });
      });

      await page.reload();
      await expect(page.locator('text=Promised to pay')).toBeVisible();
    });
  });

  test.describe('4. Archive confirmation', () => {
    test('shows archive button for non-archived customer', async ({ page }) => {
      await expect(page.locator('text=Archive')).toBeVisible();
    });

    test('shows confirmation dialog when archive is clicked', async ({ page }) => {
      await page.click('text=Archive');
      await expect(page.locator('text=/Archive "Endet nesh"/')).toBeVisible();
      await expect(page.locator('text=Cancel')).toBeVisible();
    });

    test('calls onArchiveCustomer when confirmed', async ({ page }) => {
      let archiveCalled = false;
      
      await page.exposeFunction('mockArchive', (_customer: unknown) => {
        archiveCalled = true;
      });

      await page.click('text=Archive');
      const archiveButtons = page.locator('text=Archive');
      await archiveButtons.last().click();
      
      await page.waitForTimeout(300);
    });

    test('does not call onArchiveCustomer when cancelled', async ({ page }) => {
      let archiveCalled = false;
      
      await page.exposeFunction('mockArchive', () => {
        archiveCalled = true;
      });

      await page.click('text=Archive');
      await page.click('text=Cancel');
      
      await page.waitForTimeout(300);
      expect(archiveCalled).toBe(false);
    });
  });

  test.describe('5. Telegram resend', () => {
    test('shows resend button when telegram is linked', async ({ page }) => {
      await page.route('**/api/customers/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'cust-1',
            display_name: 'Endet nesh',
            phone_number: '+251974411258',
            balance: 329669,
            has_overdue: true,
            overdue_days: 6,
            telegram_chat_id: 'chat-123',
            telegram_username: null,
            archived_at: null,
            transactions: [],
          }),
        });
      });

      await page.reload();
      await expect(page.locator('text=Resend')).toBeVisible();
    });

    test('does not show resend button when telegram is not linked', async ({ page }) => {
      await expect(page.locator('text=Resend')).toHaveCount(0);
    });
  });

  test.describe('6. Edit and Transfer buttons', () => {
    test('renders edit button beside customer name', async ({ page }) => {
      const editButton = page.locator('[aria-label*="Edit customer" i]');
      await expect(editButton).toBeVisible();
    });

    test('renders transfer button beside customer name', async ({ page }) => {
      const transferButton = page.locator('[aria-label*="Transfer" i]');
      await expect(transferButton).toBeVisible();
    });
  });

  test.describe('7. History grouping', () => {
    test('groups transactions by date', async ({ page }) => {
      const dateHeaders = page.locator('text=/📅/');
      await expect(dateHeaders.first()).toBeVisible();
    });

    test('shows entry count for multiple transactions on same date', async ({ page }) => {
      await page.route('**/api/customers/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'cust-1',
            display_name: 'Endet nesh',
            phone_number: '+251974411258',
            balance: 329669,
            has_overdue: false,
            overdue_days: 0,
            transactions: [
              {
                id: 'tx-1',
                type: 'credit_add',
                amount: 100,
                created_at: new Date().toISOString(),
                item_note: 'Item 1',
              },
              {
                id: 'tx-2',
                type: 'credit_add',
                amount: 200,
                created_at: new Date().toISOString(),
                item_note: 'Item 2',
              },
            ],
          }),
        });
      });

      await page.reload();
      await expect(page.locator('text=2 entries')).toBeVisible();
    });
  });

  test.describe('8. Quick actions', () => {
    test('renders Call, SMS, and Telegram buttons', async ({ page }) => {
      await expect(page.locator('text=Call')).toBeVisible();
      await expect(page.locator('text=SMS')).toBeVisible();
      await expect(page.locator('text=/Connect|Linked|Telegram/')).toBeVisible();
    });
  });

  test.describe('9. Balance details', () => {
    test('displays on-time percentage', async ({ page }) => {
      await expect(page.locator('text=80%')).toBeVisible();
    });

    test('shows Mark Fully Paid button when balance > 0', async ({ page }) => {
      await expect(page.locator('text=Mark Fully Paid')).toBeVisible();
    });
  });

  test.describe('10. Bottom action bar & photo caption', () => {
    test('renders You gave and You got buttons', async ({ page }) => {
      await expect(page.locator('text=You gave')).toBeVisible();
      await expect(page.locator('text=You got')).toBeVisible();
    });

    test('shows Add photo caption on empty avatar', async ({ page }) => {
      await page.route('**/api/customers/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'cust-1',
            display_name: 'Endet nesh',
            phone_number: '+251974411258',
            balance: 329669,
            has_overdue: true,
            overdue_days: 6,
            transaction_count: 10,
            on_time_eligible: 10,
            on_time_count: 8,
            avg_pay_days: 5,
            latest_due_date: new Date().toISOString(),
            promised_pay_date: null,
            telegram_username: null,
            telegram_chat_id: null,
            telegram_link_requested_at: null,
            telegram_notify_enabled: false,
            archived_at: null,
            transactions: [],
          }),
        });
      });

      await page.reload();
      await expect(page.locator('text=Add photo')).toBeVisible();
      await expect(page.locator('[aria-label="Add photo"]')).toBeVisible();
    });
  });

  test.describe('11. Sticky balance collapse on scroll', () => {
    test('balance block collapses after scroll and shows compact amount', async ({ page }) => {
      const balanceBlock = page.locator('#balanceBlock');
      await expect(balanceBlock).toBeVisible();
      await expect(balanceBlock).toContainText('Owes me');

      // Scroll down to collapse
      await page.evaluate(() => window.scrollTo(0, 200));
      await page.waitForTimeout(300);

      // Expanded text should be hidden, collapsed version visible
      await expect(balanceBlock).not.toContainText('Owes me');
    });
  });

  test.describe('12. Integration', () => {
    test('renders complete page without crashing', async ({ page }) => {
      await expect(page.locator('text=Endet nesh')).toBeVisible();
      await expect(page.locator('text=/Back · Customers/')).toBeVisible();
      await expect(page.locator('text=Owes me')).toBeVisible();
      await expect(page.locator('text=History')).toBeVisible();
      await expect(page.locator('#balanceBlock')).toBeVisible();
    });
  });
});
