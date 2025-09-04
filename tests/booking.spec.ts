import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test.use({
    storageState: 'tests/auth.json' // Assumes authenticated state
  });

  test.beforeEach(async ({ page }) => {
    // Sign in as a user first
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'user@travel-agency.com');
    await page.fill('input[name="password"]', 'user123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should search for flights', async ({ page }) => {
    await page.goto('http://localhost:3000/search');
    
    // Fill search form
    await page.fill('input[placeholder="Where to?"]', 'Paris');
    await page.fill('input[type="date"][name="departure"]', '2024-06-01');
    await page.fill('input[type="date"][name="return"]', '2024-06-08');
    await page.selectOption('select[name="passengers"]', '2');
    
    await page.click('button:has-text("Search")');
    
    // Should show search results
    await expect(page.locator('text=Search Results')).toBeVisible();
    await expect(page.locator('.flight-card')).toHaveCount(3); // Expecting mock data
  });

  test('should create a soft booking', async ({ page }) => {
    await page.goto('http://localhost:3000/booking/new');
    
    // Step 1: Flight selection
    await page.click('.flight-option:first-child');
    await page.click('button:has-text("Next")');
    
    // Step 2: Hotel selection
    await page.click('.hotel-option:first-child');
    await page.click('button:has-text("Next")');
    
    // Step 3: Extras (skip)
    await page.click('button:has-text("Skip")');
    
    // Step 4: Passenger details
    await page.fill('input[name="passengerName"]', 'John Doe');
    await page.fill('input[name="passengerEmail"]', 'john@example.com');
    await page.fill('input[name="passengerPhone"]', '+1234567890');
    await page.click('button:has-text("Next")');
    
    // Step 5: Review
    await page.click('button:has-text("Confirm Booking")');
    
    // Should show confirmation with reservation code
    await expect(page.locator('text=/MXi-\\d{4}/')).toBeVisible();
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
    await expect(page.locator('text=expires in 3 hours')).toBeVisible();
  });

  test('should view booking details', async ({ page }) => {
    await page.goto('http://localhost:3000/bookings');
    
    // Should show list of bookings
    await expect(page.locator('h2')).toContainText('My Bookings');
    
    // Click on first booking
    await page.click('.booking-card:first-child');
    
    // Should show booking details
    await expect(page.locator('text=Booking Details')).toBeVisible();
    await expect(page.locator('text=/MXi-\\d{4}/')).toBeVisible();
    await expect(page.locator('text=Flight Information')).toBeVisible();
    await expect(page.locator('text=Hotel Information')).toBeVisible();
  });

  test('should download booking documents', async ({ page }) => {
    await page.goto('http://localhost:3000/bookings');
    await page.click('.booking-card:first-child');
    
    // Test download buttons
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download Confirmation")')
    ]);
    
    expect(download.suggestedFilename()).toContain('confirmation');
  });

  test('should show payment instructions', async ({ page }) => {
    await page.goto('http://localhost:3000/bookings');
    await page.click('.booking-card:first-child');
    await page.click('button:has-text("Make Payment")');
    
    // Should show payment instructions
    await expect(page.locator('text=Payment Instructions')).toBeVisible();
    await expect(page.locator('text=Bank Transfer Details')).toBeVisible();
    await expect(page.locator('text=IBAN')).toBeVisible();
    await expect(page.locator('text=SWIFT')).toBeVisible();
    await expect(page.locator('text=Payment Reference')).toBeVisible();
  });
});

test.describe('Agent Booking Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as agent
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'agent@travel-agency.com');
    await page.fill('input[name="password"]', 'agent123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should access agent dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/agent/dashboard');
    
    await expect(page.locator('h2')).toContainText('Agent Dashboard');
    await expect(page.locator('text=Total Bookings')).toBeVisible();
    await expect(page.locator('text=Commission')).toBeVisible();
    await expect(page.locator('text=Performance')).toBeVisible();
  });

  test('should modify booking', async ({ page }) => {
    await page.goto('http://localhost:3000/agent/bookings');
    
    // Click on a booking to modify
    await page.click('.booking-row:first-child button:has-text("Modify")');
    
    // Should open modification modal
    await expect(page.locator('text=Booking Modification')).toBeVisible();
    
    // Change dates
    await page.click('button:has-text("Change Dates")');
    await page.fill('input[name="newCheckIn"]', '2024-06-15');
    await page.fill('input[name="newCheckOut"]', '2024-06-22');
    await page.click('button:has-text("Confirm Modification")');
    
    // Should show modification fee
    await expect(page.locator('text=Modification fee')).toBeVisible();
    await page.click('button:has-text("Accept & Process")');
    
    // Should show success message
    await expect(page.locator('text=Modification successful')).toBeVisible();
  });

  test('should cancel booking', async ({ page }) => {
    await page.goto('http://localhost:3000/agent/bookings');
    
    // Click on a booking to cancel
    await page.click('.booking-row:first-child button:has-text("Cancel")');
    
    // Should show cancellation modal
    await expect(page.locator('text=Cancel Booking')).toBeVisible();
    await expect(page.locator('text=Cancellation fee')).toBeVisible();
    
    await page.fill('textarea[name="reason"]', 'Customer request');
    await page.click('button:has-text("Confirm Cancellation")');
    
    // Should show success message
    await expect(page.locator('text=Booking cancelled')).toBeVisible();
  });
});