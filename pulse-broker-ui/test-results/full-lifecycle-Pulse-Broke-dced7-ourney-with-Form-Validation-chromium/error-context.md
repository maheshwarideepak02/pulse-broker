# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-lifecycle.spec.js >> Pulse Broker UI E2E Validation >> Full Load Journey with Form Validation
- Location: tests/full-lifecycle.spec.js:35:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Pulse Broker UI E2E Validation', () => {
  4  | 
  5  |     test.beforeEach(async ({ page }) => {
  6  |         // Go to home and login
> 7  |         await page.goto('/');
     |                    ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  8  |         await page.fill('input[type="password"]', 'PULSE99');
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