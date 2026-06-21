# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-lifecycle.spec.js >> Pulse Broker UI E2E Validation >> Settings UI Validation - Cannot submit empty string
- Location: tests/full-lifecycle.spec.js:14:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="password"]')

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
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Pulse Broker UI E2E Validation', () => {
  4  | 
  5  |     test.beforeEach(async ({ page }) => {
  6  |         // Go to home and login
  7  |         await page.goto('/');
> 8  |         await page.fill('input[type="password"]', 'PULSE99');
     |                    ^ Error: page.fill: Test timeout of 30000ms exceeded.
  9  |         await page.click('button:has-text("Enter")');
  10 |         // Wait for dashboard to load
  11 |         await expect(page.locator('h1', { hasText: 'Good day' })).toBeVisible();
  12 |     });
  13 | 
  14 |     test('Settings UI Validation - Cannot submit empty string', async ({ page }) => {
  15 |         await page.click('a[href="/app/settings"]');
  16 |         await expect(page.locator('h1', { hasText: 'Settings' })).toBeVisible();
  17 | 
  18 |         // Find the first Marka edit button and click it
  19 |         const editButtons = page.locator('button[title="Edit Marka"]');
  20 |         if (await editButtons.count() > 0) {
  21 |             await editButtons.first().click();
  22 |             
  23 |             // Clear the input and try to save
  24 |             await page.fill('input[placeholder*="Name"]', '   ');
  25 |             await page.click('button:has-text("Save")');
  26 | 
  27 |             // Expect the validation toast
  28 |             await expect(page.locator('text=Name is required')).toBeVisible();
  29 |             
  30 |             // Cancel dialog
  31 |             await page.click('button:has-text("Cancel")');
  32 |         }
  33 |     });
  34 | 
  35 |     test('Full Load Journey with Form Validation', async ({ page }) => {
  36 |         // Step 1: Create a Deal
  37 |         await page.click('a[href="/app/deals/new"]');
  38 |         await expect(page.locator('h1', { hasText: 'Create New Deal' })).toBeVisible();
  39 | 
  40 |         // We skip filling out the full form to avoid database clutter, 
  41 |         // but we verify the UI prevents saving empty deals.
  42 |         await page.click('button:has-text("Save Deal")');
  43 |         
  44 |         // Assert HTML5 validation or custom toast
  45 |         // If the form has required fields, it shouldn't proceed.
  46 |         // Assuming we rely on frontend validations:
  47 |         await expect(page.locator('text=Deal Date is required').or(page.locator('text=Please fill out this field'))).toBeTruthy();
  48 |     });
  49 | });
  50 | 
```