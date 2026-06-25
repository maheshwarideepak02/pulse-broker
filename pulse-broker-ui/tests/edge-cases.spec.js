import { test, expect } from '@playwright/test';
import { loginToApp } from './test-utils';

test.describe('Edge Cases & Robustness', () => {

  test('UI gracefully handles 500 Internal Server Error when saving deal', async ({ page }) => {
    await loginToApp(page);

    await page.route('**/api/contacts', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Mock Purchaser Contact' }, { id: 2, name: 'Mock Seller Contact' }])
    }));
    await page.route('**/api/firms', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 10, name: 'Mock Purchaser Firm', contact: { id: 1 } }, { id: 20, name: 'Mock Seller Firm', contact: { id: 2 } }])
    }));
    await page.route('**/api/items', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 100, name: 'Mock Item' }])
    }));
    await page.route('**/api/markas', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1000, name: 'Mock Marka' }])
    }));

    // 3. Mock the POST /deals to fail with 500
    await page.route('**/api/deals', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Simulated Database Failure' })
        });
      } else {
        route.fallback();
      }
    });

    const isMobile = page.viewportSize().width < 1024;
    await page.getByTestId(isMobile ? 'nav-mobile-new-deal' : 'nav-new-deal').click();

    await page.selectOption('select[name="purchaserContactId"]', '1');
    await page.selectOption('select[name="purchaserId"]', '10');
    await page.selectOption('select[name="sellerContactId"]', '2');
    await page.selectOption('select[name="sellerId"]', '20');
    await page.selectOption('select[name="itemId"]', '100');
    await page.selectOption('select[name="markaId"]', '1000');

    // 4. Fill form with valid data
    await page.fill('input[name="weight"]', '100');
    await page.fill('input[name="rate"]', '5000');

    // 5. Submit the form
    await page.getByTestId('submit-deal-btn').click();

    // 6. Assert UI does not crash and shows Toast
    const toast = page.locator('text=Simulated Database Failure');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('Ledger gracefully handles corrupted NaN/Null payloads from backend', async ({ page }) => {
    await loginToApp(page);

    // Mock Contacts with Margins API
    await page.route('**/api/contacts/with-margins', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 999, name: 'Buggy Purchaser' }
      ])
    }));

    // Mock Ledger to return malformed numeric data
    await page.route('**/api/deals/margins/*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 999,
          dealDate: '2023-01-01',
          purchaser: { name: 'Buggy Purchaser' },
          seller: { name: 'Buggy Seller' },
          item: { name: 'Item' },
          marka: { name: 'Marka' },
          weight: null,         // NULL!
          rate: -5000,          // Negative
          marginMarkup: "NaN",  // String NaN
          status: 'PENDING'
        }
      ])
    }));

    const isMobile = page.viewportSize().width < 1024;
    if (isMobile) await page.getByTestId('nav-mobile-more').click();
    await page.getByTestId(isMobile ? 'nav-mobile-margins' : 'nav-margins').click();

    await page.selectOption('select', '999');

    await expect(page.locator('h2', { hasText: 'Pending Ledger' })).toBeVisible();
  });

});
