import { NextRequest, NextResponse } from 'next/server';
import { HotelService } from '@/lib/services/hotelService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';

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
    const location = searchParams.get('location');
    const hotelId = searchParams.get('id');

    if (hotelId) {
      // Get specific hotel
      const hotel = HotelService.getHotelById(hotelId);
      
      if (!hotel) {
        return NextResponse.json(
          { error: 'Hotel not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: hotel,
      });
    }

    if (location) {
      // Get hotels by location
      const hotels = HotelService.getHotelsByLocation(location);
      
      return NextResponse.json({
        success: true,
        data: hotels,
      });
    }

    // Get all hotels
    const hotels = HotelService.getAllHotels();

    return NextResponse.json({
      success: true,
      data: hotels,
    });

  } catch (error) {
    console.error('Get hotels error:', error);
    return NextResponse.json(
      { error: 'Failed to get hotels' },
      { status: 500 }
    );
  }
}