import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET hotel details by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const hotelData = await prisma.hotel.findFirst({
      where: {
        slug: slug,
        active: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        rating: true,
        address: true,
        amenities: true,
        primaryImage: true,
        images: true,
        city: {
          include: {
            country: true
          }
        },
        packages: {
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
            departureFlight: {
              select: {
                departureTime: true,
                arrivalTime: true,
                departureAirport: true
              }
            },
            returnFlight: {
              select: {
                departureTime: true
              }
            },
            packagePrices: {
              select: {
                totalPrice: true
              }
            }
          }
        },
        hotelPrices: {
          where: {
            tillDate: {
              gte: new Date()
            }
          },
          orderBy: {
            fromDate: 'asc'
          },
          select: {
            fromDate: true,
            tillDate: true,
            single: true,
            double: true,
            extraBed: true,
            paymentKids: true
          }
        }
      }
    });

    if (!hotelData) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }

    // Find additional packages where this hotel is in the hotelIds array
    const additionalPackages = await prisma.package.findMany({
      where: {
        active: true,
        availableFrom: {
          lte: new Date()
        },
        availableTo: {
          gte: new Date()
        },
        hotelIds: {
          not: null
        }
      },
      include: {
        departureFlight: {
          select: {
            departureTime: true,
            arrivalTime: true,
            departureAirport: true
          }
        },
        returnFlight: {
          select: {
            departureTime: true
          }
        },
        packagePrices: {
          select: {
            totalPrice: true
          }
        }
      }
    });

    // Filter packages that include this hotel in hotelIds
    const packagesWithThisHotel = additionalPackages.filter(pkg => {
      if (pkg.hotelIds && typeof pkg.hotelIds === 'object') {
        const hotelIdsList = Array.isArray(pkg.hotelIds) ? pkg.hotelIds : [];
        return hotelIdsList.includes(hotelData.id) && pkg.hotelId !== hotelData.id;
      }
      return false;
    });

    // Combine both sets of packages
    const allPackages = [...hotelData.packages, ...packagesWithThisHotel];

    // Convert Decimal to number for JSON serialization
    const formattedHotelData = {
      ...hotelData,
      packages: allPackages,
      hotelPrices: hotelData.hotelPrices.map(price => ({
        dateFrom: price.fromDate,
        dateTo: price.tillDate,
        single: Number(price.single),
        double: Number(price.double),
        extraBed: Number(price.extraBed),
        childPrice: Number(price.paymentKids)
      }))
    };

    return NextResponse.json(formattedHotelData);
  } catch (error) {
    console.error('Error fetching hotel details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotel details' },
      { status: 500 }
    );
  }
}