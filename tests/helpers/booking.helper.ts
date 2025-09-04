import { Page, expect } from '@playwright/test'
import { format, addDays } from 'date-fns'

export interface BookingData {
  destination: string
  checkIn: string
  checkOut: string
  passengers: number
  packageType: 'essential' | 'premium'
  passengerInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}

export class BookingHelper {
  constructor(private page: Page) {}

  async createCompleteBooking(bookingData: BookingData): Promise<string> {
    await this.page.goto('/booking/new')
    
    // Step 1: Search
    await this.fillSearchForm(bookingData)
    await this.page.click('button:has-text("Search Packages")')
    
    // Step 2: Select Package
    await this.selectPackage(bookingData.packageType)
    
    // Step 3: Fill Details and Review
    await this.fillPassengerDetails(bookingData.passengerInfo)
    await this.page.click('button:has-text("Confirm Booking")')
    
    // Step 4: Get Reservation Code
    const reservationCode = await this.getReservationCode()
    
    return reservationCode
  }

  async fillSearchForm(data: Partial<BookingData>) {
    if (data.destination) {
      await this.page.selectOption('select[data-testid="destination-select"]', data.destination)
    }
    
    if (data.checkIn) {
      await this.page.fill('input[type="date"][data-testid="checkin-date"]', data.checkIn)
    }
    
    if (data.checkOut) {
      await this.page.fill('input[type="date"][data-testid="checkout-date"]', data.checkOut)
    }
    
    if (data.passengers) {
      await this.page.selectOption('select[data-testid="passengers-select"]', data.passengers.toString())
    }
  }

  async selectPackage(packageType: 'essential' | 'premium' = 'essential') {
    const packageSelector = packageType === 'essential' 
      ? '[data-testid="essential-package"] button:has-text("Select")'
      : '[data-testid="premium-package"] button:has-text("Select")'
    
    await this.page.click(packageSelector)
  }

