# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-lifecycle.spec.js >> Pulse Broker UI E2E Validation >> Parties UI Validation - Empty Contact Form
- Location: tests/full-lifecycle.spec.js:29:5

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
  9  |         await page.getByTestId('prompt-confirm-btn').click();
  10 |         // Wait for dashboard to load
  11 |         await expect(page.locator('h1', { hasText: 'Good day' })).toBeVisible();
  12 |     });
  13 | 
  14 |     test('Settings UI Validation - Cannot submit empty string', async ({ page }) => {
  15 |         await page.click('a[href="/app/settings"]');
  16 |         await expect(page.locator('h2', { hasText: 'Manage Pulse Categories' })).toBeVisible();
  17 |         
  18 |         // Try submitting empty item
  19 |         await page.getByTestId('add-item-btn').click();
  20 |         await expect(page.locator('text=Item name cannot be empty')).toBeVisible();
  21 |     });
  22 | 
  23 |     test('Settings UI Validation - Cannot submit empty marka', async ({ page }) => {
  24 |         await page.click('a[href="/app/settings"]');
  25 |         await page.getByTestId('add-marka-btn').click();
  26 |         await expect(page.locator('text=Marka name cannot be empty')).toBeVisible();
  27 |     });
  28 | 
  29 |     test('Parties UI Validation - Empty Contact Form', async ({ page }) => {
  30 |         await page.click('a[href="/app/parties"]');
  31 |         await page.getByTestId('add-new-party-btn').click();
  32 |         await page.getByTestId('save-contact-btn').click();
  33 |         
  34 |         await expect(page.locator('text=Name is required')).toBeVisible();
  35 |         
  36 |         // Close modal
  37 |         await page.locator('button', { hasText: 'Cancel' }).click();
  38 |     });
  39 | 
  40 |     test('New Deal UI Validation - Empty form submission', async ({ page }) => {
  41 |         await page.click('a[href="/app/new-deal"]');
  42 |         // Wait for component to mount
  43 |         await page.waitForTimeout(500);
  44 |         
  45 |         // Submit without filling anything
  46 |         await page.getByTestId('submit-deal-btn').click();
  47 |         
  48 |         // Assert HTML5 validation or custom toast
  49 |         // If the form has required fields, it shouldn't proceed.
  50 |         // Assuming we rely on frontend validations:
  51 |         await expect(page.locator('text=Deal Date is required').or(page.locator('text=Please fill out this field'))).toBeTruthy();
  52 |     });
  53 | });
  54 | 
```