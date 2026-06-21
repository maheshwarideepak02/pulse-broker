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