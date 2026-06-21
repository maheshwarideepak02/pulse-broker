# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: edge-cases.spec.js >> Edge Cases & Robustness >> Ledger gracefully handles corrupted NaN/Null payloads from backend
- Location: tests/edge-cases.spec.js:87:3

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
  3   | test.describe('Edge Cases & Robustness', () => {
  4   | 
  5   |   test('UI gracefully handles 500 Internal Server Error when saving deal', async ({ page }) => {
  6   |     await page.goto('/');
  7   |     
  8   |     // Quick robust login
  9   |     const isSetup = await page.locator('text=4-अंकों का पिन सेट करें').isVisible() || await page.locator('text=Create a 4-digit PIN').isVisible();
  10  |     if (!isSetup) {
  11  |       await page.locator('button', { hasText: /^1$/ }).click();
  12  |       await page.locator('button', { hasText: /^2$/ }).click();
  13  |       await page.locator('button', { hasText: /^3$/ }).click();
  14  |       await page.locator('button', { hasText: /^4$/ }).click();
  15  |       try {
  16  |           await page.waitForURL(/.*\/app\/dashboard/, { timeout: 3000 });
  17  |       } catch (e) {
  18  |           const resetBtn = page.locator('button', { hasText: /Reset PIN|पिन रीसेट करें/ });
  19  |           await resetBtn.waitFor({ state: 'visible' });
  20  |           await resetBtn.click();
  21  |           const dialogInput = page.locator('div[role="dialog"] input').first();
  22  |           await dialogInput.waitFor({ state: 'visible' });
  23  |           await dialogInput.fill('PULSE99');
  24  |           await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  25  |           await page.locator('button', { hasText: /^1$/ }).first().waitFor({ state: 'visible' });
  26  |           for (let i = 1; i <= 4; i++) await page.locator('button', { hasText: new RegExp(`^${i}$`) }).click();
  27  |           await dialogInput.waitFor({ state: 'visible' });
  28  |           await dialogInput.fill('PULSE99');
  29  |           await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  30  |       }
  31  |     } else {
  32  |         for (let i = 1; i <= 4; i++) await page.locator('button', { hasText: new RegExp(`^${i}$`) }).click();
  33  |         const dialogInput = page.locator('div[role="dialog"] input');
  34  |         await dialogInput.waitFor({ state: 'visible' });
  35  |         await dialogInput.fill('PULSE99');
  36  |         await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  37  |     }
  38  |     await page.route('**/api/contacts', route => route.fulfill({
  39  |       status: 200,
  40  |       contentType: 'application/json',
  41  |       body: JSON.stringify([{ id: 1, name: 'Mock Contact' }])
  42  |     }));
  43  |     await page.route('**/api/firms', route => route.fulfill({
  44  |       status: 200,
  45  |       contentType: 'application/json',
  46  |       body: JSON.stringify([{ id: 1, name: 'Mock Firm', contact: { id: 1 } }])
  47  |     }));
  48  |     await page.route('**/api/items', route => route.fulfill({
  49  |       status: 200,
  50  |       contentType: 'application/json',
  51  |       body: JSON.stringify([{ id: 1, name: 'Mock Item' }])
  52  |     }));
  53  |     await page.route('**/api/markas', route => route.fulfill({
  54  |       status: 200,
  55  |       contentType: 'application/json',
  56  |       body: JSON.stringify([{ id: 1, name: 'Mock Marka' }])
  57  |     }));
  58  | 
  59  |     // 3. Mock the POST /deals to fail with 500
  60  |     await page.route('**/api/deals', route => {
  61  |       if (route.request().method() === 'POST') {
  62  |         route.fulfill({
  63  |           status: 500,
  64  |           contentType: 'application/json',
  65  |           body: JSON.stringify({ message: 'Simulated Database Failure' })
  66  |         });
  67  |       } else {
  68  |         route.fallback();
  69  |       }
  70  |     });
  71  | 
  72  |     await page.goto('/app/deals/new');
  73  | 
  74  |     // 4. Fill form with valid data
  75  |     await page.fill('input[name="weight"]', '100');
  76  |     await page.fill('input[name="rate"]', '5000');
  77  |     await page.fill('input[name="packetWeight"]', '50');
  78  | 
  79  |     // 5. Submit the form
  80  |     await page.locator('button', { hasText: 'Save Deal' }).click();
  81  | 
  82  |     // 6. Assert UI does not crash and shows Toast
  83  |     const toast = page.locator('text=Simulated Database Failure');
  84  |     await expect(toast).toBeVisible({ timeout: 5000 });
  85  |   });
  86  | 
  87  |   test('Ledger gracefully handles corrupted NaN/Null payloads from backend', async ({ page }) => {
  88  |     await page.goto('/');
  89  |     
  90  |     // Quick robust login
  91  |     const isSetup = await page.locator('text=4-अंकों का पिन सेट करें').isVisible() || await page.locator('text=Create a 4-digit PIN').isVisible();
  92  |     if (!isSetup) {
  93  |       await page.locator('button', { hasText: /^1$/ }).click();
  94  |       await page.locator('button', { hasText: /^2$/ }).click();
  95  |       await page.locator('button', { hasText: /^3$/ }).click();
  96  |       await page.locator('button', { hasText: /^4$/ }).click();
  97  |       try {
  98  |           await page.waitForURL(/.*\/app\/dashboard/, { timeout: 3000 });
  99  |       } catch (e) {
  100 |           const resetBtn = page.locator('button', { hasText: /Reset PIN|पिन रीसेट करें/ });
> 101 |           await resetBtn.waitFor({ state: 'visible' });
      |                          ^ Error: locator.waitFor: Test timeout of 30000ms exceeded.
  102 |           await resetBtn.click();
  103 |           const dialogInput = page.locator('div[role="dialog"] input').first();
  104 |           await dialogInput.waitFor({ state: 'visible' });
  105 |           await dialogInput.fill('PULSE99');
  106 |           await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  107 |           await page.locator('button', { hasText: /^1$/ }).first().waitFor({ state: 'visible' });
  108 |           for (let i = 1; i <= 4; i++) await page.locator('button', { hasText: new RegExp(`^${i}$`) }).click();
  109 |           await dialogInput.waitFor({ state: 'visible' });
  110 |           await dialogInput.fill('PULSE99');
  111 |           await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  112 |       }
  113 |     } else {
  114 |         for (let i = 1; i <= 4; i++) await page.locator('button', { hasText: new RegExp(`^${i}$`) }).click();
  115 |         const dialogInput = page.locator('div[role="dialog"] input');
  116 |         await dialogInput.waitFor({ state: 'visible' });
  117 |         await dialogInput.fill('PULSE99');
  118 |         await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  119 |     }
  120 | 
  121 |     // Mock Contacts with Margins API
  122 |     await page.route('**/api/contacts/with-margins', route => route.fulfill({
  123 |       status: 200,
  124 |       contentType: 'application/json',
  125 |       body: JSON.stringify([
  126 |         { id: 999, name: 'Buggy Purchaser' }
  127 |       ])
  128 |     }));
  129 | 
  130 |     // Mock Ledger to return malformed numeric data
  131 |     await page.route('**/api/deals/margins/*', route => route.fulfill({
  132 |       status: 200,
  133 |       contentType: 'application/json',
  134 |       body: JSON.stringify([
  135 |         {
  136 |           id: 999,
  137 |           dealDate: '2023-01-01',
  138 |           purchaser: { name: 'Buggy Purchaser' },
  139 |           seller: { name: 'Buggy Seller' },
  140 |           item: { name: 'Item' },
  141 |           marka: { name: 'Marka' },
  142 |           weight: null,         // NULL!
  143 |           rate: -5000,          // Negative
  144 |           marginMarkup: "NaN",  // String NaN
  145 |           status: 'PENDING'
  146 |         }
  147 |       ])
  148 |     }));
  149 | 
  150 |     await page.goto('/app/ledger');
  151 | 
  152 |     // The page should load and render the row without crashing React (white screen of death)
  153 |     const row = page.locator('text=Buggy Purchaser');
  154 |     await expect(row).toBeVisible();
  155 |     
  156 |     // Check that numeric cells render something safe instead of crashing
  157 |     const table = page.locator('table');
  158 |     await expect(table).toBeVisible();
  159 |   });
  160 | 
  161 | });
  162 | 
```