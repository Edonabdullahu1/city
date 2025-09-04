import { test, expect } from '@playwright/test'

test.describe('User Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as regular user
    await page.goto('/login')
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should display user dashboard with bookings overview', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('My Bookings')
    
    // Should show booking summary cards
    await expect(page.locator('[data-testid="total-bookings"]')).toBeVisible()
    await expect(page.locator('[data-testid="pending-payments"]')).toBeVisible()
    await expect(page.locator('[data-testid="upcoming-trips"]')).toBeVisible()
  })

  test('should display booking cards with correct information', async ({ page }) => {
    // Assuming user has existing bookings
    const bookingCard = page.locator('[data-testid="booking-card"]').first()
    
    if (await bookingCard.isVisible()) {
      // Check booking card elements
      await expect(bookingCard.locator('[data-testid="reservation-code"]')).toBeVisible()
      await expect(bookingCard.locator('[data-testid="destination"]')).toBeVisible()
      await expect(bookingCard.locator('[data-testid="travel-dates"]')).toBeVisible()
      await expect(bookingCard.locator('[data-testid="booking-status"]')).toBeVisible()
      await expect(bookingCard.locator('[data-testid="total-amount"]')).toBeVisible()
    }
  })

  test('should show payment expiry warnings for soft bookings', async ({ page }) => {
    // Look for bookings with payment pending status
    const softBooking = page.locator('[data-testid="booking-card"]:has-text("Payment Pending")')
    
    if (await softBooking.isVisible()) {
      // Should show expiry warning
      await expect(softBooking.locator('text=Payment expires')).toBeVisible()
      await expect(softBooking.locator('button:has-text("Complete Payment")')).toBeVisible()
    }
  })

  test('should filter bookings by status', async ({ page }) => {
    // Check if filter options are available
    const statusFilter = page.locator('[data-testid="status-filter"]')
    
    if (await statusFilter.isVisible()) {
      // Test filtering by confirmed bookings
      await statusFilter.selectOption('confirmed')
      
      // All visible bookings should have confirmed status
      const bookingCards = page.locator('[data-testid="booking-card"]')
      const count = await bookingCards.count()
      
      for (let i = 0; i < count; i++) {
        await expect(bookingCards.nth(i).locator('text=Confirmed')).toBeVisible()
      }
      
      // Test filtering by pending payments
      await statusFilter.selectOption('soft')
      
      const softBookings = page.locator('[data-testid="booking-card"]')
      const softCount = await softBookings.count()
      
      for (let i = 0; i < softCount; i++) {
        await expect(softBookings.nth(i).locator('text=Payment Pending')).toBeVisible()
      }
    }
  })

  test('should navigate to booking details', async ({ page }) => {
    const bookingCard = page.locator('[data-testid="booking-card"]').first()
    
    if (await bookingCard.isVisible()) {
      const reservationCode = await bookingCard.locator('[data-testid="reservation-code"]').textContent()
      
      // Click view details button
      await bookingCard.locator('button:has-text("View Details")').click()
      
      // Should navigate to booking details page
      await expect(page).toHaveURL(/\/booking\/[^/]+/)
      await expect(page.locator('text=' + reservationCode)).toBeVisible()
    }
  })

  test('should show empty state when no bookings exist', async ({ page }) => {
    // Mock empty bookings response
    await page.route('/api/user/bookings', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ bookings: [] })
      })
    })
    
    await page.reload()
    
    // Should show empty state
    await expect(page.locator('text=No bookings yet')).toBeVisible()
    await expect(page.locator('button:has-text("Start Booking")')).toBeVisible()
  })

  test('should handle loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('/api/user/bookings', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ bookings: [] })
        })
      }, 2000)
    })
    
    await page.reload()
    
    // Should show loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
  })
})

