# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug-deals.spec.cjs >> Debug API
- Location: tests/debug-deals.spec.cjs:2:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/login
Call log:
  - navigating to "http://localhost:5173/login", waiting until "load"

```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | test('Debug API', async ({ page }) => {
> 3  |   await page.goto('http://localhost:5173/login');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/login
  4  |   const isSetup = await page.locator('text=4-अंकों का पिन सेट करें').isVisible() || await page.locator('text=Create a 4-digit PIN').isVisible();
  5  |   if (!isSetup) {
  6  |     for (let i = 1; i <= 4; i++) await page.locator('button', { hasText: new RegExp(`^${i}$`) }).click();
  7  |   } else {
  8  |     for (let i = 1; i <= 4; i++) await page.locator('button', { hasText: new RegExp(`^${i}$`) }).click();
  9  |     const dialogInput = page.locator('div[role="dialog"] input');
  10 |     await dialogInput.waitFor({ state: 'visible' });
  11 |     await dialogInput.fill('PULSE99');
  12 |     await page.locator('div[role="dialog"] button', { hasText: /Continue|जारी रखें/ }).click();
  13 |   }
  14 |   
  15 |   const response = await page.waitForResponse(response => response.url().includes('/api/deals'));
  16 |   const json = await response.json();
  17 |   if (json.length > 0) {
  18 |       console.log(JSON.stringify(json[0], null, 2));
  19 |   }
  20 | });
  21 | 
```