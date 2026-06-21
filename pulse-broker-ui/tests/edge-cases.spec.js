import { test, expect } from '@playwright/test';

test.describe('Edge Cases & Robustness', () => {

  test('UI gracefully handles 500 Internal Server Error when saving deal', async ({ page }) => {
    await page.goto('/');
    
    // Quick robust login
    const isSetup = await page.locator('text=4-अंकों का पिन सेट करें').isVisible() || await page.locator('text=Create a 4-digit PIN').isVisible();
    if (!isSetup) {
      await page.locator('button', { hasText: /^1$/ }).click();
      await page.locator('button', { hasText: /^2$/ }).click();
      await page.locator('button', { hasText: /^3$/ }).click();
      await page.locator('button', { hasText: /^4$/ }).click();
      try {
          await page.waitForURL(/.*\/app\/dashboard/, { timeout: 3000 });
      } catch (e) {
          const resetBtn = page.locator('button', { hasText: /Reset PIN|पिन रीसेट करें/ });
          await resetBtn.waitFor({ state: 'visible' });
          await resetBtn.click();
          const dialogInput = page.locator('div[role="dialog"] input').first();
          await dialogInput.waitFor({ state: 'visible' });
          await dialogInput.fill('PULSE99');
          await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
          await page.locator('button', { hasText: /^1$/ }).first().waitFor({ state: 'visible' });
          for (let i = 1; i <= 4; i++) await page.locator('button', { hasText: new RegExp(`^${i}$`) }).click();
          await dialogInput.waitFor({ state: 'visible' });
          await dialogInput.fill('PULSE99');
          await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
      }
    } else {
        for (let i = 1; i <= 4; i++) await page.locator('button', { hasText: new RegExp(`^${i}$`) }).click();
        const dialogInput = page.locator('div[role="dialog"] input');
        await dialogInput.waitFor({ state: 'visible' });
        await dialogInput.fill('PULSE99');
        await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
    }
    await page.route('**/api/contacts', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Mock Contact' }])
    }));
    await page.route('**/api/firms', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Mock Firm', contact: { id: 1 } }])
    }));
    await page.route('**/api/items', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Mock Item' }])
    }));
    await page.route('**/api/markas', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Mock Marka' }])
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

    await page.goto('/app/deals/new');

    // 4. Fill form with valid data
    await page.fill('input[name="weight"]', '100');
    await page.fill('input[name="rate"]', '5000');
    await page.fill('input[name="packetWeight"]', '50');

    // 5. Submit the form
    await page.locator('button', { hasText: 'Save Deal' }).click();

    // 6. Assert UI does not crash and shows Toast
    const toast = page.locator('text=Simulated Database Failure');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('Ledger gracefully handles corrupted NaN/Null payloads from backend', async ({ page }) => {
    await page.goto('/');
    
    // Quick robust login
    const isSetup = await page.locator('text=4-अंकों का पिन सेट करें').isVisible() || await page.locator('text=Create a 4-digit PIN').isVisible();
    if (!isSetup) {
      await page.locator('button', { hasText: /^1$/ }).click();
      await page.locator('button', { hasText: /^2$/ }).click();
      await page.locator('button', { hasText: /^3$/ }).click();
      await page.locator('button', { hasText: /^4$/ }).click();
      try {
          await page.waitForURL(/.*\/app\/dashboard/, { timeout: 3000 });
      } catch (e) {
          const resetBtn = page.locator('button', { hasText: /Reset PIN|पिन रीसेट करें/ });
          await resetBtn.waitFor({ state: 'visible' });
          await resetBtn.click();
          const dialogInput = page.locator('div[role="dialog"] input').first();
          await dialogInput.waitFor({ state: 'visible' });
          await dialogInput.fill('PULSE99');
          await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
          await page.locator('button', { hasText: /^1$/ }).first().waitFor({ state: 'visible' });
          for (let i = 1; i <= 4; i++) await page.locator('button', { hasText: new RegExp(`^${i}$`) }).click();
          await dialogInput.waitFor({ state: 'visible' });
          await dialogInput.fill('PULSE99');
          await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
      }
    } else {
        for (let i = 1; i <= 4; i++) await page.locator('button', { hasText: new RegExp(`^${i}$`) }).click();
        const dialogInput = page.locator('div[role="dialog"] input');
        await dialogInput.waitFor({ state: 'visible' });
        await dialogInput.fill('PULSE99');
        await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
    }

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

    await page.goto('/app/ledger');

    // The page should load and render the row without crashing React (white screen of death)
    const row = page.locator('text=Buggy Purchaser');
    await expect(row).toBeVisible();
    
    // Check that numeric cells render something safe instead of crashing
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

});
