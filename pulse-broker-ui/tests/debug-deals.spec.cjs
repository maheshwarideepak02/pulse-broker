const { test, expect } = require('@playwright/test');
test('Debug API', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
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
  
  const response = await page.waitForResponse(response => response.url().includes('/api/deals'));
  const json = await response.json();
  if (json.length > 0) {
      console.log(JSON.stringify(json[0], null, 2));
  }
});
