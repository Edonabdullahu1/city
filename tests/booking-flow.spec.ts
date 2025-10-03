import { test, expect } from '@playwright/test';

test.describe('Comprehensive Booking Flow', () => {
  const packageUrl = 'http://localhost:3006/packages/city-break-cyprus';
  const bookingUrl = 'http://localhost:3006/booking';

  test.beforeEach(async ({ page }) => {
    // Navigate to package detail page
    await page.goto(packageUrl);
  });

  test('Complete Booking Flow with Validation', async ({ page }) => {
    // Step 0: Navigate to Booking Page
    await page.click('button:has-text("Book Now")');
    await expect(page).toHaveURL(/\/booking/);

    // Verify URL parameters
    const url = page.url();
    expect(url).toContain('packageId=');
    expect(url).toContain('hotelId=');
    expect(url).toContain('adults=2');
    expect(url).toContain('children=1');

    // Step 1: Passenger Details
    // Test date picker
    const datePicker = page.locator('input[type="date"]');
    await datePicker.fill('2024-09-15');
    
    // Validate date input
    const inputValue = await datePicker.inputValue();
    expect(inputValue).toBe('2024-09-15');

    // Fill passenger details
    const passengerFields = [
      { name: 'passengers[0].firstName', value: 'John' },
      { name: 'passengers[0].lastName', value: 'Doe' },
      { name: 'passengers[0].dateOfBirth', value: '1980-01-01' },
      { name: 'passengers[1].firstName', value: 'Jane' },
      { name: 'passengers[1].lastName', value: 'Doe' },
      { name: 'passengers[1].dateOfBirth', value: '1982-02-02' },
      { name: 'passengers[2].firstName', value: 'Junior' },
      { name: 'passengers[2].lastName', value: 'Doe' },
      { name: 'passengers[2].dateOfBirth', value: '2018-03-03' }
    ];

    // Fill out passenger details
    for (const field of passengerFields) {
      await page.fill(`input[name="${field.name}"]`, field.value);
    }

    // Validate passenger types
    const passengerTypes = await page.locator('.passenger-type').allTextContents();
    expect(passengerTypes).toEqual(['Adult', 'Adult', 'Child']);

    // Move to next step
    await page.click('button:has-text("Next")');

    // Step 2: Contact Information
    await page.fill('input[name="contactEmail"]', 'john.doe@example.com');
    await page.fill('input[name="contactPhone"]', '+1234567890');

    // Select country code
    await page.click('select[name="countryCode"]');
    await page.selectOption('select[name="countryCode"]', '+1');

    // Move to next step
    await page.click('button:has-text("Next")');

    // Step 3: Summary and Confirmation
    // Verify details are displayed correctly
    const summaryTexts = [
      'John Doe', 
      'Jane Doe', 
      'Junior Doe', 
      'john.doe@example.com', 
      '+1234567890'
    ];

    for (const text of summaryTexts) {
      await expect(page.getByText(text)).toBeVisible();
    }

    // Verify price calculation (basic check)
    const priceElement = page.locator('.total-price');
    const priceText = await priceElement.textContent();
    expect(priceText).toMatch(/€\d+/);

    // Final booking submission
    await page.click('button:has-text("Confirm Booking")');

    // Booking confirmation checks
    await expect(page.getByText('Booking Confirmed')).toBeVisible();
    await expect(page.getByText(/MXi-\d{4}/)).toBeVisible(); // Reservation code
    await expect(page.getByText('expires in 3 hours')).toBeVisible();
  });

  test('Form Validation Prevents Progression', async ({ page }) => {
    await page.goto(bookingUrl);

    // Attempt to progress without filling required fields
    await page.click('button:has-text("Next")');

    // Verify validation messages
    const validationMessages = [
      'First Name is required',
      'Last Name is required', 
      'Date of Birth is required'
    ];

    for (const message of validationMessages) {
      await expect(page.getByText(message)).toBeVisible();
    }

    // Verify page does not change
    expect(page.url()).toContain('/booking');
  });
});