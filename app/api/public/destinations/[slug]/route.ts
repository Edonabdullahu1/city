import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET destination details by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const cityData = await prisma.city.findUnique({
      where: {
        slug: slug,
        active: true
      },
      include: {
        country: true,
        // Get packages for this city
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
            hotel: {
              select: {
                name: true,
                rating: true,
                address: true
              }
            },
            departureFlight: {
              select: {
                departureTime: true,
                arrivalTime: true
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
              },
              orderBy: {
                totalPrice: 'asc'
              }
            }
          },
          take: 6,
          orderBy: [
            { featured: 'desc' },
            { basePrice: 'asc' }
          ]
        },
        // Get hotels in this city
        hotelsInCity: {
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
            _count: {
              select: {
                packages: true
              }
            }
          },
          take: 6,
          orderBy: [
            { rating: 'desc' },
            { name: 'asc' }
          ]
        },
        // Get excursions in this city
        excursions: {
          where: {
            active: true
          },
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            price: true,
            capacity: true,
            meetingPoint: true,
            includes: true,
            images: true
          },
          take: 6,
          orderBy: {
            price: 'asc'
          }
        }
      }
    });

    if (!cityData) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Count total items for each category
    const [totalPackages, totalHotels, totalExcursions] = await Promise.all([
      prisma.package.count({
        where: {
          cityId: cityData.id,
          active: true,
          availableFrom: { lte: new Date() },
          availableTo: { gte: new Date() }
        }
      }),
      prisma.hotel.count({
        where: {
          cityId: cityData.id,
          active: true
        }
      }),
      prisma.excursion.count({
        where: {
          cityId: cityData.id,
          active: true
        }
      })
    ]);

    // Convert Decimal to number for JSON serialization
    const formattedData = {
      ...cityData,
      packagePrices: cityData.packages.map(pkg => ({
        ...pkg,
        packagePrices: pkg.packagePrices.map(price => ({
          ...price,
          totalPrice: Number(price.totalPrice)
        }))
      })),
      totalPackages,
      totalHotels,
      totalExcursions
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching destination details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destination details' },
      { status: 500 }
    );
  }
}