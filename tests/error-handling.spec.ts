import { test, expect } from '@playwright/test';

test.describe('Error Handling and Validation', () => {
  
  test.describe('Input Validation', () => {
    test('should validate email formats', async ({ page }) => {
      await page.goto('http://localhost:3000/auth/signup');
      
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@domain.com',
        'test..test@domain.com',
        'test@domain',
        'test@.com',
        'test space@domain.com'
      ];
      
      for (const email of invalidEmails) {
        await page.fill('input[name="email"]', email);
        await page.click('button[type="submit"]');
        
        // Should show email validation error
        await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
        
        // Form should not submit
        await expect(page).toHaveURL(/.*\/auth\/signup/);
      }
      
      // Valid email should work
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', 'valid@example.com');
      await page.fill('input[name="password"]', 'ValidPassword123!');
      await page.fill('input[name="confirmPassword"]', 'ValidPassword123!');
      await page.click('button[type="submit"]');
      
      // Should proceed (no validation error for email)
      await expect(page.locator('text=Please enter a valid email address')).not.toBeVisible();
    });
    
    test('should validate password strength', async ({ page }) => {
      await page.goto('http://localhost:3000/auth/signup');
      
      const weakPasswords = [
        'abc',           // Too short
        '12345678',      // Only numbers
        'password',      // Only lowercase letters
        'PASSWORD',      // Only uppercase letters
        'Password',      // No numbers or special chars
        'Pass123'        // No special characters
      ];
      
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', 'test@example.com');
      
      for (const password of weakPasswords) {
        await page.fill('input[name="password"]', password);
        await page.fill('input[name="confirmPassword"]', password);
        
        // Should show password strength indicator
        const strengthIndicator = page.locator('.password-strength');
        if (await strengthIndicator.count() > 0) {
          await expect(strengthIndicator).toHaveClass(/weak|invalid/);
        }
        
        await page.click('button[type="submit"]');
        
        // Should show password validation error
        await expect(page.locator('.password-error')).toBeVisible();
      }
      
      // Strong password should work
      await page.fill('input[name="password"]', 'StrongPass123!@#');
      await page.fill('input[name="confirmPassword"]', 'StrongPass123!@#');
      
      const strengthIndicator = page.locator('.password-strength');
      if (await strengthIndicator.count() > 0) {
        await expect(strengthIndicator).toHaveClass(/strong|valid/);
      }
    });
    
    test('should validate date ranges', async ({ page }) => {
      await page.goto('http://localhost:3000/search');
      
      // Test past dates
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];
      
      await page.fill('input[name="departure"]', yesterdayString);
      await page.fill('input[name="return"]', yesterdayString);
      await page.click('button:has-text("Search")');
      
      // Should show error for past dates
      await expect(page.locator('text=Departure date cannot be in the past')).toBeVisible();
      
      // Test return before departure
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      const dayAfterTomorrowString = dayAfterTomorrow.toISOString().split('T')[0];
      
      await page.fill('input[name="departure"]', dayAfterTomorrowString);
      await page.fill('input[name="return"]', tomorrowString);
      await page.click('button:has-text("Search")');
      
      // Should show error for invalid date range
      await expect(page.locator('text=Return date must be after departure date')).toBeVisible();
    });
    
    test('should validate passenger information', async ({ page }) => {
      // Sign in and start booking
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'user@travel-agency.com');
      await page.fill('input[name="password"]', 'user123');
      await page.click('button[type="submit"]');
      
      await page.goto('http://localhost:3000/booking/new');
      
      // Quick navigation to passenger details
      await page.click('.flight-option:first-child');
      await page.click('button:has-text("Next")');
      await page.click('.hotel-option:first-child');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Skip")');
      
      // Test invalid passenger data
      const invalidInputs = [
        { field: 'passengerName', value: '', error: 'Passenger name is required' },
        { field: 'passengerName', value: 'A', error: 'Name must be at least 2 characters' },
        { field: 'passengerName', value: '123', error: 'Name cannot contain numbers' },
        { field: 'passengerEmail', value: 'invalid', error: 'Please enter a valid email' },
        { field: 'passengerPhone', value: '123', error: 'Please enter a valid phone number' },
        { field: 'passengerPhone', value: 'abc123', error: 'Phone number can only contain digits' }
      ];
      
      for (const input of invalidInputs) {
        await page.fill(`input[name="${input.field}"]`, input.value);
        await page.click('button:has-text("Next")');
        
        // Should show specific validation error
        await expect(page.locator(`text=${input.error}`)).toBeVisible();
      }
    });
  });
  
  test.describe('API Error Handling', () => {
    test('should handle flight search API failures', async ({ page, context }) => {
      // Intercept flight search API and simulate failure
      await page.route('**/api/flights/search', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Flight search service unavailable' })
        });
      });
      
      await page.goto('http://localhost:3000/search');
      await page.fill('input[placeholder="Where to?"]', 'Paris');
      await page.fill('input[type="date"][name="departure"]', '2024-06-01');
      await page.fill('input[type="date"][name="return"]', '2024-06-08');
      await page.click('button:has-text("Search")');
      
      // Should show user-friendly error message
      await expect(page.locator('text=Unable to search flights at this time')).toBeVisible();
      await expect(page.locator('text=Please try again later')).toBeVisible();
      
      // Should show retry button
      await expect(page.locator('button:has-text("Retry Search")')).toBeVisible();
    });
    
    test('should handle hotel search API failures', async ({ page }) => {
      // Intercept hotel search API and simulate timeout
      await page.route('**/api/hotels/search', route => {
        // Simulate timeout by not responding
        setTimeout(() => {
          route.fulfill({
            status: 408,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Request timeout' })
          });
        }, 5000);
      });
      
      await page.goto('http://localhost:3000/search');
      await page.fill('input[placeholder="Destination"]', 'Rome');
      await page.click('button:has-text("Search Hotels")');
      
      // Should show loading state
      await expect(page.locator('.loading-spinner')).toBeVisible();
      
      // After timeout, should show error
      await expect(page.locator('text=Search request timed out')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    });
    
    test('should handle booking creation failures', async ({ page }) => {
      // Sign in first
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'user@travel-agency.com');
      await page.fill('input[name="password"]', 'user123');
      await page.click('button[type="submit"]');
      
      // Intercept booking creation API
      await page.route('**/api/bookings', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Insufficient inventory',
              message: 'The selected flight is no longer available'
            })
          });
        } else {
          route.continue();
        }
      });
      
      await page.goto('http://localhost:3000/booking/new');
      
      // Complete booking flow
      await page.click('.flight-option:first-child');
      await page.click('button:has-text("Next")');
      await page.click('.hotel-option:first-child');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Skip")');
      
      await page.fill('input[name="passengerName"]', 'Test User');
      await page.fill('input[name="passengerEmail"]', 'test@example.com');
      await page.fill('input[name="passengerPhone"]', '+1234567890');
      await page.click('button:has-text("Next")');
      
      await page.click('button:has-text("Confirm Booking")');
      
      // Should show specific error message
      await expect(page.locator('text=The selected flight is no longer available')).toBeVisible();
      await expect(page.locator('button:has-text("Search Alternative Flights")')).toBeVisible();
    });
    
    test('should handle payment verification failures', async ({ page }) => {
      // Intercept payment verification API
      await page.route('**/api/payments/verify', route => {
        route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Payment verification failed',
            message: 'Bank transfer reference not found'
          })
        });
      });
      
      await page.goto('http://localhost:3000/bookings/MXi-0001/payment');
      await page.fill('input[name="transferReference"]', 'INVALID-REF-123');
      await page.click('button:has-text("Verify Payment")');
      
      // Should show payment error
      await expect(page.locator('text=Bank transfer reference not found')).toBeVisible();
      await expect(page.locator('text=Please check your transfer reference')).toBeVisible();
    });
    
    test('should handle external service failures gracefully', async ({ page }) => {
      // Test email service failure
      await page.route('**/api/notifications/email', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Email service unavailable' })
        });
      });
      
      // Test WhatsApp service failure
      await page.route('**/api/notifications/whatsapp', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'WhatsApp service unavailable' })
        });
      });
      
      // Create booking (should succeed despite notification failures)
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'user@travel-agency.com');
      await page.fill('input[name="password"]', 'user123');
      await page.click('button[type="submit"]');
      
      await page.goto('http://localhost:3000/booking/new');
      
      // Complete booking
      await page.click('.flight-option:first-child');
      await page.click('button:has-text("Next")');
      await page.click('.hotel-option:first-child');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Skip")');
      
      await page.fill('input[name="passengerName"]', 'Service Failure Test');
      await page.fill('input[name="passengerEmail"]', 'failure@test.com');
      await page.fill('input[name="passengerPhone"]', '+1234567890');
      await page.click('button:has-text("Next")');
      
      await page.click('button:has-text("Confirm Booking")');
      
      // Booking should succeed
      await expect(page.locator('text=/MXi-\\d{4}/')).toBeVisible();
      
      // Should show warning about notification failures
      await expect(page.locator('text=Booking confirmed, but some notifications may be delayed')).toBeVisible();
    });
  });
  
  test.describe('Database Error Handling', () => {
    test('should handle database connection failures', async ({ page }) => {
      // Intercept all API calls and simulate database errors
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Database connection failed',
            message: 'Please try again later'
          })
        });
      });
      
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'user@travel-agency.com');
      await page.fill('input[name="password"]', 'user123');
      await page.click('button[type="submit"]');
      
      // Should show database error message
      await expect(page.locator('text=Service temporarily unavailable')).toBeVisible();
      await expect(page.locator('text=Please try again later')).toBeVisible();
    });
    
    test('should handle transaction rollback scenarios', async ({ page }) => {
      // Simulate partial booking failure (transaction rollback)
      await page.route('**/api/bookings', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Transaction failed',
              message: 'Booking could not be completed. No charges have been made.',
              type: 'TRANSACTION_ROLLBACK'
            })
          });
        } else {
          route.continue();
        }
      });
      
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'user@travel-agency.com');
      await page.fill('input[name="password"]', 'user123');
      await page.click('button[type="submit"]');
      
      await page.goto('http://localhost:3000/booking/new');
      
      // Complete booking flow
      await page.click('.flight-option:first-child');
      await page.click('button:has-text("Next")');
      await page.click('.hotel-option:first-child');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Skip")');
      
      await page.fill('input[name="passengerName"]', 'Transaction Test');
      await page.fill('input[name="passengerEmail"]', 'transaction@test.com');
      await page.fill('input[name="passengerPhone"]', '+1234567890');
      await page.click('button:has-text("Next")');
      
      await page.click('button:has-text("Confirm Booking")');
      
      // Should show transaction failure message
      await expect(page.locator('text=Booking could not be completed')).toBeVisible();
      await expect(page.locator('text=No charges have been made')).toBeVisible();
      await expect(page.locator('button:has-text("Start New Booking")')).toBeVisible();
    });
  });
  
  test.describe('Rate Limiting and Abuse Prevention', () => {
    test('should handle API rate limiting', async ({ page }) => {
      // Simulate rate limiting response
      await page.route('**/api/flights/search', route => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          headers: {
            'Retry-After': '60'
          },
          body: JSON.stringify({ 
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please wait before trying again.',
            retryAfter: 60
          })
        });
      });
      
      await page.goto('http://localhost:3000/search');
      await page.fill('input[placeholder="Where to?"]', 'Madrid');
      await page.click('button:has-text("Search")');
      
      // Should show rate limit message
      await expect(page.locator('text=Too many requests')).toBeVisible();
      await expect(page.locator('text=Please wait 60 seconds')).toBeVisible();
      
      // Search button should be disabled temporarily
      await expect(page.locator('button:has-text("Search")')).toBeDisabled();
    });
    
    test('should handle login attempt limiting', async ({ page }) => {
      await page.goto('http://localhost:3000/auth/signin');
      
      // Simulate multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await page.fill('input[name="email"]', 'user@travel-agency.com');
        await page.fill('input[name="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        
        if (i < 4) {
          await expect(page.locator('text=Invalid credentials')).toBeVisible();
        }
      }
      
      // After multiple failures, should show account lockout
      await expect(page.locator('text=Account temporarily locked')).toBeVisible();
      await expect(page.locator('text=Too many failed login attempts')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });
  });
  
  test.describe('File Upload Error Handling', () => {
    test('should handle invalid file uploads', async ({ page }) => {
      await page.goto('http://localhost:3000/profile/documents');
      
      // Test file size limit
      const fileInput = page.locator('input[type="file"]');
      
      // Simulate large file upload
      await fileInput.setInputFiles({
        name: 'large-file.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.alloc(10 * 1024 * 1024) // 10MB file
      });
      
      await page.click('button:has-text("Upload")');
      
      // Should show file size error
      await expect(page.locator('text=File size exceeds limit')).toBeVisible();
      await expect(page.locator('text=Maximum file size is 5MB')).toBeVisible();
      
      // Test invalid file type
      await fileInput.setInputFiles({
        name: 'document.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('This is a text file')
      });
      
      await page.click('button:has-text("Upload")');
      
      // Should show file type error
      await expect(page.locator('text=Invalid file type')).toBeVisible();
      await expect(page.locator('text=Only PDF, JPG, PNG files are allowed')).toBeVisible();
    });
  });
  
  test.describe('Session and Authentication Errors', () => {
    test('should handle session expiration', async ({ page }) => {
      // Sign in first
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'user@travel-agency.com');
      await page.fill('input[name="password"]', 'user123');
      await page.click('button[type="submit"]');
      
      // Simulate session expiration by intercepting protected routes
      await page.route('**/api/bookings', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Session expired',
            message: 'Please sign in again'
          })
        });
      });
      
      await page.goto('http://localhost:3000/bookings');
      
      // Should redirect to login with message
      await expect(page).toHaveURL(/.*\/auth\/signin/);
      await expect(page.locator('text=Your session has expired')).toBeVisible();
      await expect(page.locator('text=Please sign in again')).toBeVisible();
    });
    
    test('should handle unauthorized access attempts', async ({ page }) => {
      // Try to access admin panel without admin privileges
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'user@travel-agency.com');
      await page.fill('input[name="password"]', 'user123');
      await page.click('button[type="submit"]');
      
      await page.goto('http://localhost:3000/admin/dashboard');
      
      // Should show unauthorized access error
      await expect(page.locator('text=Access Denied')).toBeVisible();
      await expect(page.locator('text=You do not have permission to access this page')).toBeVisible();
      
      // Should redirect to appropriate dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
    });
  });
  
  test.describe('Network Error Recovery', () => {
    test('should handle network connectivity issues', async ({ page, context }) => {
      await page.goto('http://localhost:3000/search');
      
      // Simulate network failure
      await context.setOffline(true);
      
      await page.fill('input[placeholder="Where to?"]', 'London');
      await page.click('button:has-text("Search")');
      
      // Should show network error
      await expect(page.locator('text=Network connection error')).toBeVisible();
      await expect(page.locator('text=Please check your internet connection')).toBeVisible();
      
      // Restore network
      await context.setOffline(false);
      
      // Should show retry option
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
      
      await page.click('button:has-text("Retry")');
      
      // Should retry the search
      await expect(page.locator('text=Searching flights...')).toBeVisible();
    });
  });
});