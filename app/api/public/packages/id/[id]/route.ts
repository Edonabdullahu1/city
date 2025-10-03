import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET package details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log(`[DEBUG] Fetching package with ID: ${id}`);
    
    const packageData = await prisma.package.findUnique({
      where: {
        id: id,
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
            id: true,
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
            id: true,
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
      console.log(`[DEBUG] Package with ID ${id} not found`);
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      );
    }

    console.log(`[DEBUG] Package found: ${packageData.name}`);
    console.log(`[DEBUG] Package departure flight ID: ${packageData.departureFlightId}`);
    console.log(`[DEBUG] Package return flight ID: ${packageData.returnFlightId}`);
    console.log(`[DEBUG] Departure flight object:`, packageData.departureFlight ? 'EXISTS' : 'NULL');
    console.log(`[DEBUG] Return flight object:`, packageData.returnFlight ? 'EXISTS' : 'NULL');

    // Combine departure and return flights into a flights array
    const flights = [];
    if (packageData.departureFlight) {
      flights.push(packageData.departureFlight);
    }
    if (packageData.returnFlight) {
      flights.push(packageData.returnFlight);
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
        const blockFlights = await prisma.flight.findMany({
          where: { blockGroupId },
          include: {
            departureAirport: true,
            arrivalAirport: true
          },
          orderBy: { departureTime: 'asc' }
        });
        
        if (blockFlights.length >= 2) {
          flightBlocksData.push({
            blockGroupId,
            outbound: blockFlights[0],
            return: blockFlights[1],
            pricePerPerson: (blockFlights[0].pricePerSeat + blockFlights[1].pricePerSeat) / 100
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

    // Return package data with flights array and all available hotels and flight blocks
    return NextResponse.json({
      ...packageData,
      flights,
      availableHotels,
      flightBlocks: flightBlocksData
    });
  } catch (error) {
    console.error('Error fetching package details by ID:', error);
    return NextResponse.json(
      { error: 'Failed to fetch package details' },
      { status: 500 }
    );
  }
}