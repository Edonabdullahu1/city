import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CheckAvailabilityParams {
  hotelId: string;
  checkIn: Date;
  checkOut: Date;
  roomType?: string;
  guests: number;
}

export interface RoomAvailabilityInfo {
  roomId: string;
  roomType: string;
  date: Date;
  availableRooms: number;
  totalRooms: number;
  price: number;
  isAvailable: boolean;
}

export class RoomAvailabilityService {
  /**
   * Initialize room availability for a date range
   */
  static async initializeAvailability(
    roomId: string,
    startDate: Date,
    endDate: Date,
    totalRooms: number
  ) {
    const dates = this.getDateRange(startDate, endDate);
    const availabilityRecords = dates.map(date => ({
      roomId,
      date,
      availableRooms: totalRooms,
      bookedRooms: 0,
    }));

    await prisma.roomAvailability.createMany({
      data: availabilityRecords,
      skipDuplicates: true,
    });
  }

  /**
   * Check room availability for a date range
   */
  static async checkAvailability({
    hotelId,
    checkIn,
    checkOut,
    roomType,
    guests,
  }: CheckAvailabilityParams): Promise<RoomAvailabilityInfo[]> {
    const rooms = await prisma.room.findMany({
      where: {
        hotelId,
        ...(roomType && { type: roomType }),
        capacity: { gte: guests },
      },
      include: {
        availability: {
          where: {
            date: {
              gte: checkIn,
              lt: checkOut,
            },
          },
        },
      },
    });

    const results: RoomAvailabilityInfo[] = [];
    const dates = this.getDateRange(checkIn, checkOut);

    for (const room of rooms) {
      for (const date of dates) {
        const availability = room.availability.find(
          a => a.date.toISOString().split('T')[0] === date.toISOString().split('T')[0]
        );

        const availableRooms = availability?.availableRooms ?? room.totalRooms;
        const price = availability?.priceOverride ?? room.basePrice;
        const isBlocked = availability?.isBlocked ?? false;

        results.push({
          roomId: room.id,
          roomType: room.type,
          date,
          availableRooms,
          totalRooms: room.totalRooms,
          price,
          isAvailable: availableRooms > 0 && !isBlocked,
        });
      }
    }

    return results;
  }

  /**
   * Book rooms and update availability
   */
  static async bookRooms(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    numberOfRooms: number
  ) {
    const dates = this.getDateRange(checkIn, checkOut);
    
    // Check availability first
    const availability = await prisma.roomAvailability.findMany({
      where: {
        roomId,
        date: { in: dates },
      },
    });

    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    // Check if all dates have enough availability
    for (const date of dates) {
      const avail = availability.find(
        a => a.date.toISOString().split('T')[0] === date.toISOString().split('T')[0]
      );
      
      const availableRooms = avail?.availableRooms ?? room.totalRooms;
      if (availableRooms < numberOfRooms) {
        throw new Error(`Not enough rooms available on ${date.toISOString().split('T')[0]}`);
      }
      if (avail?.isBlocked) {
        throw new Error(`Rooms are blocked on ${date.toISOString().split('T')[0]}`);
      }
    }

    // Update availability
    for (const date of dates) {
      const existing = availability.find(
        a => a.date.toISOString().split('T')[0] === date.toISOString().split('T')[0]
      );

      if (existing) {
        await prisma.roomAvailability.update({
          where: { id: existing.id },
          data: {
            availableRooms: { decrement: numberOfRooms },
            bookedRooms: { increment: numberOfRooms },
          },
        });
      } else {
        await prisma.roomAvailability.create({
          data: {
            roomId,
            date,
            availableRooms: room.totalRooms - numberOfRooms,
            bookedRooms: numberOfRooms,
          },
        });
      }
    }
  }

  /**
   * Release rooms (for cancellations or expired soft bookings)
   */
  static async releaseRooms(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    numberOfRooms: number
  ) {
    const dates = this.getDateRange(checkIn, checkOut);

    for (const date of dates) {
      const existing = await prisma.roomAvailability.findFirst({
        where: {
          roomId,
          date,
        },
      });

      if (existing) {
        await prisma.roomAvailability.update({
          where: { id: existing.id },
          data: {
            availableRooms: { increment: numberOfRooms },
            bookedRooms: { decrement: numberOfRooms },
          },
        });
      }
    }
  }

  /**
   * Update price for specific dates
   */
  static async updatePricing(
    roomId: string,
    startDate: Date,
    endDate: Date,
    priceOverride: number
  ) {
    const dates = this.getDateRange(startDate, endDate);
    
    for (const date of dates) {
      await prisma.roomAvailability.upsert({
        where: {
          roomId_date: {
            roomId,
            date,
          },
        },
        create: {
          roomId,
          date,
          availableRooms: (await prisma.room.findUnique({ where: { id: roomId } }))?.totalRooms ?? 0,
          priceOverride,
        },
        update: {
          priceOverride,
        },
      });
    }
  }

  /**
   * Block/unblock rooms for specific dates
   */
  static async setBlockedStatus(
    roomId: string,
    startDate: Date,
    endDate: Date,
    isBlocked: boolean
  ) {
    const dates = this.getDateRange(startDate, endDate);
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    
    if (!room) {
      throw new Error('Room not found');
    }

    for (const date of dates) {
      await prisma.roomAvailability.upsert({
        where: {
          roomId_date: {
            roomId,
            date,
          },
        },
        create: {
          roomId,
          date,
          availableRooms: room.totalRooms,
          isBlocked,
        },
        update: {
          isBlocked,
        },
      });
    }
  }

  /**
   * Get availability calendar for a room
   */
  static async getAvailabilityCalendar(
    roomId: string,
    startDate: Date,
    endDate: Date
  ) {
    const availability = await prisma.roomAvailability.findMany({
      where: {
        roomId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    const dates = this.getDateRange(startDate, endDate);
    const calendar = dates.map(date => {
      const avail = availability.find(
        a => a.date.toISOString().split('T')[0] === date.toISOString().split('T')[0]
      );

      return {
        date,
        availableRooms: avail?.availableRooms ?? room.totalRooms,
        bookedRooms: avail?.bookedRooms ?? 0,
        totalRooms: room.totalRooms,
        price: avail?.priceOverride ?? room.basePrice,
        isBlocked: avail?.isBlocked ?? false,
      };
    });

    return calendar;
  }

  /**
   * Helper function to generate date range
   */
  private static getDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current < end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }
}