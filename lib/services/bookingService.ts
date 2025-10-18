import prisma from '@/lib/prisma';
import { Booking, BookingStatus, Prisma } from '@prisma/client';
import { BookingError, ConflictError, NotFoundError } from '@/lib/utils/errorHandler';

export class BookingService {
  /**
   * Generate a unique reservation code in the format MXi-XXXX
   * where XXXX is a sequential number starting from 0001
   * Uses database sequence to ensure atomicity and prevent race conditions
   */
  static async generateReservationCode(): Promise<string> {
    // Create a reservation sequence table if it doesn't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS reservation_sequence (
        id INTEGER PRIMARY KEY DEFAULT 1,
        current_number INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Initialize or update the sequence to match the highest existing reservation number
    const maxBooking = await prisma.booking.findFirst({
      orderBy: {
        reservationCode: 'desc'
      },
      select: {
        reservationCode: true
      }
    });

    let maxNumber = 0;
    if (maxBooking?.reservationCode) {
      // Extract number from MXi-XXXX format
      const match = maxBooking.reservationCode.match(/MXi-(\d+)/);
      if (match) {
        maxNumber = parseInt(match[1], 10);
      }
    }

    // Insert if doesn't exist, or update if current number is less than max
    await prisma.$executeRaw`
      INSERT INTO reservation_sequence (id, current_number)
      VALUES (1, ${maxNumber})
      ON CONFLICT (id)
      DO UPDATE SET current_number = GREATEST(reservation_sequence.current_number, ${maxNumber});
    `;

    // Use atomic UPDATE + SELECT to get next number
    return await prisma.$transaction(async (tx) => {
      // Atomically increment and get the next sequence number
      await tx.$executeRaw`
        UPDATE reservation_sequence 
        SET current_number = current_number + 1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1;
      `;

      // Get the new sequence number
      const result = await tx.$queryRaw<[{current_number: number}]>`
        SELECT current_number FROM reservation_sequence WHERE id = 1;
      `;

      const sequenceNumber = result[0]?.current_number || 1;

      // Format with leading zeros (4 digits)
      const formattedNumber = sequenceNumber.toString().padStart(4, '0');
      const reservationCode = `MXi-${formattedNumber}`;

      // Final verification (should never happen with sequence)
      const exists = await tx.booking.findUnique({
        where: { reservationCode }
      });

      if (exists) {
        throw new BookingError(`Critical error: Reservation code ${reservationCode} already exists despite sequence control`, 'RESERVATION_CODE_CONFLICT');
      }

      return reservationCode;
    }, {
      isolationLevel: 'Serializable' // Highest isolation level to prevent race conditions
    });
  }

