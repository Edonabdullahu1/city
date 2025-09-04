import { NextRequest, NextResponse } from 'next/server';
import { HotelBookingService } from '@/lib/services/hotelBooking';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination, checkIn, checkOut, guests, rooms } = body;

    if (!destination || !checkIn || !checkOut || !guests) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const hotels = await HotelBookingService.searchHotels({
      destination,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests: guests || 1,
      rooms: rooms || 1
    });

    return NextResponse.json({ hotels });
  } catch (error) {
    console.error('Error searching hotels:', error);
    return NextResponse.json(
      { error: 'Failed to search hotels' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const destination = searchParams.get('destination');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const guests = searchParams.get('guests');
    const rooms = searchParams.get('rooms');

    if (!destination || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const hotels = await HotelBookingService.searchHotels({
      destination,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests: parseInt(guests || '1'),
      rooms: parseInt(rooms || '1')
    });

    return NextResponse.json({ hotels });
  } catch (error) {
    console.error('Error searching hotels:', error);
    return NextResponse.json(
      { error: 'Failed to search hotels' },
      { status: 500 }
    );
  }
}