import { test, expect } from '@playwright/test';
import { loginToApp } from './test-utils';

async function navTo(page, testId, isMoreMenu) {
    const isMobile = page.viewportSize().width < 1024;
    if (isMobile && isMoreMenu) await page.getByTestId('nav-mobile-more').click();
    await page.getByTestId(isMobile ? `nav-mobile-${testId}` : `nav-${testId}`).click();
}

test.describe('Pulse Broker UI E2E Validation', () => {

    test.beforeEach(async ({ page }) => {
        await loginToApp(page);
    });

    test('Settings UI Validation - Cannot submit empty string', async ({ page }) => {
        await navTo(page, 'settings', true);
        await expect(page.locator('h2', { hasText: 'Manage Pulse Categories' })).toBeVisible();
        
        await page.getByTestId('add-item-btn').click();
        await expect(page.locator('text=Item name is required')).toBeVisible();
    });

    test('Settings UI Validation - Cannot submit empty marka', async ({ page }) => {
        await navTo(page, 'settings', true);
        await page.getByTestId('add-marka-btn').click();
        await expect(page.locator('text=Marka name is required')).toBeVisible();
    });

    test('Parties UI Validation - Empty Contact Form', async ({ page }) => {
        await navTo(page, 'parties', false);
        await page.getByTestId('add-new-party-btn').click();
        await page.getByTestId('save-contact-btn').click();
        
        await expect(page.locator('text=Name is required')).toBeVisible();
        
        await page.locator('button', { hasText: 'Cancel' }).first().click();
    });

    test('New Deal UI Validation - Empty form submission', async ({ page }) => {
        await navTo(page, 'new-deal', false);
        await page.waitForTimeout(500);
        
        await page.getByTestId('submit-deal-btn').click();
        
        await expect(page).toHaveURL(/.*\/app\/new-deal/);
    });
});
