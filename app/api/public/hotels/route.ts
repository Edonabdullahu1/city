import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all active hotels
export async function GET(request: NextRequest) {
  try {
    const hotels = await prisma.hotel.findMany({
      where: {
        active: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        rating: true,
        address: true,
        primaryImage: true,
        images: true,
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
            country: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: [
        { rating: 'desc' },
        { name: 'asc' }
      ]
    });

    // Get all active packages to count hotel appearances
    const packages = await prisma.package.findMany({
      where: {
        active: true
      },
      select: {
        hotelId: true,
        hotelIds: true
      }
    });

    // Count packages for each hotel
    const hotelsWithCounts = hotels.map(hotel => {
      let packageCount = 0;
      
      for (const pkg of packages) {
        // Check if hotel is the primary hotel
        if (pkg.hotelId === hotel.id) {
          packageCount++;
        }
        // Check if hotel is in the hotelIds array
        else if (pkg.hotelIds && typeof pkg.hotelIds === 'object') {
          const hotelIdsList = Array.isArray(pkg.hotelIds) ? pkg.hotelIds : [];
          if (hotelIdsList.includes(hotel.id)) {
            packageCount++;
          }
        }
      }

      return {
        ...hotel,
        _count: {
          packages: packageCount
        }
      };
    });

    return NextResponse.json(hotelsWithCounts);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotels' },
      { status: 500 }
    );
  }
}