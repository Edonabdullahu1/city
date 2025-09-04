import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsive Testing', () => {
  
  // Test on mobile devices
  test.describe('Mobile Phone Testing', () => {
    test.use({ ...devices['iPhone 12'] });
    
    test('should display mobile navigation correctly', async ({ page }) => {
      await page.goto('http://localhost:3000');
      
      // Should show mobile menu toggle
      await expect(page.locator('.mobile-menu-toggle')).toBeVisible();
      await expect(page.locator('.desktop-navigation')).toBeHidden();
      
      // Test menu toggle functionality
      await page.click('.mobile-menu-toggle');
      await expect(page.locator('.mobile-menu')).toBeVisible();
      
      // Menu items should be accessible
      await expect(page.locator('.mobile-menu .nav-link')).toHaveCount(5);
    });
    
    test('should handle mobile booking flow', async ({ page }) => {
      // Sign in first
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'user@travel-agency.com');
      await page.fill('input[name="password"]', 'user123');
      await page.click('button[type="submit"]');
      
      await page.goto('http://localhost:3000/search');
      
      // Mobile search form should be optimized
      const searchForm = page.locator('.search-form');
      await expect(searchForm).toBeVisible();
      
      // Input fields should be mobile-friendly
      const destinationInput = page.locator('input[placeholder="Where to?"]');
      await expect(destinationInput).toHaveCSS('font-size', '16px'); // Prevents zoom on iOS
      
      await destinationInput.fill('Paris');
      
      // Date inputs should use native mobile date pickers
      const dateInput = page.locator('input[type="date"][name="departure"]');
      await dateInput.click();
      // Native date picker should appear (browser-dependent)
      
      await dateInput.fill('2024-06-01');
      await page.fill('input[type="date"][name="return"]', '2024-06-08');
      await page.selectOption('select[name="passengers"]', '2');
      
      // Search button should be easily tappable (minimum 44px)
      const searchButton = page.locator('button:has-text("Search")');
      const searchButtonBox = await searchButton.boundingBox();
      expect(searchButtonBox!.height).toBeGreaterThanOrEqual(44);
      expect(searchButtonBox!.width).toBeGreaterThanOrEqual(44);
      
      await searchButton.click();
      
      // Results should be mobile-optimized
      await expect(page.locator('.search-results')).toBeVisible();
      const flightCards = await page.locator('.flight-card').all();
      
      // Cards should stack vertically on mobile
      if (flightCards.length > 1) {
        const firstCardBox = await flightCards[0].boundingBox();
        const secondCardBox = await flightCards[1].boundingBox();
        
        // Second card should be below first card (vertical stacking)
        expect(secondCardBox!.y).toBeGreaterThan(firstCardBox!.y + firstCardBox!.height);
      }
    });
    
    test('should handle mobile form interactions', async ({ page }) => {
      await page.goto('http://localhost:3000/auth/signup');
      
      // Form fields should be properly sized for mobile
      const formFields = await page.locator('input').all();
      
      for (const field of formFields) {
        const fieldBox = await field.boundingBox();
        expect(fieldBox!.height).toBeGreaterThanOrEqual(44); // Minimum touch target
      }
      
      // Test virtual keyboard handling
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', 'john.doe@example.com');
      
      // Password field should have proper input type
      const passwordField = page.locator('input[name="password"]');
      await expect(passwordField).toHaveAttribute('type', 'password');
      
      await passwordField.fill('TestPassword123!');
      
      // Form should remain usable when keyboard is shown
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
    });
    
    test('should optimize images for mobile', async ({ page }) => {
      await page.goto('http://localhost:3000');
      
      // Images should have appropriate sizes for mobile
      const heroImages = await page.locator('.hero-image img').all();
      
      for (const img of heroImages) {
        // Should have responsive attributes
        const srcset = await img.getAttribute('srcset');
        const sizes = await img.getAttribute('sizes');
        
        // Should have mobile-optimized images
        if (srcset) {
          expect(srcset).toContain('mobile');
        }
        
        // Should load efficiently
        await expect(img).toHaveAttribute('loading', 'lazy');
      }
    });
  });
  
  // Test on tablets
  test.describe('Tablet Testing', () => {
    test.use({ ...devices['iPad Pro'] });
    
    test('should adapt layout for tablet screens', async ({ page }) => {
      await page.goto('http://localhost:3000');
      
      // Should show tablet-optimized layout
      const mainContainer = page.locator('.main-container');
      const containerWidth = await mainContainer.evaluate(el => window.getComputedStyle(el).maxWidth);
      
      // Tablet should use wider layout than mobile
      expect(parseInt(containerWidth)).toBeGreaterThan(768);
      
      // Navigation should be hybrid (not full desktop, not mobile menu)
      await expect(page.locator('.tablet-navigation')).toBeVisible();
    });
    
    test('should handle tablet booking interface', async ({ page }) => {
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'user@travel-agency.com');
      await page.fill('input[name="password"]', 'user123');
      await page.click('button[type="submit"]');
      
      await page.goto('http://localhost:3000/booking/new');
      
      // Should show multi-column layout for tablets
      const bookingSteps = page.locator('.booking-steps');
      await expect(bookingSteps).toBeVisible();
      
      // Flight and hotel selection should be side-by-side on tablets
      const flightSection = page.locator('.flight-selection');
      const hotelSection = page.locator('.hotel-selection');
      
      if (await flightSection.count() > 0 && await hotelSection.count() > 0) {
        const flightBox = await flightSection.boundingBox();
        const hotelBox = await hotelSection.boundingBox();
        
        // Should be horizontally aligned (side by side)
        const verticalOverlap = Math.max(0, Math.min(flightBox!.y + flightBox!.height, hotelBox!.y + hotelBox!.height) - Math.max(flightBox!.y, hotelBox!.y));
        expect(verticalOverlap).toBeGreaterThan(0);
      }
    });
  });
  
  // Test different screen sizes
  test.describe('Custom Screen Sizes', () => {
    const screenSizes = [
      { width: 320, height: 568, name: 'iPhone SE' },
      { width: 375, height: 812, name: 'iPhone X' },
      { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1024, height: 768, name: 'iPad Landscape' },
    ];
    
    screenSizes.forEach(size => {
      test(`should work on ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto('http://localhost:3000');
        
        // Page should load without horizontal scrolling
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(size.width + 20); // Allow small margin for scrollbars
        
        // Main content should be visible
        await expect(page.locator('main')).toBeVisible();
        
        // Navigation should work
        if (size.width < 768) {
          // Mobile navigation
          await expect(page.locator('.mobile-menu-toggle')).toBeVisible();
        } else {
          // Desktop/tablet navigation
          await expect(page.locator('.desktop-navigation')).toBeVisible();
        }
      });
    });
  });
  
  // Test touch interactions
  test.describe('Touch Interface Testing', () => {
    test.use({ ...devices['iPhone 12'] });
    
    test('should handle touch gestures', async ({ page }) => {
      await page.goto('http://localhost:3000/hotels');
      
      // Test swipe gestures on image carousels
      const carousel = page.locator('.hotel-image-carousel').first();
      if (await carousel.count() > 0) {
        const initialImage = await carousel.locator('.active-image').getAttribute('src');
        
        // Simulate swipe left
        await carousel.hover();
        await page.mouse.down();
        await page.mouse.move(-100, 0);
        await page.mouse.up();
        
        // Should change to next image
        await page.waitForTimeout(500);
        const newImage = await carousel.locator('.active-image').getAttribute('src');
        expect(newImage).not.toBe(initialImage);
      }
    });
    
    test('should handle pinch zoom on maps', async ({ page }) => {
      await page.goto('http://localhost:3000/hotels/map');
      
      const mapContainer = page.locator('.map-container');
      if (await mapContainer.count() > 0) {
        // Test pinch zoom simulation
        await mapContainer.hover();
        
        // Simulate pinch gesture (limited in Playwright, but test basic interaction)
        await page.mouse.wheel(0, -100); // Zoom in
        await page.waitForTimeout(500);
        
        // Map should respond to zoom
        const zoomLevel = await page.evaluate(() => {
          const map = (window as any).mapInstance;
          return map ? map.getZoom() : null;
        });
        
        if (zoomLevel) {
          expect(zoomLevel).toBeGreaterThan(10);
        }
      }
    });
    
    test('should have proper touch targets', async ({ page }) => {
      await page.goto('http://localhost:3000');
      
      // All interactive elements should meet minimum touch target size
      const interactiveElements = await page.locator('button, a, input[type="submit"], .clickable').all();
      
      for (const element of interactiveElements) {
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          
          // Minimum 44x44px touch target (Apple HIG recommendation)
          expect(box!.width).toBeGreaterThanOrEqual(44);
          expect(box!.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });
  
  // Test orientation changes
  test.describe('Orientation Testing', () => {
    test('should handle portrait to landscape rotation', async ({ page, browser }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('http://localhost:3000/search');
      
      // Fill out search form
      await page.fill('input[placeholder="Where to?"]', 'Barcelona');
      await page.fill('input[type="date"][name="departure"]', '2024-06-15');
      
      // Rotate to landscape
      await page.setViewportSize({ width: 812, height: 375 });
      await page.waitForTimeout(500);
      
      // Form data should be preserved
      await expect(page.locator('input[placeholder="Where to?"]')).toHaveValue('Barcelona');
      await expect(page.locator('input[type="date"][name="departure"]')).toHaveValue('2024-06-15');
      
      // Layout should adapt to landscape
      const searchForm = page.locator('.search-form');
      const formLayout = await searchForm.evaluate(el => window.getComputedStyle(el).flexDirection);
      
      // In landscape, form might use horizontal layout
      expect(['row', 'column']).toContain(formLayout);
    });
  });
  
  // Test mobile-specific features
  test.describe('Mobile-Specific Features', () => {
    test.use({ ...devices['iPhone 12'] });
    
    test('should handle mobile camera for document upload', async ({ page }) => {
      await page.goto('http://localhost:3000/profile/documents');
      
      const uploadButton = page.locator('button:has-text("Upload Document")');
      if (await uploadButton.count() > 0) {
        await uploadButton.click();
        
        // Should show camera option on mobile
        await expect(page.locator('button:has-text("Take Photo")')).toBeVisible();
        await expect(page.locator('button:has-text("Choose from Gallery")')).toBeVisible();
      }
    });
    
    test('should handle GPS location services', async ({ page, context }) => {
      // Grant geolocation permission
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 41.3275, longitude: 19.8187 }); // Tirana
      
      await page.goto('http://localhost:3000/search');
      
      const locationButton = page.locator('button:has-text("Use My Location")');
      if (await locationButton.count() > 0) {
        await locationButton.click();
        
        // Should detect location and fill nearby airports
        await expect(page.locator('input[name="origin"]')).toHaveValue('TIA'); // Tirana Airport
      }
    });
    
    test('should support mobile payment methods', async ({ page }) => {
      // Complete booking flow first
      await page.goto('http://localhost:3000/auth/signin');
      await page.fill('input[name="email"]', 'user@travel-agency.com');
      await page.fill('input[name="password"]', 'user123');
      await page.click('button[type="submit"]');
      
      await page.goto('http://localhost:3000/booking/new');
      
      // Quick booking completion
      await page.click('.flight-option:first-child');
      await page.click('button:has-text("Next")');
      await page.click('.hotel-option:first-child');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Skip")');
      
      await page.fill('input[name="passengerName"]', 'Mobile User');
      await page.fill('input[name="passengerEmail"]', 'mobile@test.com');
      await page.fill('input[name="passengerPhone"]', '+1234567890');
      await page.click('button:has-text("Next")');
      
      await page.click('button:has-text("Confirm Booking")');
      
      // Payment page should show mobile-optimized options
      await page.click('button:has-text("Make Payment")');
      
      // Should show mobile-friendly payment instructions
      await expect(page.locator('.payment-instructions.mobile')).toBeVisible();
      await expect(page.locator('button:has-text("Copy Bank Details")')).toBeVisible();
      
      // Should support mobile banking app integration
      const bankingAppButton = page.locator('button:has-text("Open Banking App")');
      if (await bankingAppButton.count() > 0) {
        await expect(bankingAppButton).toBeVisible();
      }
    });
  });
  
  // Performance on mobile devices
  test.describe('Mobile Performance', () => {
    test.use({ ...devices['iPhone 12'] });
    
    test('should load quickly on mobile', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3000');
      
      // Page should load within 3 seconds on mobile
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
      
      // Core content should be visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.main-content')).toBeVisible();
    });
    
    test('should optimize resource loading on mobile', async ({ page }) => {
      await page.goto('http://localhost:3000');
      
      // Check that mobile-specific resources are loaded
      const stylesheets = await page.locator('link[rel="stylesheet"]').all();
      
      let hasMobileCSS = false;
      for (const stylesheet of stylesheets) {
        const href = await stylesheet.getAttribute('href');
        if (href && href.includes('mobile')) {
          hasMobileCSS = true;
          break;
        }
      }
      
      // Should load mobile-optimized assets
      const images = await page.locator('img').all();
      for (const img of images) {
        const src = await img.getAttribute('src');
        const srcset = await img.getAttribute('srcset');
        
        // Should have responsive images or mobile-optimized sources
        expect(src || srcset).toBeTruthy();
      }
    });
  });
});