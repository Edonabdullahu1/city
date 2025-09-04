import { NextRequest, NextResponse } from 'next/server';
import { HotelService } from '@/lib/services/hotelService';
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
      hotelName,
      location,
      checkIn,
      checkOut,
      roomType,
      occupancy,
      pricePerNight,
      specialRequests,
    } = body;

    // Validate required fields
    if (!bookingId || !hotelName || !location || !checkIn || !checkOut || !roomType || !occupancy || !pricePerNight) {
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

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Validate dates
    const dateValidation = HotelService.validateBookingDates(checkInDate, checkOutDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { error: dateValidation.error },
        { status: 400 }
      );
    }

    // Calculate nights
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    // Create hotel booking
    const hotelBookingInput = {
      bookingId,
      hotelName,
      location,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      roomType,
      occupancy,
      nights,
      pricePerNight,
      specialRequests,
    };

    const hotelBooking = await HotelService.bookHotel(hotelBookingInput);

    return NextResponse.json({
      success: true,
      data: hotelBooking,
      message: 'Hotel booked successfully',
    });

  } catch (error) {
    console.error('Hotel booking error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to book hotel' },
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

    // Get hotel bookings for this booking
    const hotelBookings = await HotelService.getHotelBookingsByBookingId(bookingId);

    return NextResponse.json({
      success: true,
      data: hotelBookings,
    });

  } catch (error) {
    console.error('Get hotel bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to get hotel bookings' },
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
    const hotelBookingId = searchParams.get('id');

    if (!hotelBookingId) {
      return NextResponse.json(
        { error: 'Hotel booking ID is required' },
        { status: 400 }
      );
    }

    // Get hotel booking to check access
    const hotelBooking = await HotelService.getHotelBooking(hotelBookingId);
    if (!hotelBooking) {
      return NextResponse.json(
        { error: 'Hotel booking not found' },
        { status: 404 }
      );
    }

    // Check access rights
    const canAccess = BookingService.canUserAccessBooking(
      hotelBooking.booking, 
      session.user.id, 
      session.user.role as UserRole
    );

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Cancel hotel booking
    await HotelService.cancelHotelBooking(hotelBookingId);

    return NextResponse.json({
      success: true,
      message: 'Hotel booking cancelled successfully',
    });

  } catch (error) {
    console.error('Cancel hotel booking error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel hotel booking' },
      { status: 500 }
    );
  }
}