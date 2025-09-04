import { NextRequest, NextResponse } from 'next/server';
import { HotelService } from '@/lib/services/hotelService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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
    const hotelId = searchParams.get('hotelId');
    const roomType = searchParams.get('roomType');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const occupancy = searchParams.get('occupancy');

    if (!hotelId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Hotel ID, check-in, and check-out dates are required' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const occupancyCount = parseInt(occupancy || '1');

    // Validate dates
    const dateValidation = HotelService.validateBookingDates(checkInDate, checkOutDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { error: dateValidation.error },
        { status: 400 }
      );
    }

    if (roomType) {
      // Check specific room type availability
      const isAvailable = HotelService.checkRoomAvailability(hotelId, roomType, checkInDate, checkOutDate);
      
      return NextResponse.json({
        success: true,
        data: {
          hotelId,
          roomType,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          available: isAvailable,
        },
      });
    }

    // Get all available room types for the hotel
    const availableRooms = HotelService.getAvailableRoomTypes(hotelId, occupancyCount, checkInDate, checkOutDate);
    
    return NextResponse.json({
      success: true,
      data: {
        hotelId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        occupancy: occupancyCount,
        availableRooms,
      },
    });

  } catch (error) {
    console.error('Check hotel availability error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to check hotel availability' },
      { status: 500 }
    );
  }
}

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
    const { hotelId, roomType, checkIn, checkOut, occupancy } = body;

    if (!hotelId || !roomType || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Hotel ID, room type, check-in, and check-out dates are required' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const occupancyCount = occupancy || 1;

    // Validate dates
    const dateValidation = HotelService.validateBookingDates(checkInDate, checkOutDate);
    if (!dateValidation.valid) {
      return NextResponse.json(
        { error: dateValidation.error },
        { status: 400 }
      );
    }

    // Check availability
    const isAvailable = HotelService.checkRoomAvailability(hotelId, roomType, checkInDate, checkOutDate);
    
    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Room type not available for selected dates' },
        { status: 400 }
      );
    }

    // Get available room details with pricing
    const availableRooms = HotelService.getAvailableRoomTypes(hotelId, occupancyCount, checkInDate, checkOutDate);
    const selectedRoom = availableRooms.find(room => room.type === roomType);

    if (!selectedRoom) {
      return NextResponse.json(
        { error: 'Selected room type not available' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        hotelId,
        roomType,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        occupancy: occupancyCount,
        available: true,
        roomDetails: selectedRoom,
        totalNights: Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)),
      },
    });

  } catch (error) {
    console.error('Check hotel availability error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to check hotel availability' },
      { status: 500 }
    );
  }
}