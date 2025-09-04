import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET search packages
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cityId = searchParams.get('cityId');
    const date = searchParams.get('date');
    const adults = parseInt(searchParams.get('adults') || '2');
    const children = parseInt(searchParams.get('children') || '0');

    // Allow 'all' to fetch all packages
    if (cityId === 'all' && date === 'all') {
      const packages = await prisma.package.findMany({
        where: {
          active: true,
          availableFrom: {
            lte: new Date()
          },
          availableTo: {
            gte: new Date()
          }
        },
        include: {
          hotel: {
            select: {
              name: true,
              rating: true,
              address: true,
              amenities: true
            }
          },
          city: {
            include: {
              country: true
            }
          },
          packagePrices: {
            orderBy: {
              totalPrice: 'asc'
            }
          },
          departureFlight: {
            select: {
              departureTime: true,
              arrivalTime: true,
              availableSeats: true
            }
          },
          returnFlight: {
            select: {
              departureTime: true,
              arrivalTime: true
            }
          }
        }
      });

      return NextResponse.json(packages);
    }

    if (!cityId || !date) {
      return NextResponse.json(
        { error: 'City and date are required' },
        { status: 400 }
      );
    }

    const searchDate = new Date(date);

    // Find packages for the city with available flights on the selected date
    const packages = await prisma.package.findMany({
      where: {
        cityId,
        active: true,
        availableFrom: {
          lte: searchDate
        },
        availableTo: {
          gte: searchDate
        }
      },
      include: {
        hotel: {
          select: {
            name: true,
            rating: true,
            address: true,
            amenities: true
          }
        },
        city: {
          include: {
            country: true
          }
        },
        packagePrices: {
          where: {
            adults: {
              lte: 3 // Max adults we support
            }
          },
          orderBy: {
            totalPrice: 'asc'
          }
        },
        departureFlight: {
          select: {
            departureTime: true,
            arrivalTime: true,
            availableSeats: true
          }
        },
        returnFlight: {
          select: {
            departureTime: true,
            arrivalTime: true
          }
        }
      }
    });

    // Filter packages that have flights available around the selected date
    const availablePackages = packages.filter(pkg => {
      if (!pkg.departureFlight) return false;
      
      const departureDate = new Date(pkg.departureFlight.departureTime);
      const dateDiff = Math.abs(departureDate.getTime() - searchDate.getTime());
      const daysDiff = Math.ceil(dateDiff / (1000 * 60 * 60 * 24));
      
      // Show packages with flights within 3 days of selected date
      return daysDiff <= 3 && pkg.departureFlight.availableSeats > 0;
    });

    // Sort by featured status and price
    availablePackages.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.basePrice - b.basePrice;
    });

    return NextResponse.json(availablePackages);
  } catch (error) {
    console.error('Error searching packages:', error);
    return NextResponse.json(
      { error: 'Failed to search packages' },
      { status: 500 }
    );
  }
}