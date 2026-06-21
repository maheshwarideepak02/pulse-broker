const { test, expect } = require('@playwright/test');

test('Undo bug simulation', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  
  // Login
  const isSetup = await page.locator('text=4-अंकों का पिन सेट करें').isVisible() || await page.locator('text=Create a 4-digit PIN').isVisible();
  if (!isSetup) {
    for (let i = 1; i <= 4; i++) await page.locator('button', { hasText: new RegExp(`^${i}$`) }).click();
  } else {
    for (let i = 1; i <= 4; i++) await page.locator('button', { hasText: new RegExp(`^${i}$`) }).click();
    const dialogInput = page.locator('div[role="dialog"] input');
    await dialogInput.waitFor({ state: 'visible' });
    await dialogInput.fill('PULSE99');
    await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  }
  
  await page.waitForURL('**/app/dashboard', { timeout: 5000 });
  
  // 1. Create a deal
  await page.goto('http://localhost:5173/app/new-deal');
  await page.waitForSelector('select[name="purchaserContactId"] option:not([value=""])');
  await page.selectOption('select[name="purchaserContactId"]', { index: 1 });
  await page.waitForSelector('select[name="purchaserId"] option:not([value=""])');
  await page.selectOption('select[name="purchaserId"]', { index: 1 });
  
  await page.selectOption('select[name="sellerContactId"]', { index: 2 });
  await page.waitForSelector('select[name="sellerId"] option:not([value=""])');
  await page.selectOption('select[name="sellerId"]', { index: 1 });
  
  await page.selectOption('select[name="itemId"]', { index: 0 });
  await page.selectOption('select[name="markaId"]', { index: 0 });
  await page.fill('input[name="weight"]', '100');
  await page.fill('input[name="rate"]', '5000');
  await page.click('button:has-text("Save New Deal")');
  await page.waitForURL('**/app/dashboard');
  
  // 2. Load the deal
  await page.goto('http://localhost:5173/app/pending');
  await page.click('button:has-text("Load")');
  await page.click('.modal-content button:has-text("Load")'); // Confirm load
  await page.waitForTimeout(1000);
  
  // 3. Undo the deal
  await page.goto('http://localhost:5173/app/dashboard');
  await page.click('button:has-text("Undo")'); // Find the undo button on recent deals
  await page.click('.modal-content button:has-text("Revert")'); // Confirm undo
  await page.waitForTimeout(1000);
  
  // 4. Edit the deal
  await page.goto('http://localhost:5173/app/pending');
  await page.click('button[data-testid="edit-deal-btn"]');
  await page.waitForURL('**/app/deals/edit/*');
  
  // 5. Check if the firm is selected
  const purchaserId = await page.$eval('select[name="purchaserId"]', el => el.value);
  console.log('Purchaser Firm ID in Edit Form:', purchaserId);
});
