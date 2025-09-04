import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Example/);
});

test('navigation test', async ({ page }) => {
  await page.goto('/');
  const link = page.locator('a').first();
  await link.click();
  await expect(page).toHaveURL(/.*\/.*/);
});