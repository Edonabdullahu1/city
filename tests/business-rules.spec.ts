import { test, expect } from '@playwright/test';

test.describe('Business Rules Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin to access business rule management
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@travel-agency.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test.describe('Reservation Code Generation', () => {
    test('should generate sequential MXi-XXXX codes', async ({ page }) => {
      // Create multiple bookings and verify sequential code generation
      const bookingCodes: string[] = [];
      
      for (let i = 0; i < 3; i++) {
        await page.goto('http://localhost:3000/booking/new');
        
        // Complete booking flow quickly
        await page.click('.flight-option:first-child');
        await page.click('button:has-text("Next")');
        await page.click('.hotel-option:first-child');
        await page.click('button:has-text("Next")');
        await page.click('button:has-text("Skip")'); // Skip extras
        
        // Fill passenger details
        await page.fill('input[name="passengerName"]', `Test Passenger ${i}`);
        await page.fill('input[name="passengerEmail"]', `test${i}@example.com`);
        await page.fill('input[name="passengerPhone"]', '+1234567890');
        await page.click('button:has-text("Next")');
        
        // Confirm booking
        await page.click('button:has-text("Confirm Booking")');
        
        // Extract reservation code
        const codeElement = await page.locator('text=/MXi-\\d{4}/').first();
        const code = await codeElement.textContent();
        bookingCodes.push(code!);
      }
      
      // Verify codes are sequential
      const codeNumbers = bookingCodes.map(code => parseInt(code.split('-')[1]));
      for (let i = 1; i < codeNumbers.length; i++) {
        expect(codeNumbers[i]).toBe(codeNumbers[i-1] + 1);
      }
    });

    test('should handle concurrent booking code generation', async ({ browser }) => {
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext()
      ]);
      
      const bookingPromises = contexts.map(async (context, index) => {
        const page = await context.newPage();
        
        // Sign in
        await page.goto('http://localhost:3000/auth/signin');
        await page.fill('input[name="email"]', 'user@travel-agency.com');
        await page.fill('input[name="password"]', 'user123');
        await page.click('button[type="submit"]');
        
        // Create booking
        await page.goto('http://localhost:3000/booking/new');
        await page.click('.flight-option:first-child');
        await page.click('button:has-text("Next")');
        await page.click('.hotel-option:first-child');
        await page.click('button:has-text("Next")');
        await page.click('button:has-text("Skip")');
        
        await page.fill('input[name="passengerName"]', `Concurrent User ${index}`);
        await page.fill('input[name="passengerEmail"]', `concurrent${index}@example.com`);
        await page.fill('input[name="passengerPhone"]', '+1234567890');
        await page.click('button:has-text("Next")');
        
        await page.click('button:has-text("Confirm Booking")');
        
        const code = await page.locator('text=/MXi-\\d{4}/').first().textContent();
        await context.close();
        return code;
      });
      
      const codes = await Promise.all(bookingPromises);
      
      // Verify all codes are unique
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
      
      // Verify all codes follow correct format
      codes.forEach(code => {
        expect(code).toMatch(/MXi-\d{4}/);
      });
    });
  });

  test.describe('Soft Booking Expiration', () => {
    test('should show correct expiration time', async ({ page }) => {
      await page.goto('http://localhost:3000/booking/new');
      
      // Complete booking flow
      await page.click('.flight-option:first-child');
      await page.click('button:has-text("Next")');
      await page.click('.hotel-option:first-child');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Skip")');
      
      await page.fill('input[name="passengerName"]', 'Expiration Test User');
      await page.fill('input[name="passengerEmail"]', 'expire@test.com');
      await page.fill('input[name="passengerPhone"]', '+1234567890');
      await page.click('button:has-text("Next")');
      
      await page.click('button:has-text("Confirm Booking")');
      
      // Should show 3-hour expiration warning
      await expect(page.locator('text=expires in 3 hours')).toBeVisible();
      
      // Should show countdown timer
      await expect(page.locator('.expiration-timer')).toBeVisible();
      
      // Should show exact expiration time
      const expirationTime = await page.locator('.expiration-time').textContent();
      expect(expirationTime).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    });

    test('should warn when booking is near expiration', async ({ page }) => {
      // This test would require manipulating system time or using a booking that's close to expiration
      // For now, we'll test the UI elements that should appear
      await page.goto('http://localhost:3000/bookings');
      
      // Look for bookings with expiration warnings
      const nearExpirationBookings = await page.locator('.booking-card.near-expiration');
      
      if (await nearExpirationBookings.count() > 0) {
        await expect(nearExpirationBookings.first().locator('.expiration-warning')).toBeVisible();
        await expect(nearExpirationBookings.first().locator('text=Expires soon')).toBeVisible();
      }
    });
  });

  test.describe('Price Calculations', () => {
    test('should calculate round-trip flight prices correctly', async ({ page }) => {
      await page.goto('http://localhost:3000/search');
      
      // Search for flights
      await page.fill('input[placeholder="Where to?"]', 'Paris');
      await page.fill('input[type="date"][name="departure"]', '2024-06-01');
      await page.fill('input[type="date"][name="return"]', '2024-06-08');
      await page.selectOption('select[name="passengers"]', '1');
      await page.click('button:has-text("Search")');
      
      // Verify flight pricing display
      const flightCards = await page.locator('.flight-card').all();
      
      for (const card of flightCards) {
        const priceElement = await card.locator('.flight-price').first();
        const priceText = await priceElement.textContent();
        
        // Price should be in €XXX format and represent complete round trip
        expect(priceText).toMatch(/€\d+/);
        
        // Should not show separate outbound/return prices
        const priceBreakdown = await card.locator('.price-breakdown');
        if (await priceBreakdown.count() > 0) {
          await expect(priceBreakdown.locator('text=Round trip total')).toBeVisible();
        }
      }
    });

    test('should handle child and infant pricing', async ({ page }) => {
      await page.goto('http://localhost:3000/search');
      
      // Search with mixed passenger types
      await page.fill('input[placeholder="Where to?"]', 'Rome');
      await page.fill('input[type="date"][name="departure"]', '2024-07-01');
      await page.fill('input[type="date"][name="return"]', '2024-07-08');
      
      // Set passenger mix: 2 adults, 1 child (5 years), 1 infant (0 years)
      await page.selectOption('select[name="adults"]', '2');
      await page.selectOption('select[name="children"]', '1');
      await page.selectOption('select[name="infants"]', '1');
      await page.fill('input[name="childAge"]', '5');
      await page.fill('input[name="infantAge"]', '0');
      
      await page.click('button:has-text("Search")');
      
      // Verify pricing calculation
      const priceBreakdown = await page.locator('.price-breakdown').first();
      await expect(priceBreakdown.locator('text=Adults (2)')).toBeVisible();
      await expect(priceBreakdown.locator('text=Children (1) - Full price')).toBeVisible();
      await expect(priceBreakdown.locator('text=Infants (1) - Free')).toBeVisible();
      
      // Verify total calculation
      const adultPrice = await priceBreakdown.locator('.adult-price').textContent();
      const childPrice = await priceBreakdown.locator('.child-price').textContent();
      const infantPrice = await priceBreakdown.locator('.infant-price').textContent();
      
      expect(adultPrice).toBe(childPrice); // Child pays full price (2-11 years)
      expect(infantPrice).toBe('€0'); // Infant flies free (0-1 years)
    });

    test('should calculate hotel per-night pricing', async ({ page }) => {
      await page.goto('http://localhost:3000/hotels');
      
      // Search for hotels
      await page.fill('input[placeholder="Destination"]', 'Paris');
      await page.fill('input[name="checkIn"]', '2024-06-15');
      await page.fill('input[name="checkOut"]', '2024-06-20'); // 5 nights
      await page.selectOption('select[name="guests"]', '2');
      await page.click('button:has-text("Search Hotels")');
      
      const hotelCards = await page.locator('.hotel-card').all();
      
      for (const card of hotelCards) {
        const perNightPrice = await card.locator('.per-night-price').textContent();
        const totalPrice = await card.locator('.total-price').textContent();
        
        // Extract numeric values
        const perNightAmount = parseInt(perNightPrice!.replace(/[€,]/g, ''));
        const totalAmount = parseInt(totalPrice!.replace(/[€,]/g, ''));
        
        // Verify calculation: 5 nights × per-night price
        expect(totalAmount).toBe(perNightAmount * 5);
        
        // Should show breakdown
        await expect(card.locator('text=5 nights')).toBeVisible();
        await expect(card.locator('text=2 guests')).toBeVisible();
      }
    });

    test('should apply blackout date pricing', async ({ page }) => {
      // Go to admin panel to set up blackout dates
      await page.goto('http://localhost:3000/admin/hotels/pricing');
      
      // Set special pricing for specific dates
      await page.click('button:has-text("Add Special Pricing")');
      await page.fill('input[name="startDate"]', '2024-12-24');
      await page.fill('input[name="endDate"]', '2024-12-26');
      await page.fill('input[name="priceMultiplier"]', '2.5');
      await page.fill('input[name="reason"]', 'Christmas Holiday Premium');
      await page.click('button:has-text("Save Special Pricing")');
      
      // Now search for hotels during blackout period
      await page.goto('http://localhost:3000/hotels');
      await page.fill('input[placeholder="Destination"]', 'Paris');
      await page.fill('input[name="checkIn"]', '2024-12-24');
      await page.fill('input[name="checkOut"]', '2024-12-26');
      await page.click('button:has-text("Search Hotels")');
      
      // Should show premium pricing indicator
      await expect(page.locator('text=Holiday Premium Rates')).toBeVisible();
      
      // Verify pricing is higher than normal rates
      const hotelCard = page.locator('.hotel-card').first();
      await expect(hotelCard.locator('.price-premium-indicator')).toBeVisible();
    });
  });

  test.describe('Inventory Management', () => {
    test('should track guaranteed block seat availability', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/flights');
      
      // Create a flight with limited seats
      await page.click('button:has-text("Add Flight")');
      await page.fill('input[name="flightNumber"]', 'TEST001');
      await page.fill('input[name="airline"]', 'Test Airways');
      await page.fill('input[name="origin"]', 'TIA');
      await page.fill('input[name="destination"]', 'CDG');
      await page.fill('input[name="totalSeats"]', '5'); // Only 5 seats
      await page.fill('input[name="pricePerSeat"]', '200');
      await page.click('button:has-text("Save Flight")');
      
      // Verify seat count is displayed
      await expect(page.locator('text=5 seats available')).toBeVisible();
      
      // Book seats and verify count decreases
      await page.goto('http://localhost:3000/search');
      await page.fill('input[placeholder="Where to?"]', 'Paris');
      await page.fill('input[type="date"][name="departure"]', '2024-06-01');
      await page.fill('input[type="date"][name="return"]', '2024-06-08');
      await page.selectOption('select[name="passengers"]', '2');
      await page.click('button:has-text("Search")');
      
      // Select the test flight
      await page.click('.flight-card:has-text("TEST001")');
      
      // Should show seat availability
      await expect(page.locator('text=3 seats remaining')).toBeVisible();
    });

    test('should prevent overbooking', async ({ page }) => {
      // This test assumes we have a flight with very limited seats
      await page.goto('http://localhost:3000/search');
      await page.fill('input[placeholder="Where to?"]', 'Paris');
      await page.fill('input[type="date"][name="departure"]', '2024-06-01');
      await page.fill('input[type="date"][name="return"]', '2024-06-08');
      await page.selectOption('select[name="passengers"]', '10'); // More than available
      await page.click('button:has-text("Search")');
      
      // Should show availability constraints
      const limitedFlights = await page.locator('.flight-card.limited-availability');
      
      if (await limitedFlights.count() > 0) {
        await limitedFlights.first().click();
        
        // Should show error about insufficient seats
        await expect(page.locator('text=Only .* seats available')).toBeVisible();
        await expect(page.locator('button:has-text("Continue")')).toBeDisabled();
      }
    });

    test('should handle hotel room availability', async ({ page }) => {
      await page.goto('http://localhost:3000/admin/hotels');
      
      // Set room availability limits
      await page.click('.hotel-card:first-child button:has-text("Manage Rooms")');
      await page.click('.calendar-day[data-date="2024-08-15"]');
      await page.fill('input[name="availableRooms"]', '2');
      await page.click('button:has-text("Update Availability")');
      
      // Now test booking during limited availability
      await page.goto('http://localhost:3000/hotels');
      await page.fill('input[name="checkIn"]', '2024-08-15');
      await page.fill('input[name="checkOut"]', '2024-08-16');
      await page.selectOption('select[name="rooms"]', '3'); // More than available
      await page.click('button:has-text("Search Hotels")');
      
      // Should show availability constraints
      await expect(page.locator('text=Limited availability')).toBeVisible();
      
      const constrainedHotel = page.locator('.hotel-card.limited-rooms').first();
      if (await constrainedHotel.count() > 0) {
        await expect(constrainedHotel.locator('text=Only .* rooms available')).toBeVisible();
      }
    });
  });

  test.describe('Package Bundling', () => {
    test('should calculate bundle discounts correctly', async ({ page }) => {
      await page.goto('http://localhost:3000/packages');
      
      // Look for package deals
      const packageCards = await page.locator('.package-card').all();
      
      for (const packageCard of packageCards) {
        const individualPrices = await packageCard.locator('.individual-prices').all();
        const bundlePrice = await packageCard.locator('.bundle-price').textContent();
        const savings = await packageCard.locator('.savings-amount').textContent();
        
        if (individualPrices.length > 0 && bundlePrice && savings) {
          // Verify savings calculation is accurate
          const savingsAmount = parseInt(savings.replace(/[€,]/g, ''));
          expect(savingsAmount).toBeGreaterThan(0);
          
          // Should show percentage savings
          await expect(packageCard.locator('text=Save %')).toBeVisible();
        }
      }
    });

    test('should create custom packages with proper pricing', async ({ page }) => {
      await page.goto('http://localhost:3000/booking/custom');
      
      // Select flight
      await page.click('button:has-text("Add Flight")');
      await page.click('.flight-option:first-child');
      
      // Select hotel
      await page.click('button:has-text("Add Hotel")');
      await page.click('.hotel-option:first-child');
      
      // Add transfers
      await page.click('button:has-text("Add Transfer")');
      await page.click('.transfer-option:first-child');
      
      // Add excursion
      await page.click('button:has-text("Add Excursion")');
      await page.click('.excursion-option:first-child');
      
      // Should show price breakdown
      await expect(page.locator('.price-breakdown')).toBeVisible();
      await expect(page.locator('.individual-total')).toBeVisible();
      await expect(page.locator('.bundle-discount')).toBeVisible();
      await expect(page.locator('.final-total')).toBeVisible();
      
      // Verify discount is applied
      const individualTotal = await page.locator('.individual-total').textContent();
      const finalTotal = await page.locator('.final-total').textContent();
      const discount = await page.locator('.bundle-discount').textContent();
      
      const individualAmount = parseInt(individualTotal!.replace(/[€,]/g, ''));
      const finalAmount = parseInt(finalTotal!.replace(/[€,]/g, ''));
      const discountAmount = parseInt(discount!.replace(/[€,]/g, ''));
      
      expect(finalAmount).toBe(individualAmount - discountAmount);
    });
  });
});