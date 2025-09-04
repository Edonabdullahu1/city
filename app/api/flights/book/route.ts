import { NextRequest, NextResponse } from 'next/server';
import { FlightService } from '@/lib/services/flightService';
import { BookingService } from '@/lib/services/bookingService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      bookingId,
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      class: flightClass,
      price,
      flightNumber,
      isBlockSeat,
      serpApiData,
    } = body;

    // Validate required fields
    if (!bookingId || !origin || !destination || !departureDate || !passengers || !price) {
      return NextResponse.json(
        { error: 'Missing required booking information' },
        { status: 400 }
      );
    }

    // Check if booking exists and user has access
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check access rights
    const canAccess = BookingService.canUserAccessBooking(
      booking, 
      session.user.id, 
      session.user.role as UserRole
    );

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // For guaranteed flights, check availability
    if (isBlockSeat && flightNumber) {
      const isAvailable = await FlightService.checkFlightAvailability(flightNumber, passengers);
      if (!isAvailable) {
        return NextResponse.json(
          { error: 'Not enough guaranteed seats available' },
          { status: 400 }
        );
      }
    }

    // Create flight booking
    const flightBookingInput = {
      bookingId,
      origin,
      destination,
      departureDate: new Date(departureDate),
      returnDate: returnDate ? new Date(returnDate) : undefined,
      passengers,
      class: flightClass || 'Economy',
      price,
      flightNumber,
      isBlockSeat: isBlockSeat || false,
      serpApiData,
    };

    const flightBooking = await FlightService.bookFlight(flightBookingInput);

    return NextResponse.json({
      success: true,
      data: flightBooking,
      message: 'Flight booked successfully',
    });

  } catch (error) {
    console.error('Flight booking error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to book flight' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Check booking access
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const canAccess = BookingService.canUserAccessBooking(
      booking, 
      session.user.id, 
      session.user.role as UserRole
    );

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get flight bookings for this booking
    const flightBookings = await FlightService.getFlightBookingsByBookingId(bookingId);

    return NextResponse.json({
      success: true,
      data: flightBookings,
    });

  } catch (error) {
    console.error('Get flight bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to get flight bookings' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const flightBookingId = searchParams.get('id');

    if (!flightBookingId) {
      return NextResponse.json(
        { error: 'Flight booking ID is required' },
        { status: 400 }
      );
    }

    // Get flight booking to check access
    const flightBooking = await FlightService.getFlightBooking(flightBookingId);
    if (!flightBooking) {
      return NextResponse.json(
        { error: 'Flight booking not found' },
        { status: 404 }
      );
    }

    // Check access rights
    const canAccess = BookingService.canUserAccessBooking(
      flightBooking.booking, 
      session.user.id, 
      session.user.role as UserRole
    );

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Cancel flight booking
    await FlightService.cancelFlightBooking(flightBookingId);

    return NextResponse.json({
      success: true,
      message: 'Flight booking cancelled successfully',
    });

  } catch (error) {
    console.error('Cancel flight booking error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel flight booking' },
      { status: 500 }
    );
  }
}