test.describe('Agent Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as agent
    await page.goto('/login')
    await page.fill('input[type="email"]', 'agent@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    // Navigate to agent dashboard
    await page.goto('/agent')
  })

  test('should display agent dashboard with customer bookings', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Agent Dashboard')
    
    // Should show agent-specific metrics
    await expect(page.locator('[data-testid="total-customers"]')).toBeVisible()
    await expect(page.locator('[data-testid="pending-bookings"]')).toBeVisible()
    await expect(page.locator('[data-testid="monthly-revenue"]')).toBeVisible()
  })

  test('should allow agents to manage customer bookings', async ({ page }) => {
    const bookingCard = page.locator('[data-testid="customer-booking-card"]').first()
    
    if (await bookingCard.isVisible()) {
      // Should show customer information
      await expect(bookingCard.locator('[data-testid="customer-name"]')).toBeVisible()
      await expect(bookingCard.locator('[data-testid="customer-email"]')).toBeVisible()
      
      // Should have agent action buttons
      await expect(bookingCard.locator('button:has-text("Modify Booking")')).toBeVisible()
      await expect(bookingCard.locator('button:has-text("Contact Customer")')).toBeVisible()
    }
  })

  test('should allow agents to create bookings for customers', async ({ page }) => {
    await page.click('button:has-text("New Booking for Customer")')
    
    // Should open customer booking form
    await expect(page.locator('h2')).toContainText('Create Booking for Customer')
    await expect(page.locator('input[placeholder="Customer Email"]')).toBeVisible()
  })

  test('should filter bookings by customer or date range', async ({ page }) => {
    // Test customer search
    const customerFilter = page.locator('[data-testid="customer-filter"]')
    if (await customerFilter.isVisible()) {
      await customerFilter.fill('john.doe@example.com')
      await page.keyboard.press('Enter')
      
      // Should filter bookings for specific customer
      const filteredCards = page.locator('[data-testid="customer-booking-card"]')
      const count = await filteredCards.count()
      
      for (let i = 0; i < count; i++) {
        await expect(filteredCards.nth(i).locator('text=john.doe@example.com')).toBeVisible()
      }
    }
  })

  test('should show agent performance metrics', async ({ page }) => {
    // Check for performance dashboard elements
    await expect(page.locator('[data-testid="bookings-this-month"]')).toBeVisible()
    await expect(page.locator('[data-testid="revenue-this-month"]')).toBeVisible()
    await expect(page.locator('[data-testid="customer-satisfaction"]')).toBeVisible()
  })
})

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    // Navigate to admin dashboard
    await page.goto('/admin')
  })

  test('should display admin dashboard with system overview', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Admin Dashboard')
    
    // Should show system-wide metrics
    await expect(page.locator('[data-testid="total-users"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-bookings"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-agents"]')).toBeVisible()
  })

  test('should allow user management', async ({ page }) => {
    await page.click('text=User Management')
    
    // Should show user list
    await expect(page.locator('[data-testid="user-table"]')).toBeVisible()
    
    // Should have user action buttons
    await expect(page.locator('button:has-text("Add User")')).toBeVisible()
    
    const userRow = page.locator('[data-testid="user-row"]').first()
    if (await userRow.isVisible()) {
      await expect(userRow.locator('button:has-text("Edit")')).toBeVisible()
      await expect(userRow.locator('button:has-text("Deactivate")')).toBeVisible()
    }
  })

  test('should allow booking management and modifications', async ({ page }) => {
    await page.click('text=Booking Management')
    
    // Should show all bookings in system
    await expect(page.locator('[data-testid="admin-booking-table"]')).toBeVisible()
    
    const bookingRow = page.locator('[data-testid="admin-booking-row"]').first()
    if (await bookingRow.isVisible()) {
      // Should have admin action buttons
      await expect(bookingRow.locator('button:has-text("Modify")')).toBeVisible()
      await expect(bookingRow.locator('button:has-text("Cancel")')).toBeVisible()
      await expect(bookingRow.locator('button:has-text("Refund")')).toBeVisible()
    }
  })

  test('should show system analytics and reports', async ({ page }) => {
    await page.click('text=Analytics')
    
    // Should show analytics dashboard
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="booking-trends-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="destination-popularity-chart"]')).toBeVisible()
  })

  test('should allow system configuration', async ({ page }) => {
    await page.click('text=Settings')
    
    // Should show system settings
    await expect(page.locator('[data-testid="system-settings"]')).toBeVisible()
    await expect(page.locator('input[name="siteName"]')).toBeVisible()
    await expect(page.locator('input[name="contactEmail"]')).toBeVisible()
    await expect(page.locator('input[name="contactPhone"]')).toBeVisible()
  })
})

test.describe('Dashboard Responsive Design', () => {
  test('should adapt dashboard layout for mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Navigate to dashboard via mobile navigation
    await page.click('text=Bookings')
    
    // Should show mobile-optimized dashboard
    await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible()
    
    // Booking cards should be stacked vertically
    const bookingCards = page.locator('[data-testid="booking-card"]')
    const count = await bookingCards.count()
    
    if (count > 1) {
      // Check that cards are stacked (first card should be above second)
      const firstCard = bookingCards.first()
      const secondCard = bookingCards.nth(1)
      
      const firstCardBox = await firstCard.boundingBox()
      const secondCardBox = await secondCard.boundingBox()
      
      if (firstCardBox && secondCardBox) {
        expect(firstCardBox.y).toBeLessThan(secondCardBox.y)
      }
    }
  })

  test('should show appropriate mobile navigation for dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/login')
    await page.fill('input[type="email"]', 'testuser@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Check bottom navigation
    await expect(page.locator('nav').last()).toBeVisible() // Bottom nav
    await expect(page.locator('text=Home')).toBeVisible()
    await expect(page.locator('text=Book')).toBeVisible()
    await expect(page.locator('text=Bookings')).toBeVisible()
    await expect(page.locator('text=Profile')).toBeVisible()
  })
})