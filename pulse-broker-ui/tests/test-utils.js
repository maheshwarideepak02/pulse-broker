import { expect } from '@playwright/test';

export async function loginToApp(page) {
    await page.goto('/');
    
    const btn1 = page.locator('button', { hasText: /^1$/ }).first();
    await expect(btn1).toBeEnabled({ timeout: 15000 });
    
    const isSetup = await page.locator('text=अपना पिन बनाएं').isVisible() || await page.locator('text=Create your PIN').isVisible() || await page.locator('text=4-अंकों का पिन सेट करें').isVisible() || await page.locator('text=Create a 4-digit PIN').isVisible();
    
    if (isSetup) {
      await page.locator('button', { hasText: /^1$/ }).click();
      await page.locator('button', { hasText: /^2$/ }).click();
      await page.locator('button', { hasText: /^3$/ }).click();
      await page.locator('button', { hasText: /^4$/ }).click();

      const dialogInput = page.locator('div[role="dialog"] input').first();
      await dialogInput.waitFor({ state: 'visible' });
      await dialogInput.fill('PULSE99');
      await page.getByTestId('prompt-confirm-btn').click();
      await page.waitForURL(/.*\/app\/dashboard/, { timeout: 15000 });
    } else {
      await page.locator('button', { hasText: /^1$/ }).click();
      await page.locator('button', { hasText: /^2$/ }).click();
      await page.locator('button', { hasText: /^3$/ }).click();
      await page.locator('button', { hasText: /^4$/ }).click();
      
      try {
          await page.waitForURL(/.*\/app\/dashboard/, { timeout: 3000 });
      } catch (e) {
          const resetBtn = page.getByTestId('reset-pin-btn');
          await resetBtn.waitFor({ state: 'visible' });
          await resetBtn.click();
          
          const dialogInput = page.locator('div[role="dialog"] input').first();
          await dialogInput.waitFor({ state: 'visible' });
          await dialogInput.fill('PULSE99');
          await page.getByTestId('prompt-confirm-btn').click();
          
          await expect(btn1).toBeEnabled({ timeout: 15000 });
          
          await page.locator('button', { hasText: /^1$/ }).click();
          await page.locator('button', { hasText: /^2$/ }).click();
          await page.locator('button', { hasText: /^3$/ }).click();
          await page.locator('button', { hasText: /^4$/ }).click();
    
          await dialogInput.waitFor({ state: 'visible' });
          await dialogInput.fill('PULSE99');
          await page.getByTestId('prompt-confirm-btn').click();
          await page.waitForURL(/.*\/app\/dashboard/, { timeout: 15000 });
      }
    }
}
