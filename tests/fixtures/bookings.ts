import { format, addDays, subDays } from 'date-fns'

export interface TestBooking {
  id?: string
  reservationCode: string
  userId: string
  destination: string
  checkIn: Date
  checkOut: Date
  passengers: number
  rooms: number
  packageType: 'essential' | 'premium'
  status: 'soft' | 'confirmed' | 'paid' | 'cancelled'
  totalAmount: number
  currency: 'EUR' | 'USD' | 'GBP'
  createdAt: Date
  holdExpiresAt?: Date
  passengerDetails: PassengerDetail[]
  flightDetails?: FlightDetail[]
  hotelDetails?: HotelDetail[]
  transferDetails?: TransferDetail[]
  excursionDetails?: ExcursionDetail[]
}

export interface PassengerDetail {
  firstName: string
  lastName: string
  dateOfBirth?: string
  nationality?: string
  passportNumber?: string
  isMainPassenger: boolean
}

export interface FlightDetail {
  flightNumber: string
  airline: string
  departure: {
    airport: string
    time: Date
  }
  arrival: {
    airport: string
    time: Date
  }
  type: 'outbound' | 'return'
}

export interface HotelDetail {
  name: string
  address: string
  checkIn: Date
  checkOut: Date
  roomType: string
  nights: number
}

export interface TransferDetail {
  type: 'airport_pickup' | 'airport_dropoff' | 'excursion'
  from: string
  to: string
  date: Date
  time: string
}

export interface ExcursionDetail {
  name: string
  description: string
  date: Date
  duration: string
  included: boolean
}

export class BookingFactory {
  private static counter = 0

  static createBooking(overrides: Partial<TestBooking> = {}): TestBooking {
    this.counter++
    const today = new Date()
    const checkIn = addDays(today, 30)
    const checkOut = addDays(checkIn, 3)
    const holdExpiresAt = addDays(today, 0.125) // 3 hours from now

    return {
      reservationCode: `MXi-${String(this.counter).padStart(4, '0')}`,
      userId: '1',
      destination: 'Paris',
      checkIn,
      checkOut,
      passengers: 2,
      rooms: 1,
      packageType: 'essential',
      status: 'soft',
      totalAmount: 887,
      currency: 'EUR',
      createdAt: today,
      holdExpiresAt,
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
      ],
      ...overrides
    }
  }

  static createSoftBooking(overrides: Partial<TestBooking> = {}): TestBooking {
    return this.createBooking({
      status: 'soft',
      holdExpiresAt: addDays(new Date(), 0.125), // 3 hours from now
      ...overrides
    })
  }

  static createConfirmedBooking(overrides: Partial<TestBooking> = {}): TestBooking {
    return this.createBooking({
      status: 'confirmed',
      holdExpiresAt: undefined,
      ...overrides
    })
  }

  static createPaidBooking(overrides: Partial<TestBooking> = {}): TestBooking {
    return this.createBooking({
      status: 'paid',
      holdExpiresAt: undefined,
      flightDetails: this.createFlightDetails(),
      hotelDetails: this.createHotelDetails(overrides.checkIn, overrides.checkOut),
      transferDetails: this.createTransferDetails(),
      ...overrides
    })
  }

  static createCancelledBooking(overrides: Partial<TestBooking> = {}): TestBooking {
    return this.createBooking({
      status: 'cancelled',
      holdExpiresAt: undefined,
      ...overrides
    })
  }

  static createExpiredBooking(overrides: Partial<TestBooking> = {}): TestBooking {
    return this.createBooking({
      status: 'soft',
      holdExpiresAt: subDays(new Date(), 1), // Expired yesterday
      ...overrides
    })
  }

  static createUpcomingBooking(daysFromNow: number = 30, overrides: Partial<TestBooking> = {}): TestBooking {
    const checkIn = addDays(new Date(), daysFromNow)
    const checkOut = addDays(checkIn, 3)

    return this.createBooking({
      checkIn,
      checkOut,
      status: 'paid',
      ...overrides
    })
  }

  static createPastBooking(daysAgo: number = 30, overrides: Partial<TestBooking> = {}): TestBooking {
    const checkOut = subDays(new Date(), daysAgo)
    const checkIn = subDays(checkOut, 3)

    return this.createBooking({
      checkIn,
      checkOut,
      status: 'paid',
      ...overrides
    })
  }

  static createMultipleBookings(count: number, status: TestBooking['status'] = 'soft'): TestBooking[] {
    return Array.from({ length: count }, (_, index) => {
      const checkIn = addDays(new Date(), 30 + (index * 7))
      const checkOut = addDays(checkIn, 3)
      
      return this.createBooking({
        status,
        checkIn,
        checkOut,
        destination: this.getRandomDestination()
      })
    })
  }

  static createFlightDetails(): FlightDetail[] {
    return [
      {
        flightNumber: 'AF1234',
        airline: 'Air France',
        departure: {
          airport: 'LHR',
          time: addDays(new Date(), 30)
        },
        arrival: {
          airport: 'CDG',
          time: addDays(new Date(), 30)
        },
        type: 'outbound'
      },
      {
        flightNumber: 'AF5678',
        airline: 'Air France',
        departure: {
          airport: 'CDG',
          time: addDays(new Date(), 33)
        },
        arrival: {
          airport: 'LHR',
          time: addDays(new Date(), 33)
        },
        type: 'return'
      }
    ]
  }

  static createHotelDetails(checkIn?: Date, checkOut?: Date): HotelDetail[] {
    const defaultCheckIn = checkIn || addDays(new Date(), 30)
    const defaultCheckOut = checkOut || addDays(defaultCheckIn, 3)

    return [{
      name: 'Hotel Central Paris',
      address: '123 Rue de Rivoli, 75001 Paris, France',
      checkIn: defaultCheckIn,
      checkOut: defaultCheckOut,
      roomType: 'Standard Double Room',
      nights: Math.ceil((defaultCheckOut.getTime() - defaultCheckIn.getTime()) / (1000 * 60 * 60 * 24))
    }]
  }

  static createTransferDetails(): TransferDetail[] {
    const checkIn = addDays(new Date(), 30)
    const checkOut = addDays(checkIn, 3)

    return [
      {
        type: 'airport_pickup',
        from: 'Charles de Gaulle Airport',
        to: 'Hotel Central Paris',
        date: checkIn,
        time: '14:00'
      },
      {
        type: 'airport_dropoff',
        from: 'Hotel Central Paris',
        to: 'Charles de Gaulle Airport',
        date: checkOut,
        time: '11:00'
      }
    ]
  }

  static createExcursionDetails(): ExcursionDetail[] {
    return [
      {
        name: 'Guided City Tour',
        description: 'Explore the highlights of Paris with a professional guide',
        date: addDays(new Date(), 31),
        duration: '3 hours',
        included: true
      },
      {
        name: 'Seine River Cruise',
        description: 'Romantic evening cruise along the Seine River',
        date: addDays(new Date(), 32),
        duration: '2 hours',
        included: false
      }
    ]
  }

  private static getRandomDestination(): string {
    const destinations = ['Paris', 'Barcelona', 'Amsterdam', 'Rome', 'London', 'Berlin']
    return destinations[Math.floor(Math.random() * destinations.length)]
  }

  static reset() {
    this.counter = 0
  }
}