  /**
   * Create a soft booking with automatic expiration after 3 hours
   * Uses proper transaction management to ensure data integrity
   *
   * IMPORTANT: All price values (totalAmount, flight prices, hotel prices, etc.)
   * must be provided in CENTS. The service does not perform euro-to-cent conversion.
   */
  static async createSoftBooking(data: {
    userId: string;
    packageId?: string;
    selectedHotelId?: string;
    flightBookings?: Array<{
      flightId?: string; // Optional - only for database flights (block seats)
      flightNumber?: string;
      origin: string;
      destination: string;
      departureDate: Date;
      arrivalDate?: Date; // Arrival time for this flight segment
      passengers: number;
      class: string;
      price: number;
    }>;
    hotelBookings?: Array<{
      hotelId: string;
      hotelName?: string; // FIX: Add optional hotelName field
      location?: string; // FIX: Add optional location field
      roomType: string;
      checkIn: Date;
      checkOut: Date;
      occupancy: number;
      nights: number;
      pricePerNight: number;
      totalPrice: number;
    }>;
    transferBookings?: Array<{
      transferId: string;
      fromLocation: string;
      toLocation: string;
      transferDate: Date;
      passengers: number;
      price: number;
    }>;
    excursionBookings?: Array<{
      excursionId: string;
      excursionDate: Date;
      participants: number;
      price: number;
    }>;
    checkInDate?: Date;
    checkOutDate?: Date;
    adults?: number;
    children?: number;
    infants?: number;
    totalAmount: number;
    currency?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    passengerDetails?: any;
    notes?: string; // FIX: Add notes field for storing booking tokens and metadata
    expiresAt?: Date;
  }): Promise<Booking> {
    
    return await prisma.$transaction(async (tx) => {
      // 1. Generate reservation code atomically
      const reservationCode = await this.generateReservationCode();
      const expiresAt = data.expiresAt || (() => {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 3); // 3-hour hold
        return expiry;
      })();

      // 2. Check availability for all services before booking
      // Only check database flights (block seats) - skip external flights (Kiwi.com, etc.)
      if (data.flightBookings) {
        for (const flightBooking of data.flightBookings) {
          // Only check availability if this is a database flight (has flightId)
          if (flightBooking.flightId) {
            const flight = await tx.flight.findUnique({
              where: { id: flightBooking.flightId },
              select: { availableSeats: true, totalSeats: true }
            });

            if (!flight || flight.availableSeats < flightBooking.passengers) {
              throw new Error(`Insufficient seats available for flight ${flightBooking.flightId}`);
            }
          }
        }
      }

      // Skip room availability check for now - focusing on core booking functionality
      // if (data.hotelBookings) {
      //   for (const hotelBooking of data.hotelBookings) {
      //     // Check room availability for all nights
      //     const unavailableDates = await tx.$queryRaw<Array<{date: Date}>>`
      //       SELECT ra.date 
      //       FROM room_availability ra
      //       INNER JOIN rooms r ON r.id = ra."roomId"
      //       WHERE r."hotelId" = ${hotelBooking.hotelId}
      //       AND ra.date >= ${hotelBooking.checkIn}
      //       AND ra.date < ${hotelBooking.checkOut}
      //       AND (ra."availableRooms" - ra."bookedRooms") < 1;
      //     `;

      //     if (unavailableDates.length > 0) {
      //       throw new Error(`Hotel ${hotelBooking.hotelId} not available for selected dates`);
      //     }
      //   }
      // }

      // 3. Create the main booking record
      const booking = await tx.booking.create({
        data: {
          reservationCode,
          userId: data.userId,
          status: BookingStatus.SOFT,
          totalAmount: Math.round(data.totalAmount), // Already in cents from frontend
          currency: data.currency || 'EUR',
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          checkInDate: data.checkInDate,
          checkOutDate: data.checkOutDate,
          passengerDetails: data.passengerDetails,
          notes: data.notes, // FIX: Add notes field (contains booking token for Kiwi.com bookings)
          expiresAt,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // 4. Create package booking if packageId is provided
      if (data.packageId) {
        await tx.packageBooking.create({
          data: {
            bookingId: booking.id,
            packageId: data.packageId,
            selectedHotelId: data.selectedHotelId || null,
            adults: data.adults || 1,
            children: data.children || 0,
            infants: data.infants || 0,
            checkIn: data.checkInDate || new Date(),
            checkOut: data.checkOutDate || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to tomorrow if not provided
            totalPrice: Math.round(data.totalAmount), // Already in cents
            selectedExcursionIds: [], // Default to empty array
          }
        });
      }

      // 5. Create individual service bookings
      if (data.flightBookings) {
        for (const flightBooking of data.flightBookings) {
          console.log('[DEBUG] Creating flight booking with data:', flightBooking);
          await tx.flightBooking.create({
            data: {
              bookingId: booking.id,
              flightId: flightBooking.flightId || null, // Null for external flights
              flightNumber: flightBooking.flightNumber,
              origin: flightBooking.origin,
              destination: flightBooking.destination,
              departureDate: flightBooking.departureDate,
              arrivalDate: flightBooking.arrivalDate, // Arrival time for this flight segment
              passengers: flightBooking.passengers,
              class: flightBooking.class,
              // All prices stored in CENTS - already converted by caller
              price: flightBooking.price,
            }
          });

          // Reserve seats (soft hold) - only for database flights
          if (flightBooking.flightId) {
            await tx.flight.update({
              where: { id: flightBooking.flightId },
              data: {
                availableSeats: {
                  decrement: flightBooking.passengers
                }
              }
            });
          }
        }
      }

      if (data.hotelBookings) {
        for (const hotelBooking of data.hotelBookings) {
          await tx.hotelBooking.create({
            data: {
              bookingId: booking.id,
              hotelId: hotelBooking.hotelId,
              hotelName: hotelBooking.hotelName || '', // FIX: Use provided hotelName or empty string
              roomType: hotelBooking.roomType,
              location: hotelBooking.location || '', // FIX: Use provided location or empty string
              checkIn: hotelBooking.checkIn,
              checkOut: hotelBooking.checkOut,
              occupancy: hotelBooking.occupancy,
              nights: hotelBooking.nights,
              // All prices stored in CENTS - already converted by caller
              pricePerNight: hotelBooking.pricePerNight,
              totalPrice: hotelBooking.totalPrice,
            }
          });

          // Skip room availability update for now - focusing on core booking functionality
          // await tx.$executeRaw`
          //   UPDATE room_availability 
          //   SET "bookedRooms" = "bookedRooms" + 1 
          //   WHERE "roomId" IN (
          //     SELECT id FROM rooms WHERE "hotelId" = ${hotelBooking.hotelId}
          //   ) 
          //   AND date >= ${hotelBooking.checkIn} 
          //   AND date < ${hotelBooking.checkOut};
          // `;
        }
      }

      if (data.transferBookings) {
        for (const transferBooking of data.transferBookings) {
          await tx.transferBooking.create({
            data: {
              bookingId: booking.id,
              transferId: transferBooking.transferId,
              fromLocation: transferBooking.fromLocation,
              toLocation: transferBooking.toLocation,
              transferDate: transferBooking.transferDate,
              transferTime: '09:00', // Default time, should be parameterized
              vehicleType: 'Standard', // Should be from transfer data
              passengers: transferBooking.passengers,
              // All prices stored in CENTS - already converted by caller
              price: transferBooking.price,
            }
          });
        }
      }

      if (data.excursionBookings) {
        for (const excursionBooking of data.excursionBookings) {
          await tx.excursionBooking.create({
            data: {
              bookingId: booking.id,
              excursionId: excursionBooking.excursionId,
              title: '', // Will be populated from excursion data
              location: '', // Will be populated
              excursionDate: excursionBooking.excursionDate,
              excursionTime: '10:00', // Default time
              duration: 4, // Default duration in hours
              participants: excursionBooking.participants,
              // All prices stored in CENTS - already converted by caller
              price: excursionBooking.price,
              totalPrice: excursionBooking.price * excursionBooking.participants,
            }
          });
        }
      }

      // 6. Return booking with all related data
      return await tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          user: true,
          flights: true,
          hotels: true,
          transfers: true,
          excursions: true,
          packages: true,
        }
      }) as Booking;

    }, {
      isolationLevel: 'Serializable', // Prevent race conditions
      timeout: 10000 // 10 second timeout
    });
  }

  /**
   * Confirm a soft booking (convert to confirmed status)
   */
  static async confirmBooking(reservationCode: string): Promise<Booking> {
    const booking = await prisma.booking.findUnique({
      where: { reservationCode },
      include: {
        user: true,
        flights: true,
        hotels: true,
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
        flights: true,
        hotels: true,
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
      where: { reservationCode },
      include: {
        flights: true
      }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error('Booking is already cancelled');
    }

    // Use transaction to ensure seats are released atomically
    return await prisma.$transaction(async (tx) => {
      // Release flight seats for block seat flights
      for (const flightBooking of booking.flights) {
        // Get the full flight details to check if it's a block seat
        const flight = await tx.flight.findUnique({
          where: { id: flightBooking.flightId }
        });

        if (flight && flight.isBlockSeat) {
          await tx.flight.update({
            where: { id: flightBooking.flightId },
            data: {
              availableSeats: {
                increment: flightBooking.passengers
              }
            }
          });
          console.log(`[CANCEL] Released ${flightBooking.passengers} seats for flight ${flightBooking.flightId}`);
        }
      }

      // Update booking status to cancelled
      return await tx.booking.update({
        where: { reservationCode },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          user: true,
          flights: true,
          hotels: true,
          transfers: true,
          excursions: true
        }
      });
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
        flights: true,
        hotels: true,
        transfers: true,
        excursions: true,
        packages: true
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
        flights: true,
        hotels: true,
        transfers: true,
        excursions: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: options?.limit,
      skip: options?.offset
    });

    // Filter out expired soft bookings and release inventory
    return bookings.filter(booking => {
      if (
        booking.status === BookingStatus.SOFT &&
        booking.expiresAt &&
        booking.expiresAt < new Date()
      ) {
        // Release inventory and mark as cancelled in background (non-blocking)
        (async () => {
          try {
            // Release flight seats for block seat flights
            for (const flightBooking of booking.flights) {
              // Get the full flight details to check if it's a block seat
              const flight = await prisma.flight.findUnique({
                where: { id: flightBooking.flightId }
              });

              if (flight && flight.isBlockSeat) {
                await prisma.flight.update({
                  where: { id: flightBooking.flightId },
                  data: {
                    availableSeats: {
                      increment: flightBooking.passengers
                    }
                  }
                });
              }
            }

            // Mark booking as cancelled
            await prisma.booking.update({
              where: { id: booking.id },
              data: {
                status: BookingStatus.CANCELLED,
                cancelledAt: new Date(),
                updatedAt: new Date()
              }
            });
          } catch (error) {
            console.error('Error releasing inventory for expired booking:', booking.id, error);
          }
        })();

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