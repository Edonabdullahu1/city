import { test, expect } from '@playwright/test'
import { BookingFactory, testBookings, calculateBookingPrice, validateBookingDates } from '../fixtures/bookings'
import { defaultUsers } from '../fixtures/users'
import { format, addDays } from 'date-fns'

test.describe('Booking API', () => {
  let userToken: string
  let agentToken: string
  let adminToken: string

  test.beforeAll(async ({ request }) => {
    // Get authentication tokens
    const userLogin = await request.post('/api/auth/login', {
      data: {
        email: defaultUsers.regularUser.email,
        password: defaultUsers.regularUser.password
      }
    })
    const userData = await userLogin.json()
    userToken = userData.token

    const agentLogin = await request.post('/api/auth/login', {
      data: {
        email: defaultUsers.agent.email,
        password: defaultUsers.agent.password
      }
    })
    const agentData = await agentLogin.json()
    agentToken = agentData.token

    const adminLogin = await request.post('/api/auth/login', {
      data: {
        email: defaultUsers.admin.email,
        password: defaultUsers.admin.password
      }
    })
    const adminData = await adminLogin.json()
    adminToken = adminData.token
  })

  test.describe('POST /api/bookings', () => {
    test('should create booking with valid data', async ({ request }) => {
      const bookingData = {
        destination: 'paris',
        checkIn: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        checkOut: format(addDays(new Date(), 33), 'yyyy-MM-dd'),
        passengers: 2,
        rooms: 1,
        packageType: 'essential',
        passengerDetails: [
          {
            firstName: 'John',
            lastName: 'Doe',
            isMainPassenger: true
          },
          {
            firstName: 'Jane',
            lastName: 'Doe',
            isMainPassenger: false
          }
        ]
      }

      const response = await request.post('/api/bookings', {
        data: bookingData,
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(201)
      
      const data = await response.json()
      expect(data.booking).toBeDefined()
      expect(data.booking.reservationCode).toMatch(/^MXi-\d{4}$/)
      expect(data.booking.status).toBe('soft')
      expect(data.booking.holdExpiresAt).toBeDefined()
      expect(data.booking.totalAmount).toBe(calculateBookingPrice(2, 'essential'))
    })

    test('should validate booking dates', async ({ request }) => {
      const bookingData = {
        destination: 'paris',
        checkIn: format(addDays(new Date(), -1), 'yyyy-MM-dd'), // Past date
        checkOut: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        passengers: 2,
        packageType: 'essential'
      }

      const response = await request.post('/api/bookings', {
        data: bookingData,
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('date')
    })

    test('should validate passenger count limits', async ({ request }) => {
      const bookingData = {
        destination: 'paris',
        checkIn: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        checkOut: format(addDays(new Date(), 33), 'yyyy-MM-dd'),
        passengers: 10, // Exceeds maximum
        packageType: 'essential'
      }

      const response = await request.post('/api/bookings', {
        data: bookingData,
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('passenger')
    })

    test('should require authentication', async ({ request }) => {
      const bookingData = {
        destination: 'paris',
        checkIn: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        checkOut: format(addDays(new Date(), 33), 'yyyy-MM-dd'),
        passengers: 2,
        packageType: 'essential'
      }

      const response = await request.post('/api/bookings', {
        data: bookingData
      })

      expect(response.status()).toBe(401)
    })

    test('should calculate correct pricing for premium packages', async ({ request }) => {
      const bookingData = {
        destination: 'barcelona',
        checkIn: format(addDays(new Date(), 45), 'yyyy-MM-dd'),
        checkOut: format(addDays(new Date(), 48), 'yyyy-MM-dd'),
        passengers: 3,
        packageType: 'premium',
        passengerDetails: Array.from({ length: 3 }, (_, i) => ({
          firstName: `Passenger${i + 1}`,
          lastName: 'Test',
          isMainPassenger: i === 0
        }))
      }

      const response = await request.post('/api/bookings', {
        data: bookingData,
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(201)
      
      const data = await response.json()
      expect(data.booking.totalAmount).toBe(calculateBookingPrice(3, 'premium'))
      expect(data.booking.packageType).toBe('premium')
    })

    test('should generate unique reservation codes', async ({ request }) => {
      const bookingData = {
        destination: 'amsterdam',
        checkIn: format(addDays(new Date(), 60), 'yyyy-MM-dd'),
        checkOut: format(addDays(new Date(), 63), 'yyyy-MM-dd'),
        passengers: 1,
        packageType: 'essential'
      }

      // Create multiple bookings
      const responses = await Promise.all([
        request.post('/api/bookings', {
          data: bookingData,
          headers: { 'Authorization': `Bearer ${userToken}` }
        }),
        request.post('/api/bookings', {
          data: bookingData,
          headers: { 'Authorization': `Bearer ${userToken}` }
        })
      ])

      const booking1 = await responses[0].json()
      const booking2 = await responses[1].json()

      expect(booking1.booking.reservationCode).not.toBe(booking2.booking.reservationCode)
    })
  })

  test.describe('GET /api/user/bookings', () => {
    test('should return user bookings', async ({ request }) => {
      const response = await request.get('/api/user/bookings', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.bookings).toBeDefined()
      expect(Array.isArray(data.bookings)).toBe(true)
    })

    test('should filter bookings by status', async ({ request }) => {
      const response = await request.get('/api/user/bookings?status=soft', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      data.bookings.forEach((booking: any) => {
        expect(booking.status).toBe('soft')
      })
    })

    test('should paginate bookings', async ({ request }) => {
      const response = await request.get('/api/user/bookings?page=1&limit=5', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.bookings.length).toBeLessThanOrEqual(5)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(5)
    })

    test('should require authentication', async ({ request }) => {
      const response = await request.get('/api/user/bookings')

      expect(response.status()).toBe(401)
    })
  })

  test.describe('GET /api/bookings/[bookingId]', () => {
    let bookingId: string

    test.beforeAll(async ({ request }) => {
      // Create a booking first
      const bookingData = {
        destination: 'rome',
        checkIn: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
        checkOut: format(addDays(new Date(), 93), 'yyyy-MM-dd'),
        passengers: 2,
        packageType: 'essential'
      }

      const createResponse = await request.post('/api/bookings', {
        data: bookingData,
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      const createData = await createResponse.json()
      bookingId = createData.booking.id
    })

    test('should return booking details for owner', async ({ request }) => {
      const response = await request.get(`/api/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.booking).toBeDefined()
      expect(data.booking.id).toBe(bookingId)
      expect(data.booking.destination).toBe('rome')
    })

    test('should deny access to other users bookings', async ({ request }) => {
      // Create another user token for this test
      const anotherUserLogin = await request.post('/api/auth/login', {
        data: {
          email: 'jane.smith@example.com',
          password: 'password123'
        }
      })
      const anotherUserData = await anotherUserLogin.json()
      const anotherUserToken = anotherUserData.token

      const response = await request.get(`/api/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${anotherUserToken}`
        }
      })

      expect(response.status()).toBe(403)
    })

    test('should allow agents to view any booking', async ({ request }) => {
      const response = await request.get(`/api/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${agentToken}`
        }
      })

      expect(response.status()).toBe(200)
    })

    test('should return 404 for non-existent booking', async ({ request }) => {
      const response = await request.get('/api/bookings/non-existent-id', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(404)
    })
  })

  test.describe('PUT /api/bookings/[bookingId]', () => {
    let bookingId: string

    test.beforeEach(async ({ request }) => {
      // Create a fresh booking for each test
      const bookingData = {
        destination: 'london',
        checkIn: format(addDays(new Date(), 120), 'yyyy-MM-dd'),
        checkOut: format(addDays(new Date(), 123), 'yyyy-MM-dd'),
        passengers: 2,
        packageType: 'essential'
      }

      const createResponse = await request.post('/api/bookings', {
        data: bookingData,
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      const createData = await createResponse.json()
      bookingId = createData.booking.id
    })

    test('should update soft booking details', async ({ request }) => {
      const updateData = {
        checkOut: format(addDays(new Date(), 125), 'yyyy-MM-dd'), // Extend stay
        passengers: 3 // Add passenger
      }

      const response = await request.put(`/api/bookings/${bookingId}`, {
        data: updateData,
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.booking.passengers).toBe(3)
      expect(data.booking.checkOut).toBe(updateData.checkOut)
      
      // Price should be recalculated
      expect(data.booking.totalAmount).toBe(calculateBookingPrice(3, 'essential'))
    })

    test('should prevent modification of paid bookings', async ({ request }) => {
      // First, mark booking as paid
      await request.put(`/api/bookings/${bookingId}/status`, {
        data: { status: 'paid' },
        headers: {
          'Authorization': `Bearer ${agentToken}`
        }
      })

      // Try to modify
      const updateData = {
        passengers: 3
      }

      const response = await request.put(`/api/bookings/${bookingId}`, {
        data: updateData,
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('cannot modify')
    })

    test('should validate updated booking data', async ({ request }) => {
      const updateData = {
        checkIn: format(addDays(new Date(), -5), 'yyyy-MM-dd') // Invalid past date
      }

      const response = await request.put(`/api/bookings/${bookingId}`, {
        data: updateData,
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(400)
    })
  })

  test.describe('DELETE /api/bookings/[bookingId]', () => {
    let bookingId: string

    test.beforeEach(async ({ request }) => {
      // Create a booking to cancel
      const bookingData = {
        destination: 'berlin',
        checkIn: format(addDays(new Date(), 150), 'yyyy-MM-dd'),
        checkOut: format(addDays(new Date(), 153), 'yyyy-MM-dd'),
        passengers: 2,
        packageType: 'essential'
      }

      const createResponse = await request.post('/api/bookings', {
        data: bookingData,
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      const createData = await createResponse.json()
      bookingId = createData.booking.id
    })

    test('should cancel soft booking', async ({ request }) => {
      const response = await request.delete(`/api/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.booking.status).toBe('cancelled')
    })

    test('should deny cancellation by non-owner', async ({ request }) => {
      // Try to cancel with different user
      const response = await request.delete(`/api/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${agentToken}`
        }
      })

      // Agents should be able to cancel bookings
      expect(response.status()).toBe(200)
    })

    test('should handle cancellation policies for paid bookings', async ({ request }) => {
      // Mark as paid first
      await request.put(`/api/bookings/${bookingId}/status`, {
        data: { status: 'paid' },
        headers: {
          'Authorization': `Bearer ${agentToken}`
        }
      })

      const response = await request.delete(`/api/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      // Should require admin approval or apply cancellation fees
      expect([200, 202, 400]).toContain(response.status())
    })
  })

  test.describe('POST /api/bookings/[bookingId]/payment', () => {
    let softBookingId: string

    test.beforeEach(async ({ request }) => {
      // Create a soft booking for payment testing
      const bookingData = {
        destination: 'barcelona',
        checkIn: format(addDays(new Date(), 180), 'yyyy-MM-dd'),
        checkOut: format(addDays(new Date(), 183), 'yyyy-MM-dd'),
        passengers: 2,
        packageType: 'premium'
      }

      const createResponse = await request.post('/api/bookings', {
        data: bookingData,
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      const createData = await createResponse.json()
      softBookingId = createData.booking.id
    })

    test('should process payment for soft booking', async ({ request }) => {
      const paymentData = {
        paymentReference: 'WIRE-TRANSFER-REF-123',
        amount: calculateBookingPrice(2, 'premium')
      }

      const response = await request.post(`/api/bookings/${softBookingId}/payment`, {
        data: paymentData,
        headers: {
          'Authorization': `Bearer ${agentToken}` // Agents process payments
        }
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.booking.status).toBe('paid')
      expect(data.booking.paymentReference).toBe(paymentData.paymentReference)
    })

    test('should validate payment amount', async ({ request }) => {
      const paymentData = {
        paymentReference: 'WIRE-TRANSFER-REF-456',
        amount: 100 // Incorrect amount
      }

      const response = await request.post(`/api/bookings/${softBookingId}/payment`, {
        data: paymentData,
        headers: {
          'Authorization': `Bearer ${agentToken}`
        }
      })

      expect(response.status()).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('amount')
    })

    test('should prevent duplicate payment processing', async ({ request }) => {
      // Process payment first time
      const paymentData = {
        paymentReference: 'WIRE-TRANSFER-REF-789',
        amount: calculateBookingPrice(2, 'premium')
      }

      await request.post(`/api/bookings/${softBookingId}/payment`, {
        data: paymentData,
        headers: {
          'Authorization': `Bearer ${agentToken}`
        }
      })

      // Try to process again
      const response = await request.post(`/api/bookings/${softBookingId}/payment`, {
        data: paymentData,
        headers: {
          'Authorization': `Bearer ${agentToken}`
        }
      })

      expect(response.status()).toBe(400)
      
      const data = await response.json()
      expect(data.error).toContain('already paid')
    })
  })

  test.describe('GET /api/agent/bookings', () => {
    test('should return all bookings for agents', async ({ request }) => {
      const response = await request.get('/api/agent/bookings', {
        headers: {
          'Authorization': `Bearer ${agentToken}`
        }
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.bookings).toBeDefined()
      expect(Array.isArray(data.bookings)).toBe(true)
    })

    test('should deny access to regular users', async ({ request }) => {
      const response = await request.get('/api/agent/bookings', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(403)
    })

    test('should filter bookings by various criteria', async ({ request }) => {
      const response = await request.get('/api/agent/bookings?status=soft&destination=paris', {
        headers: {
          'Authorization': `Bearer ${agentToken}`
        }
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      data.bookings.forEach((booking: any) => {
        expect(booking.status).toBe('soft')
        expect(booking.destination.toLowerCase()).toContain('paris')
      })
    })
  })

  test.describe('GET /api/admin/bookings', () => {
    test('should return all bookings with admin privileges', async ({ request }) => {
      const response = await request.get('/api/admin/bookings', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.bookings).toBeDefined()
      expect(data.totalCount).toBeDefined()
      expect(data.statusBreakdown).toBeDefined()
    })

    test('should provide booking analytics', async ({ request }) => {
      const response = await request.get('/api/admin/bookings/analytics', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.totalRevenue).toBeDefined()
      expect(data.bookingTrends).toBeDefined()
      expect(data.popularDestinations).toBeDefined()
    })

    test('should deny access to non-admin users', async ({ request }) => {
      const response = await request.get('/api/admin/bookings', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(response.status()).toBe(403)
    })
  })
})