// Pre-defined test bookings for specific scenarios
export const testBookings = {
  softBooking: BookingFactory.createSoftBooking(),
  confirmedBooking: BookingFactory.createConfirmedBooking(),
  paidBooking: BookingFactory.createPaidBooking(),
  cancelledBooking: BookingFactory.createCancelledBooking(),
  expiredBooking: BookingFactory.createExpiredBooking(),
  upcomingBooking: BookingFactory.createUpcomingBooking(),
  pastBooking: BookingFactory.createPastBooking()
}

// Booking status transitions
export const bookingStatusTransitions = {
  soft: ['confirmed', 'cancelled'],
  confirmed: ['paid', 'cancelled'],
  paid: ['cancelled'], // Usually no changes after paid
  cancelled: [] // Terminal state
}

export function canTransitionTo(currentStatus: TestBooking['status'], targetStatus: TestBooking['status']): boolean {
  return bookingStatusTransitions[currentStatus].includes(targetStatus)
}

// Price calculations
export const packagePrices = {
  essential: {
    base: 399,
    taxes: 89
  },
  premium: {
    base: 599,
    taxes: 119
  }
}

export function calculateBookingPrice(passengers: number, packageType: 'essential' | 'premium'): number {
  const prices = packagePrices[packageType]
  return (prices.base * passengers) + prices.taxes
}

// Mock API responses
export const mockBookingResponses = {
  createSuccess: (booking: TestBooking) => ({
    booking: {
      ...booking,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    },
    message: 'Booking created successfully'
  }),

  createError: {
    error: 'Failed to create booking',
    code: 'BOOKING_CREATION_FAILED',
    details: 'Insufficient availability for selected dates'
  },

  updateSuccess: (booking: TestBooking) => ({
    booking: {
      ...booking,
      updatedAt: new Date().toISOString()
    },
    message: 'Booking updated successfully'
  }),

  updateError: {
    error: 'Cannot modify booking',
    code: 'BOOKING_MODIFICATION_FAILED',
    details: 'Booking cannot be modified after payment'
  },

  paymentSuccess: (booking: TestBooking) => ({
    booking: {
      ...booking,
      status: 'paid',
      paidAt: new Date().toISOString()
    },
    message: 'Payment processed successfully'
  }),

  paymentError: {
    error: 'Payment processing failed',
    code: 'PAYMENT_FAILED',
    details: 'Invalid payment reference or insufficient funds'
  }
}

// Booking validation rules
export const bookingValidationRules = {
  minAdvanceBooking: 7, // days
  maxAdvanceBooking: 365, // days
  minStayDuration: 2, // nights
  maxStayDuration: 30, // nights
  maxPassengers: 8,
  minPassengers: 1,
  bookingHoldDuration: 3 // hours
}

export function validateBookingDates(checkIn: Date, checkOut: Date): string[] {
  const errors: string[] = []
  const today = new Date()
  const daysBetween = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  const daysFromToday = Math.ceil((checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (checkIn <= today) {
    errors.push('Check-in date must be in the future')
  }

  if (checkOut <= checkIn) {
    errors.push('Check-out date must be after check-in date')
  }

  if (daysFromToday < bookingValidationRules.minAdvanceBooking) {
    errors.push(`Booking must be made at least ${bookingValidationRules.minAdvanceBooking} days in advance`)
  }

  if (daysFromToday > bookingValidationRules.maxAdvanceBooking) {
    errors.push(`Booking cannot be made more than ${bookingValidationRules.maxAdvanceBooking} days in advance`)
  }

  if (daysBetween < bookingValidationRules.minStayDuration) {
    errors.push(`Minimum stay duration is ${bookingValidationRules.minStayDuration} nights`)
  }

  if (daysBetween > bookingValidationRules.maxStayDuration) {
    errors.push(`Maximum stay duration is ${bookingValidationRules.maxStayDuration} nights`)
  }

  return errors
}