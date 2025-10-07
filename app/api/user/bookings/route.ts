import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BookingService } from '@/lib/services/bookingService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's bookings
    const bookings = await BookingService.getUserBookings(session.user.id, { limit, offset });

    // Transform bookings for user dashboard with full service details
    const transformedBookings = bookings.map(booking => ({
      id: booking.id,
      reservationCode: booking.reservationCode,
      status: booking.status,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      expiresAt: booking.expiresAt,
      createdAt: booking.createdAt,
      confirmedAt: booking.confirmedAt,
      paidAt: booking.paidAt,
      services: {
        flights: booking.flights.map(flight => ({
          id: flight.id,
          origin: flight.origin,
          destination: flight.destination,
          departureDate: flight.departureDate,
          returnDate: flight.returnDate,
          passengers: flight.passengers,
          class: flight.class
        })),
        hotels: booking.hotels.map(hotel => ({
          id: hotel.id,
          hotelName: hotel.hotelName,
          location: hotel.location,
          checkIn: hotel.checkIn,
          checkOut: hotel.checkOut,
          roomType: hotel.roomType,
          nights: hotel.nights
        })),
        transfers: booking.transfers.map(transfer => ({
          id: transfer.id,
          fromLocation: transfer.fromLocation,
          toLocation: transfer.toLocation,
          transferDate: transfer.transferDate,
          transferTime: transfer.transferTime,
          vehicleType: transfer.vehicleType
        })),
        excursions: booking.excursions.map(excursion => ({
          id: excursion.id,
          title: excursion.title,
          location: excursion.location,
          excursionDate: excursion.excursionDate,
          excursionTime: excursion.excursionTime,
          participants: excursion.participants
        }))
      }
    }));

    return NextResponse.json({
      bookings: transformedBookings,
      total: bookings.length,
      hasMore: bookings.length === limit
    });

  } catch (error) {
    console.error('User bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}