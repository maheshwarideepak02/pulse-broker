# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug-deals.spec.cjs >> Debug API
- Location: tests/debug-deals.spec.cjs:2:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForResponse: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - button "हिंदी" [ref=e6]
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e10]: ॐ
        - generic [ref=e11]: First-time setup
        - heading "Create your PIN" [level=2] [ref=e12]
        - paragraph [ref=e13]: Choose a memorable 4-digit PIN
      - generic [ref=e20]:
        - button "1" [ref=e21]
        - button "2" [ref=e22]
        - button "3" [ref=e23]
        - button "4" [ref=e24]
        - button "5" [ref=e25]
        - button "6" [ref=e26]
        - button "7" [ref=e27]
        - button "8" [ref=e28]
        - button "9" [ref=e29]
        - button "0" [ref=e31]
        - button "⌫" [ref=e32]
  - dialog "Authorise setup" [ref=e33]:
    - generic [ref=e35]:
      - generic [ref=e36]:
        - heading "Authorise setup" [level=2] [ref=e37]
        - paragraph [ref=e38]: Enter the server master secret to continue securely.
        - generic [ref=e39]: Master secret
        - textbox [active] [ref=e40]
      - generic [ref=e41]:
        - button "Cancel" [ref=e42]
        - button "Continue" [ref=e43]
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | test('Debug API', async ({ page }) => {
  3  |   await page.goto('http://localhost:5173/login');
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
> 15 |   const response = await page.waitForResponse(response => response.url().includes('/api/deals'));
     |                               ^ Error: page.waitForResponse: Test timeout of 30000ms exceeded.
  16 |   const json = await response.json();
  17 |   if (json.length > 0) {
  18 |       console.log(JSON.stringify(json[0], null, 2));
  19 |   }
  20 | });
  21 | 
```