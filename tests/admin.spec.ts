import { test, expect } from '@playwright/test';

test.describe('Admin Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@travel-agency.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should access admin dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/dashboard');
    
    await expect(page.locator('h2')).toContainText('Admin Dashboard');
    await expect(page.locator('text=Total Revenue')).toBeVisible();
    await expect(page.locator('text=Active Bookings')).toBeVisible();
    await expect(page.locator('text=Users')).toBeVisible();
    await expect(page.locator('text=System Health')).toBeVisible();
  });

  test('should manage hotels', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/hotels');
    
    // Add new hotel
    await page.click('button:has-text("Add Hotel")');
    await page.fill('input[name="name"]', 'Test Hotel');
    await page.fill('input[name="location"]', 'Test City');
    await page.fill('input[name="city"]', 'Paris');
    await page.fill('input[name="country"]', 'France');
    await page.selectOption('select[name="category"]', 'luxury');
    await page.selectOption('select[name="rating"]', '5');
    await page.fill('textarea[name="description"]', 'A luxury test hotel');
    await page.fill('input[name="totalRooms"]', '50');
    await page.click('button:has-text("Save Hotel")');
    
    // Should show success message
    await expect(page.locator('text=Hotel added successfully')).toBeVisible();
    
    // Should appear in list
    await expect(page.locator('text=Test Hotel')).toBeVisible();
  });

  test('should manage room availability', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/hotels');
    
    // Click on a hotel to manage
    await page.click('.hotel-card:first-child button:has-text("Manage Rooms")');
    
    // Should show availability calendar
    await expect(page.locator('text=Room Availability')).toBeVisible();
    await expect(page.locator('.availability-calendar')).toBeVisible();
    
    // Select dates to update pricing
    await page.click('.calendar-day[data-date="2024-06-15"]');
    await page.click('.calendar-day[data-date="2024-06-20"]');
    await page.click('button:has-text("Update Pricing")');
    
    await page.fill('input[name="priceOverride"]', '150');
    await page.click('button:has-text("Update")');
    
    // Should show updated prices
    await expect(page.locator('.calendar-day[data-date="2024-06-15"] .price')).toContainText('€150');
  });

  test('should manage flights', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/flights');
    
    // Add guaranteed block seats
    await page.click('button:has-text("Add Flight")');
    await page.fill('input[name="flightNumber"]', 'AA999');
    await page.fill('input[name="airline"]', 'Test Airlines');
    await page.fill('input[name="origin"]', 'TIA');
    await page.fill('input[name="destination"]', 'CDG');
    await page.fill('input[name="totalSeats"]', '20');
    await page.fill('input[name="pricePerSeat"]', '250');
    await page.click('button:has-text("Save Flight")');
    
    // Should show in list
    await expect(page.locator('text=AA999')).toBeVisible();
    await expect(page.locator('text=20 seats available')).toBeVisible();
  });

  test('should manage transfers', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/transfers');
    
    await page.click('button:has-text("Add Transfer")');
    await page.fill('input[name="name"]', 'Airport Express');
    await page.fill('input[name="fromLocation"]', 'Tirana Airport');
    await page.fill('input[name="toLocation"]', 'City Center');
    await page.selectOption('select[name="vehicleType"]', 'Van');
    await page.fill('input[name="capacity"]', '8');
    await page.fill('input[name="price"]', '25');
    await page.fill('input[name="duration"]', '30');
    await page.click('button:has-text("Add Transfer")');
    
    // Should appear in list
    await expect(page.locator('text=Airport Express')).toBeVisible();
  });

  test('should manage excursions', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/excursions');
    
    await page.click('button:has-text("Add Excursion")');
    await page.fill('input[name="title"]', 'City Walking Tour');
    await page.fill('textarea[name="description"]', 'Explore the historic city center');
    await page.fill('input[name="location"]', 'Paris');
    await page.fill('input[name="duration"]', '180');
    await page.fill('input[name="price"]', '45');
    await page.fill('input[name="capacity"]', '20');
    await page.fill('input[name="meetingPoint"]', 'Hotel Lobby');
    await page.click('button:has-text("Add Excursion")');
    
    // Should appear in list
    await expect(page.locator('text=City Walking Tour')).toBeVisible();
  });

  test('should manage email templates', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/email-templates');
    
    // Edit a template
    await page.click('.template-card:first-child button:has-text("Edit")');
    
    // Should open editor
    await expect(page.locator('text=Edit Template')).toBeVisible();
    
    await page.fill('input[name="subject"]', 'Updated: Your Booking {{reservationCode}}');
    await page.click('button:has-text("Save Changes")');
    
    // Should show success
    await expect(page.locator('text=Template updated')).toBeVisible();
  });

  test('should view reports', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/reports');
    
    // Select date range
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-12-31');
    await page.click('button:has-text("Generate Report")');
    
    // Should show report data
    await expect(page.locator('text=Report Generated')).toBeVisible();
    await expect(page.locator('.revenue-chart')).toBeVisible();
    await expect(page.locator('.bookings-table')).toBeVisible();
    
    // Download report
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export PDF")')
    ]);
    
    expect(download.suggestedFilename()).toContain('report');
  });

  test('should manage users', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/users');
    
    // Should show users list
    await expect(page.locator('text=User Management')).toBeVisible();
    
    // Change user role
    await page.click('.user-row:first-child button:has-text("Edit")');
    await page.selectOption('select[name="role"]', 'AGENT');
    await page.click('button:has-text("Save")');
    
    // Should show success
    await expect(page.locator('text=User role updated')).toBeVisible();
  });
});