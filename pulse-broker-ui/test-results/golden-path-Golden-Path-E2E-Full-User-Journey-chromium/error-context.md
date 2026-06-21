# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: golden-path.spec.js >> Golden Path E2E >> Full User Journey
- Location: tests/golden-path.spec.js:4:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*\/app\/dashboard/
Received string:  "http://localhost:5173/login"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × unexpected value "http://localhost:5173/login"

```

```yaml
- text: ॐ Pulse Broker Trade operations Simple. Accurate. Dependable.
- heading "Your brokerage business, organised in one place." [level=1]
- paragraph: Manage deals, loadings, brokerage and payments with confidence.
- paragraph: Secure business workspace
- button "हिंदी"
- text: First-time setup
- heading "Create your PIN" [level=2]
- paragraph: Choose a memorable 4-digit PIN
- button "1"
- button "2"
- button "3"
- button "4"
- button "5"
- button "6"
- button "7"
- button "8"
- button "9"
- button "0"
- button "⌫"
- dialog "Authorise setup":
  - heading "Authorise setup" [level=2]
  - paragraph: Enter the server master secret to continue securely.
  - text: Master secret
  - textbox
  - button "Cancel"
  - button "Continue"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Golden Path E2E', () => {
  4   |   test('Full User Journey', async ({ page }) => {
  5   |     // Generate unique names for each test run to prevent dirty state collisions
  6   |     const timestamp = new Date().getTime().toString().slice(-4) + Math.floor(Math.random() * 1000);
  7   |     const pContact = `PContact ${timestamp}`;
  8   |     const sContact = `SContact ${timestamp}`;
  9   |     const pFirm = `Purchaser ${timestamp}`;
  10  |     const sFirm = `Seller ${timestamp}`;
  11  |     const testItem = `Item ${timestamp}`;
  12  |     const testMarka = `Marka ${timestamp}`;
  13  |     
  14  |     // 1. Login
  15  |     await page.goto('/');
  16  |     
  17  |     // Check if we are on the setup PIN screen
  18  |     const isSetup = await page.locator('text=4-अंकों का पिन सेट करें').isVisible() || await page.locator('text=Create a 4-digit PIN').isVisible();
  19  |     
  20  |     if (isSetup) {
  21  |       // Create PIN
  22  |       await page.locator('button', { hasText: /^1$/ }).click();
  23  |       await page.locator('button', { hasText: /^2$/ }).click();
  24  |       await page.locator('button', { hasText: /^3$/ }).click();
  25  |       await page.locator('button', { hasText: /^4$/ }).click();
  26  | 
  27  |       const dialogInput = page.locator('div[role="dialog"] input');
  28  |       await dialogInput.waitFor({ state: 'visible' });
  29  |       await dialogInput.fill('PULSE99');
  30  |       await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  31  |     } else {
  32  |       // Enter existing PIN or reset it
  33  |       const resetBtn = page.locator('button', { hasText: /Reset PIN|पिन रीसेट करें/ });
  34  |       if (await resetBtn.isVisible()) {
  35  |           await resetBtn.click();
  36  |           const dialogInput = page.locator('div[role="dialog"] input');
  37  |           await dialogInput.waitFor({ state: 'visible' });
  38  |           await dialogInput.fill('PULSE99');
  39  |           await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  40  |           
  41  |           // Now set new PIN
  42  |           await page.locator('button', { hasText: /^1$/ }).click();
  43  |           await page.locator('button', { hasText: /^2$/ }).click();
  44  |           await page.locator('button', { hasText: /^3$/ }).click();
  45  |           await page.locator('button', { hasText: /^4$/ }).click();
  46  | 
  47  |           await dialogInput.waitFor({ state: 'visible' });
  48  |           await dialogInput.fill('PULSE99');
  49  |           await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  50  |       } else {
  51  |           // Just login
  52  |           await page.locator('button', { hasText: /^1$/ }).click();
  53  |           await page.locator('button', { hasText: /^2$/ }).click();
  54  |           await page.locator('button', { hasText: /^3$/ }).click();
  55  |           await page.locator('button', { hasText: /^4$/ }).click();
  56  |       }
  57  |     }
  58  | 
  59  |     // Should now be on Dashboard
> 60  |     await expect(page).toHaveURL(/.*\/app\/dashboard/);
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  61  | 
  62  |     // Open Hamburger Menu if on mobile
  63  |     const isMobile = page.viewportSize().width < 1024;
  64  |     if (isMobile) await page.getByLabel('Menu').click();
  65  | 
  66  |     // 2. Add Contact & Firms
  67  |     await page.locator('a:has-text("Parties & Firms") >> visible=true').click();
  68  |     await page.locator('button:has-text("Add New Party") >> visible=true').click();
  69  |     
  70  |     // Fill Purchaser Contact
  71  |     await page.fill('input[placeholder*="Name"]', pContact);
  72  |     await page.fill('input[placeholder*="City"]', 'Mumbai');
  73  |     await page.fill('input[placeholder*="Phone"]', '9876543210');
  74  |     await page.selectOption('select', { label: '% Percent' });
  75  |     await page.fill('input[placeholder*="Default Brokerage"]', '1.5');
  76  |     await page.click('button:has-text("Save Contact")');
  77  |     
  78  |     // Add Purchaser Firm
  79  |     await page.locator(`div:has(> div > div > h3:has-text("${pContact}"))`).locator('button:has-text("Add Firm")').first().click();
  80  |     await page.fill('input[placeholder*="Firm Name"]', pFirm);
  81  |     await page.click('button:has-text("Save Firm")');
  82  | 
  83  |     // Fill Seller Contact
  84  |     await page.locator('button:has-text("Add New Party") >> visible=true').click();
  85  |     await page.fill('input[placeholder*="Name"]', sContact);
  86  |     await page.fill('input[placeholder*="City"]', 'Delhi');
  87  |     await page.fill('input[placeholder*="Phone"]', '9876543211');
  88  |     await page.selectOption('select', { label: '₹ Fixed/Qtl' });
  89  |     await page.fill('input[placeholder*="Default Brokerage"]', '10');
  90  |     await page.click('button:has-text("Save Contact")');
  91  | 
  92  |     // Add Seller Firm
  93  |     await page.locator(`div:has(> div > div > h3:has-text("${sContact}"))`).locator('button:has-text("Add Firm")').first().click();
  94  |     await page.fill('input[placeholder*="Firm Name"]', sFirm);
  95  |     await page.click('button:has-text("Save Firm")');
  96  | 
  97  |     // 3. Add Item & Marka
  98  |     if (isMobile) await page.getByLabel('Menu').click();
  99  |     await page.locator('a:has-text("Settings") >> visible=true').click();
  100 |     
  101 |     await page.fill('input[placeholder*="Item Name"]', testItem);
  102 |     await page.click('button:has-text("Add Item")');
  103 |     
  104 |     await page.fill('input[placeholder*="Marka Name"]', testMarka);
  105 |     await page.click('button:has-text("Add Marka")');
  106 | 
  107 |     // 4. Create New Deal
  108 |     if (isMobile) await page.getByLabel('Menu').click();
  109 |     await page.locator('a:has-text("New Deal") >> visible=true').click();
  110 |     
  111 |     await page.selectOption('select[name="purchaserContactId"]', { label: pContact });
  112 |     await page.waitForTimeout(500);
  113 |     await page.selectOption('select[name="purchaserId"]', { label: pFirm });
  114 |     await page.selectOption('select[name="sellerContactId"]', { label: sContact });
  115 |     await page.waitForTimeout(500);
  116 |     await page.selectOption('select[name="sellerId"]', { label: sFirm });
  117 |     await page.selectOption('select[name="itemId"]', { label: testItem });
  118 |     await page.selectOption('select[name="markaId"]', { label: testMarka });
  119 |     
  120 |     await page.fill('input[name="weight"]', '100');
  121 |     await page.fill('input[name="rate"]', '5000');
  122 |     
  123 |     // Change packet weight and verify bags calculation
  124 |     await page.fill('input[name="packetWeight"]', '25'); // 100 quintal * 100 kg / 25 kg = 400 bags
  125 |     await expect(page.locator('input[name="numberOfPackets"]')).toHaveValue('400');
  126 |     
  127 |     await page.click('button:has-text("Save New Deal")');
  128 |     
  129 |     // Should redirect to Dashboard
  130 |     await expect(page).toHaveURL(/.*\/app\/dashboard/);
  131 | 
  132 |     // 5. Load Deal
  133 |     if (isMobile) await page.getByLabel('Menu').click();
  134 |     await page.locator('a:has-text("Pending Deals") >> visible=true').click();
  135 |     
  136 |     // Find the row with our item and click Load
  137 |     // Search for our firm to ensure we don't load an old deal from a dirty database
  138 |     await page.fill('input[placeholder*="Search Firm"]', pFirm);
  139 |     await page.waitForTimeout(1000); 
  140 | 
  141 |     // Verify Edit Deal functionality
  142 |     const editBtn = page.getByTestId('edit-deal-btn').first();
  143 |     await editBtn.click();
  144 |     await expect(page.locator('h2:has-text("Edit Pending Deal")')).toBeVisible();
  145 |     await page.fill('input[name="rate"]', '5000'); // Resave same rate to avoid changing test's total bill expectation
  146 |     await page.click('button:has-text("Save Changes")');
  147 |     await expect(page.locator('text=Deal Updated Successfully')).toBeVisible();
  148 |     await page.waitForTimeout(1000);
  149 |     
  150 |     // Click Load for our specific deal
  151 |     const loadBtn = page.locator('button:has-text("Load") >> visible=true').first();
  152 |     await loadBtn.click();
  153 |     
  154 |     // Fill required Loading Date in Modal
  155 |     await page.getByPlaceholder('Select date').fill('18/06/2026');
  156 |     await page.getByPlaceholder('Select date').press('Enter');
  157 |     
  158 |     // Confirm Loading
  159 |     await page.click('button:has-text("Confirm Loading")');
  160 | 
```