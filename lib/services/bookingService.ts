import prisma from '@/lib/prisma';
import { Booking, BookingStatus, Prisma } from '@prisma/client';

export class BookingService {
  /**
   * Generate a unique reservation code in the format MXi-XXXX
   * where XXXX is a sequential number starting from 0001
   */
  static async generateReservationCode(): Promise<string> {
    // Use a transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // Get the last reservation code
      const lastBooking = await tx.booking.findFirst({
        where: {
          reservationCode: {
            startsWith: 'MXi-'
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          reservationCode: true
        }
      });

      let nextNumber = 1;
      
      if (lastBooking?.reservationCode) {
        // Extract the number part from MXi-XXXX
        const matches = lastBooking.reservationCode.match(/MXi-(\d+)/);
        if (matches && matches[1]) {
          nextNumber = parseInt(matches[1], 10) + 1;
        }
      }

      // Format with leading zeros (4 digits)
      const formattedNumber = nextNumber.toString().padStart(4, '0');
      const reservationCode = `MXi-${formattedNumber}`;

      // Verify uniqueness (double-check)
      const exists = await tx.booking.findUnique({
        where: {
          reservationCode
        }
      });

      if (exists) {
        // If somehow the code exists, try the next one
        return this.generateReservationCode();
      }

      return reservationCode;
    });
  }

  /**
   * Create a soft booking with automatic expiration after 3 hours
   */
  static async createSoftBooking(data: {
    userId: string;
    flightId?: string;
    hotelId?: string;
    checkIn: Date;
    checkOut: Date;
    adults: number;
    children?: number;
    infants?: number;
    totalAmount: number;
    currency?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }): Promise<Booking> {
    const reservationCode = await this.generateReservationCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 3); // 3-hour hold

    const booking = await prisma.booking.create({
      data: {
        reservationCode,
        userId: data.userId,
        flightId: data.flightId,
        hotelId: data.hotelId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        adults: data.adults,
        children: data.children || 0,
        infants: data.infants || 0,
        totalAmount: Math.round(data.totalAmount * 100), // Store in cents
        currency: data.currency || 'EUR',
        status: BookingStatus.SOFT,
        expiresAt,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        user: true,
        flight: true,
        hotel: true,
        transfers: true,
        excursions: true
      }
    });

    // Schedule cleanup job for expired soft bookings (would typically use a job queue)
    // For now, we'll handle this in the booking retrieval logic

    return booking;
  }

  /**
   * Confirm a soft booking (convert to confirmed status)
   */
  static async confirmBooking(reservationCode: string): Promise<Booking> {
    const booking = await prisma.booking.findUnique({
      where: { reservationCode },
      include: {
        user: true,
        flight: true,
        hotel: true,
        transfers: true,
        excursions: true
      }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.SOFT) {
      throw new Error('Booking is not in soft status');
    }

    // Check if booking has expired
    if (booking.expiresAt && booking.expiresAt < new Date()) {
      throw new Error('Booking has expired');
    }

    // Update booking status to confirmed
    return await prisma.booking.update({
      where: { reservationCode },
      data: {
        status: BookingStatus.CONFIRMED,
        expiresAt: null, // Remove expiration
        updatedAt: new Date()
      },
      include: {
        user: true,
        flight: true,
        hotel: true,
        transfers: true,
        excursions: true
      }
    });
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(reservationCode: string): Promise<Booking> {
    const booking = await prisma.booking.findUnique({
      where: { reservationCode }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error('Booking is already cancelled');
    }

    return await prisma.booking.update({
      where: { reservationCode },
      data: {
        status: BookingStatus.CANCELLED,
        updatedAt: new Date()
      },
      include: {
        user: true,
        flight: true,
        hotel: true,
        transfers: true,
        excursions: true
      }
    });
  }

  /**
   * Get booking by reservation code
   */
  static async getBookingByCode(reservationCode: string): Promise<Booking | null> {
    const booking = await prisma.booking.findUnique({
      where: { reservationCode },
      include: {
        user: true,
        flight: true,
        hotel: true,
        transfers: true,
        excursions: true
      }
    });

    if (!booking) {
      return null;
    }

    // Check if soft booking has expired
    if (
      booking.status === BookingStatus.SOFT &&
      booking.expiresAt &&
      booking.expiresAt < new Date()
    ) {
      // Auto-cancel expired soft bookings
      await prisma.booking.update({
        where: { reservationCode },
        data: {
          status: BookingStatus.CANCELLED,
          updatedAt: new Date()
        }
      });

      return {
        ...booking,
        status: BookingStatus.CANCELLED
      };
    }

    return booking;
  }

  /**
   * Get user's bookings
   */
  static async getUserBookings(
    userId: string,
    options?: {
      status?: BookingStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Booking[]> {
    const where: Prisma.BookingWhereInput = {
      userId,
      ...(options?.status && { status: options.status })
    };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: true,
        flight: true,
        hotel: true,
        transfers: true,
        excursions: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: options?.limit,
      skip: options?.offset
    });

    // Filter out expired soft bookings
    return bookings.filter(booking => {
      if (
        booking.status === BookingStatus.SOFT &&
        booking.expiresAt &&
        booking.expiresAt < new Date()
      ) {
        // Mark as cancelled in background (non-blocking)
        prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            updatedAt: new Date()
          }
        }).catch(console.error);

        return false;
      }
      return true;
    });
  }

  /**
   * Calculate booking totals including all services
   */
  static async calculateBookingTotal(bookingData: {
    flightPrice?: number;
    hotelPrice?: number;
    transferPrice?: number;
    excursionPrices?: number[];
    adults: number;
    children?: number;
    infants?: number;
  }): Promise<number> {
    let total = 0;

    if (bookingData.flightPrice) {
      total += bookingData.flightPrice;
    }

    if (bookingData.hotelPrice) {
      total += bookingData.hotelPrice;
    }

    if (bookingData.transferPrice) {
      total += bookingData.transferPrice;
    }

    if (bookingData.excursionPrices && bookingData.excursionPrices.length > 0) {
      total += bookingData.excursionPrices.reduce((sum, price) => sum + price, 0);
    }

    return total;
  }

  /**
   * Clean up expired soft bookings (to be called by a cron job)
   */
  static async cleanupExpiredBookings(): Promise<number> {
    const result = await prisma.booking.updateMany({
      where: {
        status: BookingStatus.SOFT,
        expiresAt: {
          lt: new Date()
        }
      },
      data: {
        status: BookingStatus.CANCELLED,
        updatedAt: new Date()
      }
    });

    return result.count;
  }
}