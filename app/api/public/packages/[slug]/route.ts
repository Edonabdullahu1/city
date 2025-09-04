import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET package details by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const packageData = await prisma.package.findUnique({
      where: {
        slug: slug,
        active: true
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            rating: true,
            address: true,
            amenities: true,
            description: true,
            primaryImage: true,
            hotelPrices: {
              select: {
                single: true,
                double: true,
                extraBed: true,
                payingKidsAge: true,
                paymentKids: true,
                fromDate: true,
                tillDate: true,
                board: true
              }
            }
          }
        },
        city: {
          include: {
            country: true
          }
        },
        departureFlight: {
          select: {
            flightNumber: true,
            departureTime: true,
            arrivalTime: true,
            departureAirport: {
              select: {
                code: true,
                name: true
              }
            },
            arrivalAirport: {
              select: {
                code: true,
                name: true
              }
            }
          }
        },
        returnFlight: {
          select: {
            flightNumber: true,
            departureTime: true,
            arrivalTime: true,
            departureAirport: {
              select: {
                code: true,
                name: true
              }
            },
            arrivalAirport: {
              select: {
                code: true,
                name: true
              }
            }
          }
        },
        packagePrices: {
          select: {
            adults: true,
            children: true,
            flightPrice: true,
            hotelPrice: true,
            transferPrice: true,
            totalPrice: true,
            hotelName: true,
            hotelBoard: true,
            roomType: true,
            flightBlockId: true,
            nights: true
          },
          orderBy: [
            { adults: 'asc' },
            { children: 'asc' }
          ]
        }
      }
    });

    if (!packageData) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      );
    }

    // Fetch all hotels if hotelIds is populated
    let availableHotels = [];
    if (packageData.hotel) {
      availableHotels.push(packageData.hotel);
    }
    
    // Fetch flight blocks if available
    let flightBlocksData = [];
    if (packageData.flightBlockIds && Array.isArray(packageData.flightBlockIds)) {
      const blockGroupIds = packageData.flightBlockIds as string[];
      for (const blockGroupId of blockGroupIds) {
        const flights = await prisma.flight.findMany({
          where: { blockGroupId },
          include: {
            departureAirport: true,
            arrivalAirport: true
          },
          orderBy: { departureTime: 'asc' }
        });
        
        if (flights.length >= 2) {
          flightBlocksData.push({
            blockGroupId,
            outbound: flights[0],
            return: flights[1],
            pricePerPerson: (flights[0].pricePerSeat + flights[1].pricePerSeat) / 100
          });
        }
      }
    }
    
    if (packageData.hotelIds && Array.isArray(packageData.hotelIds)) {
      const additionalHotels = await prisma.hotel.findMany({
        where: {
          id: {
            in: packageData.hotelIds as string[]
          },
          active: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          rating: true,
          address: true,
          amenities: true,
          description: true,
          primaryImage: true,
          hotelPrices: {
            select: {
              single: true,
              double: true,
              extraBed: true,
              payingKidsAge: true,
              paymentKids: true,
              fromDate: true,
              tillDate: true,
              board: true
            }
          }
        }
      });
      
      // Add additional hotels that aren't already in the list
      additionalHotels.forEach(hotel => {
        if (!availableHotels.find(h => h.id === hotel.id)) {
          availableHotels.push(hotel);
        }
      });
    }

    // Return package data with all available hotels and flight blocks
    return NextResponse.json({
      ...packageData,
      availableHotels,
      flightBlocks: flightBlocksData
    });
  } catch (error) {
    console.error('Error fetching package details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch package details' },
      { status: 500 }
    );
  }
}