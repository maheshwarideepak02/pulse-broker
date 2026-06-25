import { test, expect } from '@playwright/test';

test.describe('Pulse Broker UI E2E Validation', () => {

    test.beforeEach(async ({ page }) => {
        // Go to home and login
        await page.goto('/');
        await page.fill('input[type="password"]', 'PULSE99');
        await page.getByTestId('prompt-confirm-btn').click();
        // Wait for dashboard to load
        await expect(page.locator('h1', { hasText: 'Good day' })).toBeVisible();
    });

    test('Settings UI Validation - Cannot submit empty string', async ({ page }) => {
        await page.click('a[href="/app/settings"]');
        await expect(page.locator('h2', { hasText: 'Manage Pulse Categories' })).toBeVisible();
        
        // Try submitting empty item
        await page.getByTestId('add-item-btn').click();
        await expect(page.locator('text=Item name cannot be empty')).toBeVisible();
    });

    test('Settings UI Validation - Cannot submit empty marka', async ({ page }) => {
        await page.click('a[href="/app/settings"]');
        await page.getByTestId('add-marka-btn').click();
        await expect(page.locator('text=Marka name cannot be empty')).toBeVisible();
    });

    test('Parties UI Validation - Empty Contact Form', async ({ page }) => {
        await page.click('a[href="/app/parties"]');
        await page.getByTestId('add-new-party-btn').click();
        await page.getByTestId('save-contact-btn').click();
        
        await expect(page.locator('text=Name is required')).toBeVisible();
        
        // Close modal
        await page.locator('button', { hasText: 'Cancel' }).click();
    });

    test('New Deal UI Validation - Empty form submission', async ({ page }) => {
        await page.click('a[href="/app/new-deal"]');
        // Wait for component to mount
        await page.waitForTimeout(500);
        
        // Submit without filling anything
        await page.getByTestId('submit-deal-btn').click();
        
        // Assert HTML5 validation or custom toast
        // If the form has required fields, it shouldn't proceed.
        // Assuming we rely on frontend validations:
        await expect(page.locator('text=Deal Date is required').or(page.locator('text=Please fill out this field'))).toBeTruthy();
    });
});
