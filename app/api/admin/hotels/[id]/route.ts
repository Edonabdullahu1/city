import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET single hotel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: {
        city: {
          select: {
            name: true,
            country: {
              select: {
                name: true
              }
            }
          }
        },
        hotelPrices: {
          orderBy: {
            fromDate: 'asc'
          }
        }
      }
    });

    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }

    // Transform for consistent response
    const transformedHotel = {
      ...hotel,
      location: hotel.city ? hotel.city.name : '', // Just the city name for dropdown matching
      locationDisplay: hotel.city ? `${hotel.city.name}, ${hotel.city.country.name}` : '', // Full display name
      starRating: hotel.rating,
      facilities: hotel.amenities,
      city: undefined
    };

    return NextResponse.json(transformedHotel);
  } catch (error) {
    console.error('Error fetching hotel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotel' },
      { status: 500 }
    );
  }
}

// PUT update hotel
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, location, address, starRating, facilities } = body;

    // Find city by name if location is provided
    let cityId = undefined;
    if (location) {
      const city = await prisma.city.findFirst({
        where: { name: location }
      });
      if (city) {
        cityId = city.id;
      }
    }

    const hotel = await prisma.hotel.update({
      where: { id },
      data: {
        name,
        ...(cityId && { cityId }),
        address,
        rating: starRating || 3,
        amenities: facilities || []
      },
      include: {
        city: {
          select: {
            name: true,
            country: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // Transform for consistent response
    const transformedHotel = {
      ...hotel,
      location: hotel.city ? hotel.city.name : '', // Just the city name for dropdown matching
      locationDisplay: hotel.city ? `${hotel.city.name}, ${hotel.city.country.name}` : '', // Full display name
      starRating: hotel.rating,
      facilities: hotel.amenities,
      city: undefined
    };

    return NextResponse.json(transformedHotel);
  } catch (error) {
    console.error('Error updating hotel:', error);
    return NextResponse.json(
      { error: 'Failed to update hotel' },
      { status: 500 }
    );
  }
}

// DELETE hotel
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Check if hotel has bookings
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: {
        bookings: {
          select: { id: true }
        }
      }
    });

    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }

    if (hotel.bookings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete hotel with existing bookings' },
        { status: 400 }
      );
    }

    // Delete related prices first
    await prisma.hotelPrice.deleteMany({
      where: { hotelId: id }
    });

    // Delete hotel
    await prisma.hotel.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting hotel:', error);
    return NextResponse.json(
      { error: 'Failed to delete hotel' },
      { status: 500 }
    );
  }
}