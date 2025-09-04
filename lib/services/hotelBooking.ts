import { PrismaClient } from '@prisma/client';
import { RoomAvailabilityService } from './roomAvailability';

const prisma = new PrismaClient();

export interface HotelSearchParams {
  destination: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  rooms: number;
}

export interface AvailableHotel {
  id: string;
  name: string;
  location: string;
  city: string;
  country: string;
  category: string;
  rating: number;
  description: string;
  amenities: string[];
  images: string[];
  availableRooms: {
    roomId: string;
    type: string;
    capacity: number;
    amenities: string[];
    availableCount: number;
    pricePerNight: number;
    totalPrice: number;
  }[];
  lowestPrice: number;
}

export class HotelBookingService {
  /**
   * Search for available hotels
   */
  static async searchHotels({
    destination,
    checkIn,
    checkOut,
    guests,
    rooms
  }: HotelSearchParams): Promise<AvailableHotel[]> {
    // Calculate number of nights
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    // Find hotels in the destination
    const hotels = await prisma.hotel.findMany({
      where: {
        OR: [
          { city: { contains: destination, mode: 'insensitive' } },
          { location: { contains: destination, mode: 'insensitive' } },
          { country: { contains: destination, mode: 'insensitive' } }
        ],
        active: true
      },
      include: {
        rooms: true,
        blackoutDates: {
          where: {
            date: {
              gte: checkIn,
              lt: checkOut
            }
          }
        }
      }
    });

    const availableHotels: AvailableHotel[] = [];

    for (const hotel of hotels) {
      // Check if hotel has blackout dates in the period
      if (hotel.blackoutDates.length > 0) {
        continue; // Skip hotels with blackout dates
      }

      const availableRooms = [];

      for (const room of hotel.rooms) {
        // Check if room can accommodate guests
        if (room.capacity < guests) {
          continue;
        }

        // Check room availability for the date range
        const availability = await RoomAvailabilityService.checkAvailability({
          hotelId: hotel.id,
          checkIn,
          checkOut,
          roomType: room.type,
          guests
        });

        // Filter to this specific room
        const roomAvailability = availability.filter(a => a.roomId === room.id);

        // Check if room is available for all dates
        const isAvailable = roomAvailability.every(a => a.isAvailable && a.availableRooms >= rooms);

        if (isAvailable) {
          // Calculate total price for the stay
          const totalPrice = roomAvailability.reduce((sum, a) => sum + a.price, 0) * rooms;
          const avgPricePerNight = Math.round(totalPrice / nights / rooms);

          availableRooms.push({
            roomId: room.id,
            type: room.type,
            capacity: room.capacity,
            amenities: room.amenities,
            availableCount: Math.min(...roomAvailability.map(a => a.availableRooms)),
            pricePerNight: avgPricePerNight,
            totalPrice
          });
        }
      }

      if (availableRooms.length > 0) {
        availableHotels.push({
          id: hotel.id,
          name: hotel.name,
          location: hotel.location,
          city: hotel.city,
          country: hotel.country,
          category: hotel.category,
          rating: hotel.rating,
          description: hotel.description,
          amenities: hotel.amenities,
          images: hotel.images,
          availableRooms,
          lowestPrice: Math.min(...availableRooms.map(r => r.totalPrice))
        });
      }
    }

    // Sort by lowest price
    return availableHotels.sort((a, b) => a.lowestPrice - b.lowestPrice);
  }

  /**
   * Create a hotel booking
   */
  static async createBooking({
    bookingId,
    hotelId,
    roomId,
    checkIn,
    checkOut,
    occupancy,
    specialRequests
  }: {
    bookingId: string;
    hotelId: string;
    roomId: string;
    checkIn: Date;
    checkOut: Date;
    occupancy: number;
    specialRequests?: string;
  }) {
    // Get hotel and room details
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId }
    });

    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!hotel || !room) {
      throw new Error('Hotel or room not found');
    }

    // Calculate nights
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Get pricing for the period
    const availability = await RoomAvailabilityService.checkAvailability({
      hotelId,
      checkIn,
      checkOut,
      roomType: room.type,
      guests: occupancy
    });

    const roomAvailability = availability.filter(a => a.roomId === roomId);
    const totalPrice = roomAvailability.reduce((sum, a) => sum + a.price, 0);
    const pricePerNight = Math.round(totalPrice / nights);

    // Book the rooms (this will update availability)
    await RoomAvailabilityService.bookRooms(roomId, checkIn, checkOut, 1);

    // Generate booking number
    const bookingNumber = `HTL-${Date.now().toString(36).toUpperCase()}`;

    // Create the hotel booking record
    const hotelBooking = await prisma.hotelBooking.create({
      data: {
        bookingId,
        hotelId,
        hotelName: hotel.name,
        roomId,
        roomType: room.type,
        location: `${hotel.location}, ${hotel.city}`,
        checkIn,
        checkOut,
        occupancy,
        nights,
        pricePerNight,
        totalPrice,
        bookingNumber,
        specialRequests
      }
    });

    return hotelBooking;
  }

  /**
   * Cancel a hotel booking
   */
  static async cancelBooking(hotelBookingId: string) {
    const booking = await prisma.hotelBooking.findUnique({
      where: { id: hotelBookingId }
    });

    if (!booking) {
      throw new Error('Hotel booking not found');
    }

    if (booking.roomId) {
      // Release the rooms
      await RoomAvailabilityService.releaseRooms(
        booking.roomId,
        booking.checkIn,
        booking.checkOut,
        1
      );
    }

    // Update booking status in audit log
    return booking;
  }

  /**
   * Get hotel booking details
   */
  static async getBookingDetails(bookingId: string) {
    const hotelBookings = await prisma.hotelBooking.findMany({
      where: { bookingId },
      include: {
        hotel: true
      }
    });

    return hotelBookings;
  }

  /**
   * Check if dates are available for a specific room
   */
  static async checkRoomAvailability(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    numberOfRooms: number = 1
  ): Promise<boolean> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        hotel: {
          include: {
            blackoutDates: {
              where: {
                date: {
                  gte: checkIn,
                  lt: checkOut
                }
              }
            }
          }
        }
      }
    });

    if (!room) {
      return false;
    }

    // Check blackout dates
    if (room.hotel.blackoutDates.length > 0) {
      return false;
    }

    // Check room availability
    const availability = await RoomAvailabilityService.checkAvailability({
      hotelId: room.hotelId,
      checkIn,
      checkOut,
      roomType: room.type,
      guests: 1
    });

    const roomAvailability = availability.filter(a => a.roomId === roomId);
    
    return roomAvailability.every(a => a.isAvailable && a.availableRooms >= numberOfRooms);
  }
}