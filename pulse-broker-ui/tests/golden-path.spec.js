import { test, expect } from '@playwright/test';
import { loginToApp } from './test-utils';

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
    await loginToApp(page);

    // Open Hamburger Menu if on mobile
    const isMobile = page.viewportSize().width < 1024;

    // 2. Add Contact & Firms
    await page.getByTestId(isMobile ? 'nav-mobile-parties' : 'nav-parties').click();
    await page.getByTestId('add-new-party-btn').click();
    
    // Fill Purchaser Contact
    await page.fill('input[placeholder*="Name"]', pContact);
    await page.fill('input[placeholder*="City"]', 'Mumbai');
    await page.fill('input[placeholder*="Phone"]', '9876543210');
    await page.selectOption('select', { label: '% Percent' });
    await page.fill('input[placeholder*="Default Brokerage"]', '1.5');
    await page.getByTestId('save-contact-btn').click({ force: true });
    await expect(page.getByTestId('save-contact-btn')).toBeHidden();
    
    // Add Purchaser Firm
    await expect(page.locator('h3', { hasText: pContact })).toBeVisible({ timeout: 10000 });
    await page.locator(`div:has(> div > div > h3:has-text("${pContact}"))`).locator('[data-testid="add-firm-btn"]').first().click();
    await page.fill('input[placeholder*="Firm Name"]', pFirm);
    await page.getByTestId('save-firm-btn').click({ force: true });
    await expect(page.getByTestId('save-firm-btn')).toBeHidden();

    // Fill Seller Contact
    await page.getByTestId('add-new-party-btn').click();
    await page.fill('input[placeholder*="Name"]', sContact);
    await page.fill('input[placeholder*="City"]', 'Delhi');
    await page.fill('input[placeholder*="Phone"]', '9123456789');
    await page.selectOption('select', { label: '₹ Fixed/Qtl' });
    await page.fill('input[placeholder*="Default Brokerage"]', '10');
    await page.getByTestId('save-contact-btn').click({ force: true });
    await expect(page.getByTestId('save-contact-btn')).toBeHidden();

    // Add Seller Firm
    await expect(page.locator('h3', { hasText: sContact })).toBeVisible({ timeout: 10000 });
    await page.locator(`div:has(> div > div > h3:has-text("${sContact}"))`).locator('[data-testid="add-firm-btn"]').first().click();
    await page.fill('input[placeholder*="Firm Name"]', sFirm);
    await page.getByTestId('save-firm-btn').click({ force: true });
    await expect(page.getByTestId('save-firm-btn')).toBeHidden();

    // 3. Add Item & Marka
    if (isMobile) await page.getByTestId('nav-mobile-more').click();
    await page.getByTestId(isMobile ? 'nav-mobile-settings' : 'nav-settings').click();
    
    await page.fill('input[placeholder*="Item Name"]', testItem);
    await page.getByTestId('add-item-btn').click();
    
    await page.fill('input[placeholder*="Marka Name"]', testMarka);
    await page.getByTestId('add-marka-btn').click();

    // 4. Create New Deal
    await page.getByTestId(isMobile ? 'nav-mobile-new-deal' : 'nav-new-deal').click();
    
    await expect(page.locator('select[name="purchaserContactId"]')).toContainText(pContact, { timeout: 10000 });
    await page.selectOption('select[name="purchaserContactId"]', { label: pContact });
    await expect(page.locator('select[name="purchaserId"]')).toContainText(pFirm, { timeout: 10000 });
    await page.selectOption('select[name="purchaserId"]', { label: pFirm });
    
    await expect(page.locator('select[name="sellerContactId"]')).toContainText(sContact, { timeout: 10000 });
    await page.selectOption('select[name="sellerContactId"]', { label: sContact });
    await expect(page.locator('select[name="sellerId"]')).toContainText(sFirm, { timeout: 10000 });
    await page.selectOption('select[name="sellerId"]', { label: sFirm });
    
    await expect(page.locator('select[name="itemId"]')).toContainText(testItem, { timeout: 10000 });
    await page.selectOption('select[name="itemId"]', { label: testItem });
    await expect(page.locator('select[name="markaId"]')).toContainText(testMarka, { timeout: 10000 });
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
    await page.getByTestId(isMobile ? 'nav-mobile-pending' : 'nav-pending').click();
    
    // Find the row with our item and click Load
    // Search for our firm to ensure we don't load an old deal from a dirty database
    await page.fill('input[placeholder*="Search Firm"]', pFirm);
    await page.waitForTimeout(1000); 

    // Verify Edit Deal functionality
    const editBtn = page.getByTestId('edit-deal-btn').filter({ visible: true }).first();
    await editBtn.click();
    await expect(page.locator('text=Edit Existing Deal')).toBeVisible();
    await page.fill('input[name="rate"]', '5000'); // Resave same rate to avoid changing test's total bill expectation
    await page.getByTestId('submit-deal-btn').click();
    await expect(page.locator('text=Deal Updated Successfully')).toBeVisible();
    await page.waitForTimeout(1000);
    
    // Click Load for our specific deal
    const loadBtn = page.getByTestId('load-btn').filter({ visible: true }).first();
    await loadBtn.click();
    
    // Confirm Loading
    await page.getByTestId('confirm-load-btn').click();

    // 6. Generate Bill
    // Wait for the modal to disappear and the success toast
    await expect(page.locator('text=Deal Loaded Successfully')).toBeVisible();
    
    if (isMobile) await page.getByTestId('nav-mobile-more').click();
    await page.getByTestId(isMobile ? 'nav-mobile-ledger' : 'nav-ledger').click();
    
    await expect(page.locator('select').nth(0)).toContainText(pContact, { timeout: 15000 });
    await page.locator('select').nth(0).selectOption({ label: pContact });
    await expect(page.locator('select').nth(1)).toContainText(pFirm, { timeout: 15000 });
    await page.locator('select').nth(1).selectOption({ label: pFirm });
    
    // Finalize the bill
    await page.getByTestId(isMobile ? 'finalize-bill-btn-mobile' : 'finalize-bill-btn').first().click();
    await page.getByTestId('modal-confirm-btn').first().click(); // Confirm Modal uses this text
    
    // Wait for the printable invoice to render
    await expect(page.locator('text=Download PDF')).toBeVisible({ timeout: 10000 });
    
    // Go back to Ledger
    await page.getByTestId('back-btn').click();
    
    // Go to History tab
    await page.getByTestId('invoice-history-btn').click();
    await expect(page.locator(`text=${pFirm} >> visible=true`).first()).toBeVisible();
    
    // Mark as PAID
    // Mark as PAID with Kasar
    const clearText = isMobile ? '✓ Pay' : 'Mark Cleared';
    await page.getByTestId('clear-bill-btn').filter({ visible: true }).first().click();
    
    // Fill Kasar amount
    await page.fill('input[placeholder="Optional"]', '150');
    await page.getByTestId('mark-paid-btn').filter({ visible: true }).first().click();
    
    // Verify Kasar badge is visible
    await expect(page.locator('text=Kasar: ₹150 >> visible=true').first()).toBeVisible();
  });
});