  async fillPassengerDetails(passengerInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }) {
    await this.page.fill('input[placeholder="First Name"]', passengerInfo.firstName)
    await this.page.fill('input[placeholder="Last Name"]', passengerInfo.lastName)
    await this.page.fill('input[placeholder="Email Address"]', passengerInfo.email)
    await this.page.fill('input[placeholder="Phone Number"]', passengerInfo.phone)
  }

  async getReservationCode(): Promise<string> {
    const reservationElement = await this.page.locator('text=/MXi-\\d{4}/')
    await expect(reservationElement).toBeVisible()
    
    const reservationCode = await reservationElement.textContent()
    return reservationCode?.trim() || ''
  }

  async verifyBookingConfirmation(expectedAmount?: string) {
    await expect(this.page.locator('h2')).toContainText('Booking Confirmed!')
    await expect(this.page.locator('text=/MXi-\\d{4}/')).toBeVisible()
    
    if (expectedAmount) {
      await expect(this.page.locator(`text=${expectedAmount}`)).toBeVisible()
    }
    
    // Check payment instructions
    await expect(this.page.locator('text=wire transfer')).toBeVisible()
    await expect(this.page.locator('text=3 hours')).toBeVisible()
  }

  async navigateToBookingDetails(reservationCode: string) {
    await this.page.goto('/dashboard')
    
    const bookingCard = this.page.locator(`[data-testid="booking-card"]:has-text("${reservationCode}")`)
    await expect(bookingCard).toBeVisible()
    
    await bookingCard.locator('button:has-text("View Details")').click()
    
    await expect(this.page).toHaveURL(/\/booking\/[^/]+/)
    await expect(this.page.locator(`text=${reservationCode}`)).toBeVisible()
  }

  async cancelBooking(reservationCode: string) {
    await this.navigateToBookingDetails(reservationCode)
    
    await this.page.click('button:has-text("Cancel Booking")')
    
    // Confirm cancellation
    await this.page.click('button:has-text("Yes, Cancel")')
    
    await expect(this.page.locator('text=Booking cancelled')).toBeVisible()
  }

  async modifyBooking(reservationCode: string, modifications: Partial<BookingData>) {
    await this.navigateToBookingDetails(reservationCode)
    
    await this.page.click('button:has-text("Modify Booking")')
    
    // Make modifications
    if (modifications.checkOut) {
      await this.page.fill('input[type="date"][name="checkOut"]', modifications.checkOut)
    }
    
    if (modifications.passengers) {
      await this.page.selectOption('select[name="passengers"]', modifications.passengers.toString())
    }
    
    await this.page.click('button:has-text("Save Changes")')
    
    await expect(this.page.locator('text=Booking updated')).toBeVisible()
  }

  async makePayment(reservationCode: string) {
    await this.navigateToBookingDetails(reservationCode)
    
    await this.page.click('button:has-text("Complete Payment")')
    
    // Should show payment instructions
    await expect(this.page.locator('text=Wire Transfer Details')).toBeVisible()
    await expect(this.page.locator(`text=${reservationCode}`)).toBeVisible() // Reference
  }

  async verifyBookingStatus(reservationCode: string, expectedStatus: 'soft' | 'confirmed' | 'paid' | 'cancelled') {
    await this.page.goto('/dashboard')
    
    const bookingCard = this.page.locator(`[data-testid="booking-card"]:has-text("${reservationCode}")`)
    await expect(bookingCard).toBeVisible()
    
    const statusLabels = {
      soft: 'Payment Pending',
      confirmed: 'Confirmed',
      paid: 'Paid',
      cancelled: 'Cancelled'
    }
    
    await expect(bookingCard.locator(`text=${statusLabels[expectedStatus]}`)).toBeVisible()
  }

  async downloadBookingVoucher(reservationCode: string) {
    await this.navigateToBookingDetails(reservationCode)
    
    // Set up download handler
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.click('button:has-text("Download Voucher")')
    ])
    
    // Verify download
    expect(download.suggestedFilename()).toContain(reservationCode)
    return download
  }

  // Helper to create sample booking data
  static createSampleBooking(overrides: Partial<BookingData> = {}): BookingData {
    const today = new Date()
    const checkIn = format(addDays(today, 30), 'yyyy-MM-dd')
    const checkOut = format(addDays(today, 33), 'yyyy-MM-dd')
    
    return {
      destination: 'paris',
      checkIn,
      checkOut,
      passengers: 2,
      packageType: 'essential',
      passengerInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890'
      },
      ...overrides
    }
  }

  // Helper to create booking with specific dates
  static createBookingForDates(daysFromNow: number, duration: number, overrides: Partial<BookingData> = {}): BookingData {
    const today = new Date()
    const checkIn = format(addDays(today, daysFromNow), 'yyyy-MM-dd')
    const checkOut = format(addDays(today, daysFromNow + duration), 'yyyy-MM-dd')
    
    return this.createSampleBooking({
      checkIn,
      checkOut,
      ...overrides
    })
  }

  // Mobile-specific booking flow
  async createMobileBooking(bookingData: BookingData): Promise<string> {
    await this.page.setViewportSize({ width: 375, height: 667 })
    await this.page.goto('/booking/new')
    
    // Step 1: Mobile search form
    await this.page.selectOption('select', bookingData.destination)
    await this.page.fill('input[type="date"]', bookingData.checkIn)
    
    // Second date input (mobile layout may differ)
    const dateInputs = this.page.locator('input[type="date"]')
    if (await dateInputs.count() > 1) {
      await dateInputs.nth(1).fill(bookingData.checkOut)
    }
    
    await this.page.selectOption('select[data-testid="passengers-select"]', bookingData.passengers.toString())
    await this.page.click('button:has-text("Search Packages")')
    
    // Step 2: Select package (mobile layout)
    await this.page.click('button:has-text("Select Package")')
    
    // Step 3: Fill details
    await this.fillPassengerDetails(bookingData.passengerInfo)
    await this.page.click('button:has-text("Confirm")')
    
    // Get reservation code
    return await this.getReservationCode()
  }

  // Helper to calculate expected price
  calculateExpectedPrice(passengers: number, packageType: 'essential' | 'premium' = 'essential'): number {
    const basePrices = {
      essential: 399,
      premium: 599
    }
    
    const basePrice = basePrices[packageType] * passengers
    const taxes = Math.round(basePrice * 0.11) // Approximate 11% taxes
    
    return basePrice + taxes
  }

  // Helper to verify price calculation
  async verifyPriceCalculation(passengers: number, packageType: 'essential' | 'premium' = 'essential') {
    const expectedTotal = this.calculateExpectedPrice(passengers, packageType)
    
    // Check that the total amount appears on the page
    await expect(this.page.locator(`text=€${expectedTotal}`)).toBeVisible()
  }

  async waitForBookingToExpire(reservationCode: string) {
    // Mock the booking expiry by updating system time or calling API
    await this.page.goto(`/api/bookings/${reservationCode}/expire`, { 
      waitUntil: 'networkidle' 
    })
    
    // Navigate back to dashboard to see expired status
    await this.page.goto('/dashboard')
    
    const bookingCard = this.page.locator(`[data-testid="booking-card"]:has-text("${reservationCode}")`)
    await expect(bookingCard.locator('text=Expired')).toBeVisible()
  }
}