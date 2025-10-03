import prisma from '@/lib/prisma';
import { BookingStatus } from '@prisma/client';

export class InventoryService {
  /**
   * Check flight availability for specific dates and passengers
   */
  static async checkFlightAvailability(
    flightId: string,
    passengers: number
  ): Promise<{
    available: boolean;
    availableSeats: number;
    totalSeats: number;
  }> {
    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      select: {
        availableSeats: true,
        totalSeats: true,
        isBlockSeat: true,
      }
    });

    if (!flight) {
      throw new Error(`Flight ${flightId} not found`);
    }

    return {
      available: flight.availableSeats >= passengers,
      availableSeats: flight.availableSeats,
      totalSeats: flight.totalSeats,
    };
  }

  /**
   * Check hotel room availability for specific dates
   */
  static async checkHotelAvailability(
    hotelId: string,
    checkIn: Date,
    checkOut: Date,
    roomsNeeded: number = 1
  ): Promise<{
    available: boolean;
    availableRooms: number;
    unavailableDates: Date[];
  }> {
    // Check for blackout dates
    const blackoutDates = await prisma.blackoutDate.findMany({
      where: {
        hotelId,
        date: {
          gte: checkIn,
          lt: checkOut,
        },
      },
      select: { date: true },
    });

    if (blackoutDates.length > 0) {
      return {
        available: false,
        availableRooms: 0,
        unavailableDates: blackoutDates.map(bd => bd.date),
      };
    }

    // Check room availability for all nights
    const unavailableDates = await prisma.$queryRaw<Array<{date: Date}>>`
      SELECT ra.date 
      FROM room_availability ra
      INNER JOIN rooms r ON r.id = ra.room_id
      WHERE r.hotel_id = ${hotelId}
      AND ra.date >= ${checkIn}
      AND ra.date < ${checkOut}
      AND (ra.available_rooms - ra.booked_rooms) < ${roomsNeeded};
    `;

    // Get minimum available rooms across the stay
    const availabilityStats = await prisma.$queryRaw<Array<{min_available: number}>>`
      SELECT MIN(ra.available_rooms - ra.booked_rooms) as min_available
      FROM room_availability ra
      INNER JOIN rooms r ON r.id = ra.room_id
      WHERE r.hotel_id = ${hotelId}
      AND ra.date >= ${checkIn}
      AND ra.date < ${checkOut};
    `;

    const minAvailable = availabilityStats[0]?.min_available || 0;

    return {
      available: unavailableDates.length === 0 && minAvailable >= roomsNeeded,
      availableRooms: Math.max(0, minAvailable),
      unavailableDates: unavailableDates.map(ud => ud.date),
    };
  }

  /**
   * Hold inventory for a soft booking (3-hour hold)
   */
  static async holdInventory(
    bookingId: string,
    items: {
      flights?: Array<{ flightId: string; passengers: number }>;
      hotels?: Array<{ hotelId: string; checkIn: Date; checkOut: Date; rooms: number }>;
    }
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Hold flight seats
      if (items.flights) {
        for (const flightItem of items.flights) {
          await tx.flight.update({
            where: { id: flightItem.flightId },
            data: {
              availableSeats: {
                decrement: flightItem.passengers,
              },
            },
          });
        }
      }

      // Hold hotel rooms
      if (items.hotels) {
        for (const hotelItem of items.hotels) {
          await tx.$executeRaw`
            UPDATE room_availability 
            SET booked_rooms = booked_rooms + ${hotelItem.rooms}
            WHERE room_id IN (
              SELECT id FROM rooms WHERE hotel_id = ${hotelItem.hotelId}
            ) 
            AND date >= ${hotelItem.checkIn} 
            AND date < ${hotelItem.checkOut};
          `;
        }
      }
    });
  }

  /**
   * Release inventory when booking expires or is cancelled
   */
  static async releaseInventory(bookingId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Get booking details
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          flights: true,
          hotels: true,
        },
      });

      if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
      }

      // Release flight seats
      for (const flightBooking of booking.flights) {
        if (flightBooking.flightId) {
          await tx.flight.update({
            where: { id: flightBooking.flightId },
            data: {
              availableSeats: {
                increment: flightBooking.passengers,
              },
            },
          });
        }
      }

      // Release hotel rooms
      for (const hotelBooking of booking.hotels) {
        if (hotelBooking.hotelId) {
          const roomsToRelease = 1; // Assuming 1 room per booking for now
          await tx.$executeRaw`
            UPDATE room_availability 
            SET booked_rooms = GREATEST(0, booked_rooms - ${roomsToRelease})
            WHERE room_id IN (
              SELECT id FROM rooms WHERE hotel_id = ${hotelBooking.hotelId}
            ) 
            AND date >= ${hotelBooking.checkIn} 
            AND date < ${hotelBooking.checkOut};
          `;
        }
      }
    });
  }

  /**
   * Confirm inventory hold (convert soft booking to confirmed)
   */
  static async confirmInventory(bookingId: string): Promise<void> {
    // When confirming, we keep the inventory held but change status
    // No need to modify inventory counts as they're already reserved
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        expiresAt: null,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get current inventory status for a hotel
   */
  static async getHotelInventoryStatus(
    hotelId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<Array<{
    date: Date;
    availableRooms: number;
    bookedRooms: number;
    totalRooms: number;
  }>> {
    const inventory = await prisma.$queryRaw<Array<{
      date: Date;
      available_rooms: number;
      booked_rooms: number;
      total_rooms: number;
    }>>`
      SELECT 
        ra.date,
        ra.available_rooms,
        ra.booked_rooms,
        r.total_rooms
      FROM room_availability ra
      INNER JOIN rooms r ON r.id = ra.room_id
      WHERE r.hotel_id = ${hotelId}
      AND ra.date >= ${fromDate}
      AND ra.date <= ${toDate}
      ORDER BY ra.date;
    `;

    return inventory.map(item => ({
      date: item.date,
      availableRooms: item.available_rooms - item.booked_rooms,
      bookedRooms: item.booked_rooms,
      totalRooms: item.total_rooms,
    }));
  }

  /**
   * Get current inventory status for a flight
   */
  static async getFlightInventoryStatus(flightId: string): Promise<{
    availableSeats: number;
    totalSeats: number;
    bookedSeats: number;
    isBlockSeat: boolean;
  }> {
    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      select: {
        availableSeats: true,
        totalSeats: true,
        isBlockSeat: true,
      },
    });

    if (!flight) {
      throw new Error(`Flight ${flightId} not found`);
    }

    return {
      availableSeats: flight.availableSeats,
      totalSeats: flight.totalSeats,
      bookedSeats: flight.totalSeats - flight.availableSeats,
      isBlockSeat: flight.isBlockSeat,
    };
  }

  /**
   * Batch check availability for multiple services
   */
  static async batchCheckAvailability(requests: {
    flights?: Array<{ flightId: string; passengers: number }>;
    hotels?: Array<{ hotelId: string; checkIn: Date; checkOut: Date; rooms?: number }>;
  }): Promise<{
    flights: Array<{ flightId: string; available: boolean; availableSeats: number }>;
    hotels: Array<{ hotelId: string; available: boolean; availableRooms: number }>;
    allAvailable: boolean;
  }> {
    const results = {
      flights: [] as Array<{ flightId: string; available: boolean; availableSeats: number }>,
      hotels: [] as Array<{ hotelId: string; available: boolean; availableRooms: number }>,
      allAvailable: true,
    };

    // Check flight availability
    if (requests.flights) {
      for (const flightRequest of requests.flights) {
        const availability = await this.checkFlightAvailability(
          flightRequest.flightId,
          flightRequest.passengers
        );
        
        results.flights.push({
          flightId: flightRequest.flightId,
          available: availability.available,
          availableSeats: availability.availableSeats,
        });

        if (!availability.available) {
          results.allAvailable = false;
        }
      }
    }

    // Check hotel availability
    if (requests.hotels) {
      for (const hotelRequest of requests.hotels) {
        const availability = await this.checkHotelAvailability(
          hotelRequest.hotelId,
          hotelRequest.checkIn,
          hotelRequest.checkOut,
          hotelRequest.rooms || 1
        );

        results.hotels.push({
          hotelId: hotelRequest.hotelId,
          available: availability.available,
          availableRooms: availability.availableRooms,
        });

        if (!availability.available) {
          results.allAvailable = false;
        }
      }
    }

    return results;
  }

  /**
   * Clean up expired inventory holds
   */
  static async cleanupExpiredHolds(): Promise<number> {
    let releasedBookings = 0;

    // Find expired soft bookings
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.SOFT,
        expiresAt: {
          lt: new Date(),
        },
      },
      select: { id: true },
    });

    // Release inventory for each expired booking
    for (const booking of expiredBookings) {
      try {
        await this.releaseInventory(booking.id);
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            updatedAt: new Date(),
          },
        });
        releasedBookings++;
      } catch (error) {
        console.error(`Failed to release inventory for booking ${booking.id}:`, error);
      }
    }

    return releasedBookings;
  }
}