import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BookingService } from '@/lib/services/bookingService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['destination', 'checkIn', 'checkOut', 'adults', 'customerName', 'customerEmail', 'customerPhone'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create soft booking
    const booking = await BookingService.createSoftBooking({
      userId: session.user.id,
      flightId: body.flightId,
      hotelId: body.hotelId,
      checkIn: new Date(body.checkIn),
      checkOut: new Date(body.checkOut),
      adults: body.adults,
      children: body.children || 0,
      infants: body.infants || 0,
      totalAmount: body.totalAmount || 0, // This would be calculated based on selected services
      currency: 'EUR',
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone
    });

    return NextResponse.json(booking);

  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookings = await BookingService.getUserBookings(session.user.id, {
      limit: 20
    });

    return NextResponse.json(bookings);

  } catch (error) {
    console.error('Booking fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}