import { test, expect } from '@playwright/test';

test.describe('Golden Path E2E', () => {
  test('Full User Journey', async ({ page }) => {
    // Generate unique names for each test run to prevent dirty state collisions
    const timestamp = new Date().getTime().toString().slice(-4) + Math.floor(Math.random() * 1000);
    const pFirm = `Purchaser ${timestamp}`;
    const sFirm = `Seller ${timestamp}`;
    const testContact = `Contact ${timestamp}`;
    const testItem = `Item ${timestamp}`;
    const testMarka = `Marka ${timestamp}`;
    
    // 1. Login
    await page.goto('/');
    
    // Check if we are on the setup PIN screen
    const isSetup = await page.locator('text=4-अंकों का पिन सेट करें').isVisible() || await page.locator('text=Create a 4-digit PIN').isVisible();
    
    if (isSetup) {
      // Create PIN
      await page.locator('button', { hasText: /^1$/ }).click();
      await page.locator('button', { hasText: /^2$/ }).click();
      await page.locator('button', { hasText: /^3$/ }).click();
      await page.locator('button', { hasText: /^4$/ }).click();
    } else {
      // Enter existing PIN or reset it
      const resetBtn = page.locator('button', { hasText: /Reset PIN|पिन रीसेट करें/ });
      if (await resetBtn.isVisible()) {
          // We can't handle window.prompt easily without setting up dialog handlers.
          // Playwright auto-dismisses dialogs. Let's configure it to accept prompt with MASTER CODE.
          page.on('dialog', async dialog => {
              if (dialog.type() === 'prompt') {
                  await dialog.accept('PULSE99');
              } else {
                  await dialog.accept();
              }
          });
          await resetBtn.click();
          // Now set new PIN
          await page.locator('button', { hasText: /^1$/ }).click();
          await page.locator('button', { hasText: /^2$/ }).click();
          await page.locator('button', { hasText: /^3$/ }).click();
          await page.locator('button', { hasText: /^4$/ }).click();
      }
    }

    // Should now be on Dashboard
    await expect(page).toHaveURL(/.*\/app\/dashboard/);

    // Open Hamburger Menu if on mobile
    const isMobile = page.viewportSize().width < 1024;
    if (isMobile) await page.getByLabel('Menu').click();

    // 2. Add Contact & Firms
    await page.locator('a:has-text("Parties & Firms") >> visible=true').click();
    await page.locator('button:has-text("Add New Party") >> visible=true').click();
    
    // Fill Contact
    await page.fill('input[placeholder*="Name"]', testContact);
    await page.fill('input[placeholder*="City"]', 'Mumbai');
    await page.fill('input[placeholder*="Phone"]', '9876543210');
    await page.click('button:has-text("Save Contact")');
    
    // Add Purchaser Firm
    await page.click(`text=${testContact}`); // Select the contact
    await page.click('button:has-text("Add Firm")');
    await page.fill('input[placeholder*="Firm Name"]', pFirm);
    await page.selectOption('select', { label: '% Percent' });
    await page.fill('input[placeholder*="Default Rate"]', '1.5');
    await page.click('button:has-text("Save Firm")');

    // Add Seller Firm
    await page.click('button:has-text("Add Firm")');
    await page.fill('input[placeholder*="Firm Name"]', sFirm);
    await page.selectOption('select', { label: '₹ Fixed/Qtl' });
    await page.fill('input[placeholder*="Default Rate"]', '10');
    await page.click('button:has-text("Save Firm")');

    // 3. Add Item & Marka
    if (isMobile) await page.getByLabel('Menu').click();
    await page.locator('a:has-text("Settings") >> visible=true').click();
    
    await page.fill('input[placeholder*="Item Name"]', testItem);
    await page.click('button:has-text("Add Item")');
    
    await page.fill('input[placeholder*="Marka Name"]', testMarka);
    await page.click('button:has-text("Add Marka")');

    // 4. Create New Deal
    if (isMobile) await page.getByLabel('Menu').click();
    await page.locator('a:has-text("New Deal") >> visible=true').click();
    
    await page.selectOption('select[name="purchaserId"]', { label: pFirm });
    await page.selectOption('select[name="sellerId"]', { label: sFirm });
    await page.selectOption('select[name="itemId"]', { label: testItem });
    await page.selectOption('select[name="markaId"]', { label: testMarka });
    
    await page.fill('input[name="weight"]', '100');
    await page.fill('input[name="rate"]', '5000');
    
    await page.click('button:has-text("Save New Deal")');
    
    // Should redirect to Dashboard
    await expect(page).toHaveURL(/.*\/app\/dashboard/);

    // 5. Load Deal
    if (isMobile) await page.getByLabel('Menu').click();
    await page.locator('a:has-text("Pending Deals") >> visible=true').click();
    
    // Find the row with our item and click Load
    // Search for our firm to ensure we don't load an old deal from a dirty database
    await page.fill('input[placeholder*="Search Firm"]', pFirm);
    await page.waitForTimeout(1000); 
    
    // Click Load for our specific deal
    const loadBtn = page.locator('button:has-text("Load") >> visible=true').first();
    await loadBtn.click();
    
    // Fill required Loading Date in Modal
    await page.getByPlaceholder('Select date').fill('18/06/2026');
    await page.getByPlaceholder('Select date').press('Enter');
    
    // Confirm Loading
    await page.click('button:has-text("Confirm Loading")');

    // 6. Generate Bill
    // Wait for the modal to disappear and the success toast
    await expect(page.locator('text=Deal Loaded Successfully')).toBeVisible();
    
    if (isMobile) await page.getByLabel('Menu').click();
    await page.locator('a:has-text("Ledger & Bills") >> visible=true').click();
    
    await page.selectOption('select', { label: pFirm });
    
    // Finalize the bill
    await page.locator('button:has-text("Finalize & Lock Bill") >> visible=true').first().click();
    await page.locator('button:has-text("Yes, Delete") >> visible=true').first().click(); // Confirm Modal uses this text
    
    // Wait for the printable invoice to render
    await expect(page.locator('text=Print / Download PDF')).toBeVisible({ timeout: 10000 });
    
    // Go back to Ledger
    await page.click('button:has-text("← Back")');
    
    // Go to History tab
    await page.click('button:has-text("Invoice History")');
    await expect(page.locator(`text=${pFirm} >> visible=true`).first()).toBeVisible();
    
    // Mark as PAID
    const clearText = isMobile ? '✓ Pay' : 'Mark Cleared';
    await page.locator(`button:has-text("${clearText}") >> visible=true`).first().click();
    await page.locator('button:has-text("Yes, Delete") >> visible=true').first().click();
  });
});
