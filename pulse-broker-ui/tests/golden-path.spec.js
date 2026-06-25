import { test, expect } from '@playwright/test';

test.describe('Golden Path E2E', () => {
  test('Full User Journey', async ({ page }) => {
    // Generate unique names for each test run to prevent dirty state collisions
    const timestamp = new Date().getTime().toString().slice(-4) + Math.floor(Math.random() * 1000);
    const pContact = `PContact ${timestamp}`;
    const sContact = `SContact ${timestamp}`;
    const pFirm = `Purchaser ${timestamp}`;
    const sFirm = `Seller ${timestamp}`;
    const testItem = `Item ${timestamp}`;
    const testMarka = `Marka ${timestamp}`;
    
    // 1. Login
    // 1. Login
    await page.goto('/');
    
    // Wait for keypad to be visible
    await page.locator('button', { hasText: /^1$/ }).first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Check if we are on the setup PIN screen
    const isSetup = await page.locator('text=4-अंकों का पिन सेट करें').isVisible() || await page.locator('text=Create a 4-digit PIN').isVisible();
    
    if (isSetup) {
      // Create PIN
      await page.locator('button', { hasText: /^1$/ }).click();
      await page.locator('button', { hasText: /^2$/ }).click();
      await page.locator('button', { hasText: /^3$/ }).click();
      await page.locator('button', { hasText: /^4$/ }).click();

      const dialogInput = page.locator('div[role="dialog"] input');
      await dialogInput.waitFor({ state: 'visible' });
      await dialogInput.fill('PULSE99');
      await page.getByTestId('prompt-confirm-btn').click();
    } else {
      // Try existing PIN 1234
      await page.locator('button', { hasText: /^1$/ }).click();
      await page.locator('button', { hasText: /^2$/ }).click();
      await page.locator('button', { hasText: /^3$/ }).click();
      await page.locator('button', { hasText: /^4$/ }).click();
      
      try {
          await page.waitForURL(/.*\/app\/dashboard/, { timeout: 3000 });
      } catch (e) {
          // If we didn't navigate, the PIN was probably wrong. Reset it.
          const resetBtn = page.getByTestId('reset-pin-btn');
          await resetBtn.waitFor({ state: 'visible' });
          await resetBtn.click();
          
          const dialogInput = page.locator('div[role="dialog"] input').first();
          await dialogInput.waitFor({ state: 'visible' });
          await dialogInput.fill('PULSE99');
          await page.getByTestId('prompt-confirm-btn').click();
          
          // Wait for keypad to appear again
          await page.locator('button', { hasText: /^1$/ }).first().waitFor({ state: 'visible' });
          
          // Now set new PIN (1234)
          await page.locator('button', { hasText: /^1$/ }).click();
          await page.locator('button', { hasText: /^2$/ }).click();
          await page.locator('button', { hasText: /^3$/ }).click();
          await page.locator('button', { hasText: /^4$/ }).click();
    
          await dialogInput.waitFor({ state: 'visible' });
          await dialogInput.fill('PULSE99');
          await page.getByTestId('prompt-confirm-btn').click();
      }
    }

    // Should now be on Dashboard
    await expect(page).toHaveURL(/.*\/app\/dashboard/);

    // Open Hamburger Menu if on mobile
    const isMobile = page.viewportSize().width < 1024;
    if (isMobile) await page.getByLabel('Menu').click();

    // 2. Add Contact & Firms
    await page.getByTestId(isMobile ? 'nav-mobile-parties' : 'nav-parties').click();
    await page.getByTestId('add-new-party-btn').click();
    
    // Fill Purchaser Contact
    await page.fill('input[placeholder*="Name"]', pContact);
    await page.fill('input[placeholder*="City"]', 'Mumbai');
    await page.fill('input[placeholder*="Phone"]', '9876543210');
    await page.selectOption('select', { label: '% Percent' });
    await page.fill('input[placeholder*="Default Brokerage"]', '1.5');
    await page.getByTestId('save-contact-btn').click();
    
    // Add Purchaser Firm
    await page.locator(`div:has(> div > div > h3:has-text("${pContact}"))`).locator('[data-testid="add-firm-btn"]').first().click();
    await page.fill('input[placeholder*="Firm Name"]', pFirm);
    await page.getByTestId('save-firm-btn').click();

    // Fill Seller Contact
    await page.getByTestId('add-new-party-btn').click();
    await page.fill('input[placeholder*="Name"]', sContact);
    await page.fill('input[placeholder*="City"]', 'Delhi');
    await page.fill('input[placeholder*="Phone"]', '9876543211');
    await page.selectOption('select', { label: '₹ Fixed/Qtl' });
    await page.fill('input[placeholder*="Default Brokerage"]', '10');
    await page.getByTestId('save-contact-btn').click();

    // Add Seller Firm
    await page.locator(`div:has(> div > div > h3:has-text("${sContact}"))`).locator('[data-testid="add-firm-btn"]').first().click();
    await page.fill('input[placeholder*="Firm Name"]', sFirm);
    await page.getByTestId('save-firm-btn').click();

    // 3. Add Item & Marka
    if (isMobile) await page.getByLabel('Menu').click();
    await page.getByTestId(isMobile ? 'nav-mobile-settings' : 'nav-settings').click();
    
    await page.fill('input[placeholder*="Item Name"]', testItem);
    await page.getByTestId('add-item-btn').click();
    
    await page.fill('input[placeholder*="Marka Name"]', testMarka);
    await page.getByTestId('add-marka-btn').click();

    // 4. Create New Deal
    if (isMobile) await page.getByLabel('Menu').click();
    await page.getByTestId(isMobile ? 'nav-mobile-new-deal' : 'nav-new-deal').click();
    
    await page.selectOption('select[name="purchaserContactId"]', { label: pContact });
    await page.waitForTimeout(500);
    await page.selectOption('select[name="purchaserId"]', { label: pFirm });
    await page.selectOption('select[name="sellerContactId"]', { label: sContact });
    await page.waitForTimeout(500);
    await page.selectOption('select[name="sellerId"]', { label: sFirm });
    await page.selectOption('select[name="itemId"]', { label: testItem });
    await page.selectOption('select[name="markaId"]', { label: testMarka });
    
    await page.fill('input[name="weight"]', '100');
    await page.fill('input[name="rate"]', '5000');
    
    // Change packet weight and verify bags calculation
    await page.fill('input[name="packetWeight"]', '25'); // 100 quintal * 100 kg / 25 kg = 400 bags
    await expect(page.locator('input[name="numberOfPackets"]')).toHaveValue('400');
    
    await page.getByTestId('submit-deal-btn').click();
    
    // Should redirect to Dashboard
    await expect(page).toHaveURL(/.*\/app\/dashboard/);

    // 5. Load Deal
    if (isMobile) await page.getByLabel('Menu').click();
    await page.getByTestId(isMobile ? 'nav-mobile-pending' : 'nav-pending').click();
    
    // Find the row with our item and click Load
    // Search for our firm to ensure we don't load an old deal from a dirty database
    await page.fill('input[placeholder*="Search Firm"]', pFirm);
    await page.waitForTimeout(1000); 

    // Verify Edit Deal functionality
    const editBtn = page.getByTestId('edit-deal-btn').first();
    await editBtn.click();
    await expect(page.locator('h2:has-text("Edit Pending Deal")')).toBeVisible();
    await page.fill('input[name="rate"]', '5000'); // Resave same rate to avoid changing test's total bill expectation
    await page.getByTestId('submit-deal-btn').click();
    await expect(page.locator('text=Deal Updated Successfully')).toBeVisible();
    await page.waitForTimeout(1000);
    
    // Click Load for our specific deal
    const loadBtn = page.getByTestId('load-btn').first();
    await loadBtn.click();
    
    // Fill required Loading Date in Modal
    await page.getByPlaceholder('Select date').fill('18/06/2026');
    await page.getByPlaceholder('Select date').press('Enter');
    
    // Confirm Loading
    await page.getByTestId('confirm-load-btn').click();

    // 6. Generate Bill
    // Wait for the modal to disappear and the success toast
    await expect(page.locator('text=Deal Loaded Successfully')).toBeVisible();
    
    if (isMobile) await page.getByLabel('Menu').click();
    await page.getByTestId(isMobile ? 'nav-mobile-ledger' : 'nav-ledger').click();
    
    await page.selectOption('select', { label: pFirm });
    
    // Finalize the bill
    await page.getByTestId(isMobile ? 'finalize-bill-btn-mobile' : 'finalize-bill-btn').first().click();
    await page.getByTestId('modal-confirm-btn').first().click(); // Confirm Modal uses this text
    
    // Wait for the printable invoice to render
    await expect(page.locator('text=Print / Download PDF')).toBeVisible({ timeout: 10000 });
    
    // Go back to Ledger
    await page.getByTestId('back-btn').click();
    
    // Go to History tab
    await page.getByTestId('invoice-history-btn').click();
    await expect(page.locator(`text=${pFirm} >> visible=true`).first()).toBeVisible();
    
    // Mark as PAID
    // Mark as PAID with Kasar
    const clearText = isMobile ? '✓ Pay' : 'Mark Cleared';
    await page.getByTestId('clear-bill-btn').first().click();
    
    // Fill Kasar amount
    await page.fill('input[placeholder="Optional"]', '150');
    await page.getByTestId('mark-paid-btn').first().click();
    
    // Verify Kasar badge is visible
    await expect(page.locator('text=Kasar: ₹150 >> visible=true').first()).toBeVisible();
  });
});
