import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should display landing page', async ({ page }) => {
    await expect(page).toHaveTitle(/Travel.*Agency/i);
    await expect(page.locator('h2')).toContainText('Your Perfect City Break Awaits');
    await expect(page.locator('text=Sign In')).toBeVisible();
    await expect(page.locator('text=Sign Up')).toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    await page.click('text=Sign In');
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    await expect(page.locator('h2')).toContainText('Sign in to your account');
  });

  test('should sign in with valid credentials', async ({ page }) => {
    await page.click('text=Sign In');
    await page.fill('input[name="email"]', 'user@travel-agency.com');
    await page.fill('input[name="password"]', 'user123');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.click('text=Sign In');
    await page.fill('input[name="email"]', 'invalid@email.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should sign out successfully', async ({ page }) => {
    // First sign in
    await page.click('text=Sign In');
    await page.fill('input[name="email"]', 'user@travel-agency.com');
    await page.fill('input[name="password"]', 'user123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Then sign out
    await page.click('text=Sign Out');
    await expect(page).toHaveURL(/.*\//);
    await expect(page.locator('text=Sign In')).toBeVisible();
  });

  test('should navigate to sign up page', async ({ page }) => {
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*\/auth\/signup/);
    await expect(page.locator('h2')).toContainText('Create your account');
  });

  test('should create new account', async ({ page }) => {
    await page.click('text=Sign Up');
    
    const timestamp = Date.now();
    const email = `testuser${timestamp}@example.com`;
    
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL(/.*\/dashboard/);
  });
});