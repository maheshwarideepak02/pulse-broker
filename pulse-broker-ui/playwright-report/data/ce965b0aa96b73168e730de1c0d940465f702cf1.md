# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: golden-path.spec.js >> Golden Path E2E >> Full User Journey
- Location: tests/golden-path.spec.js:4:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.waitFor: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button').filter({ hasText: /Reset PIN|पिन रीसेट करें/ }) to be visible

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e7]:
      - generic [ref=e8]: ॐ
      - generic [ref=e9]:
        - generic [ref=e10]: Pulse Broker
        - generic [ref=e11]: Trade operations
    - generic [ref=e12]:
      - generic [ref=e13]: Simple. Accurate. Dependable.
      - heading "Your brokerage business, organised in one place." [level=1] [ref=e14]
      - paragraph [ref=e15]: Manage deals, loadings, brokerage and payments with confidence.
    - paragraph [ref=e16]: Secure business workspace
  - generic [ref=e17]:
    - button "हिंदी" [ref=e19]
    - generic [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]: First-time setup
        - heading "Create your PIN" [level=2] [ref=e23]
        - paragraph [ref=e24]: Choose a memorable 4-digit PIN
      - generic [ref=e31]:
        - button "1" [ref=e32]
        - button "2" [ref=e33]
        - button "3" [ref=e34]
        - button "4" [ref=e35]
        - button "5" [ref=e36]
        - button "6" [ref=e37]
        - button "7" [ref=e38]
        - button "8" [ref=e39]
        - button "9" [ref=e40]
        - button "0" [ref=e42]
        - button "⌫" [ref=e43]
  - dialog "Authorise setup" [ref=e44]:
    - generic [ref=e46]:
      - generic [ref=e47]:
        - heading "Authorise setup" [level=2] [ref=e48]
        - paragraph [ref=e49]: Enter the server master secret to continue securely.
        - generic [ref=e50]: Master secret
        - textbox [active] [ref=e51]
      - generic [ref=e52]:
        - button "Cancel" [ref=e53]
        - button "Continue" [ref=e54]
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
  15  |     // 1. Login
  16  |     await page.goto('/');
  17  |     
  18  |     // Wait for keypad to be visible
  19  |     await page.locator('button', { hasText: /^1$/ }).first().waitFor({ state: 'visible', timeout: 10000 });
  20  |     
  21  |     // Check if we are on the setup PIN screen
  22  |     const isSetup = await page.locator('text=4-अंकों का पिन सेट करें').isVisible() || await page.locator('text=Create a 4-digit PIN').isVisible();
  23  |     
  24  |     if (isSetup) {
  25  |       // Create PIN
  26  |       await page.locator('button', { hasText: /^1$/ }).click();
  27  |       await page.locator('button', { hasText: /^2$/ }).click();
  28  |       await page.locator('button', { hasText: /^3$/ }).click();
  29  |       await page.locator('button', { hasText: /^4$/ }).click();
  30  | 
  31  |       const dialogInput = page.locator('div[role="dialog"] input');
  32  |       await dialogInput.waitFor({ state: 'visible' });
  33  |       await dialogInput.fill('PULSE99');
  34  |       await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  35  |     } else {
  36  |       // Try existing PIN 1234
  37  |       await page.locator('button', { hasText: /^1$/ }).click();
  38  |       await page.locator('button', { hasText: /^2$/ }).click();
  39  |       await page.locator('button', { hasText: /^3$/ }).click();
  40  |       await page.locator('button', { hasText: /^4$/ }).click();
  41  |       
  42  |       try {
  43  |           await page.waitForURL(/.*\/app\/dashboard/, { timeout: 3000 });
  44  |       } catch (e) {
  45  |           // If we didn't navigate, the PIN was probably wrong. Reset it.
  46  |           const resetBtn = page.locator('button', { hasText: /Reset PIN|पिन रीसेट करें/ });
> 47  |           await resetBtn.waitFor({ state: 'visible' });
      |                          ^ Error: locator.waitFor: Test timeout of 30000ms exceeded.
  48  |           await resetBtn.click();
  49  |           
  50  |           const dialogInput = page.locator('div[role="dialog"] input').first();
  51  |           await dialogInput.waitFor({ state: 'visible' });
  52  |           await dialogInput.fill('PULSE99');
  53  |           await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  54  |           
  55  |           // Wait for keypad to appear again
  56  |           await page.locator('button', { hasText: /^1$/ }).first().waitFor({ state: 'visible' });
  57  |           
  58  |           // Now set new PIN (1234)
  59  |           await page.locator('button', { hasText: /^1$/ }).click();
  60  |           await page.locator('button', { hasText: /^2$/ }).click();
  61  |           await page.locator('button', { hasText: /^3$/ }).click();
  62  |           await page.locator('button', { hasText: /^4$/ }).click();
  63  |     
  64  |           await dialogInput.waitFor({ state: 'visible' });
  65  |           await dialogInput.fill('PULSE99');
  66  |           await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  67  |       }
  68  |     }
  69  | 
  70  |     // Should now be on Dashboard
  71  |     await expect(page).toHaveURL(/.*\/app\/dashboard/);
  72  | 
  73  |     // Open Hamburger Menu if on mobile
  74  |     const isMobile = page.viewportSize().width < 1024;
  75  |     if (isMobile) await page.getByLabel('Menu').click();
  76  | 
  77  |     // 2. Add Contact & Firms
  78  |     await page.locator('a:has-text("Parties & Firms") >> visible=true').click();
  79  |     await page.locator('button:has-text("Add New Party") >> visible=true').click();
  80  |     
  81  |     // Fill Purchaser Contact
  82  |     await page.fill('input[placeholder*="Name"]', pContact);
  83  |     await page.fill('input[placeholder*="City"]', 'Mumbai');
  84  |     await page.fill('input[placeholder*="Phone"]', '9876543210');
  85  |     await page.selectOption('select', { label: '% Percent' });
  86  |     await page.fill('input[placeholder*="Default Brokerage"]', '1.5');
  87  |     await page.click('button:has-text("Save Contact")');
  88  |     
  89  |     // Add Purchaser Firm
  90  |     await page.locator(`div:has(> div > div > h3:has-text("${pContact}"))`).locator('button:has-text("Add Firm")').first().click();
  91  |     await page.fill('input[placeholder*="Firm Name"]', pFirm);
  92  |     await page.click('button:has-text("Save Firm")');
  93  | 
  94  |     // Fill Seller Contact
  95  |     await page.locator('button:has-text("Add New Party") >> visible=true').click();
  96  |     await page.fill('input[placeholder*="Name"]', sContact);
  97  |     await page.fill('input[placeholder*="City"]', 'Delhi');
  98  |     await page.fill('input[placeholder*="Phone"]', '9876543211');
  99  |     await page.selectOption('select', { label: '₹ Fixed/Qtl' });
  100 |     await page.fill('input[placeholder*="Default Brokerage"]', '10');
  101 |     await page.click('button:has-text("Save Contact")');
  102 | 
  103 |     // Add Seller Firm
  104 |     await page.locator(`div:has(> div > div > h3:has-text("${sContact}"))`).locator('button:has-text("Add Firm")').first().click();
  105 |     await page.fill('input[placeholder*="Firm Name"]', sFirm);
  106 |     await page.click('button:has-text("Save Firm")');
  107 | 
  108 |     // 3. Add Item & Marka
  109 |     if (isMobile) await page.getByLabel('Menu').click();
  110 |     await page.locator('a:has-text("Settings") >> visible=true').click();
  111 |     
  112 |     await page.fill('input[placeholder*="Item Name"]', testItem);
  113 |     await page.click('button:has-text("Add Item")');
  114 |     
  115 |     await page.fill('input[placeholder*="Marka Name"]', testMarka);
  116 |     await page.click('button:has-text("Add Marka")');
  117 | 
  118 |     // 4. Create New Deal
  119 |     if (isMobile) await page.getByLabel('Menu').click();
  120 |     await page.locator('a:has-text("New Deal") >> visible=true').click();
  121 |     
  122 |     await page.selectOption('select[name="purchaserContactId"]', { label: pContact });
  123 |     await page.waitForTimeout(500);
  124 |     await page.selectOption('select[name="purchaserId"]', { label: pFirm });
  125 |     await page.selectOption('select[name="sellerContactId"]', { label: sContact });
  126 |     await page.waitForTimeout(500);
  127 |     await page.selectOption('select[name="sellerId"]', { label: sFirm });
  128 |     await page.selectOption('select[name="itemId"]', { label: testItem });
  129 |     await page.selectOption('select[name="markaId"]', { label: testMarka });
  130 |     
  131 |     await page.fill('input[name="weight"]', '100');
  132 |     await page.fill('input[name="rate"]', '5000');
  133 |     
  134 |     // Change packet weight and verify bags calculation
  135 |     await page.fill('input[name="packetWeight"]', '25'); // 100 quintal * 100 kg / 25 kg = 400 bags
  136 |     await expect(page.locator('input[name="numberOfPackets"]')).toHaveValue('400');
  137 |     
  138 |     await page.click('button:has-text("Save New Deal")');
  139 |     
  140 |     // Should redirect to Dashboard
  141 |     await expect(page).toHaveURL(/.*\/app\/dashboard/);
  142 | 
  143 |     // 5. Load Deal
  144 |     if (isMobile) await page.getByLabel('Menu').click();
  145 |     await page.locator('a:has-text("Pending Deals") >> visible=true').click();
  146 |     
  147 |     // Find the row with our item and click Load
```