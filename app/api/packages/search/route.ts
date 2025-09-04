import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cityId = searchParams.get('cityId');
    const date = searchParams.get('date');
    const adults = parseInt(searchParams.get('adults') || '1');
    const children = parseInt(searchParams.get('children') || '0');
    const childAgesParam = searchParams.get('childAges') || '';
    const childAges = childAgesParam ? childAgesParam.split(',').map(a => parseInt(a)) : [];

    if (!cityId || !date) {
      return NextResponse.json(
        { error: 'City and date are required' },
        { status: 400 }
      );
    }

    const searchDate = new Date(date);
    
    // Find packages for the city
    const packages = await prisma.package.findMany({
      where: {
        cityId,
        active: true,
        availableFrom: { lte: searchDate },
        availableTo: { gte: searchDate }
      },
      include: {
        city: true,
        departureFlight: {
          include: {
            originCity: true,
            destinationCity: true
          }
        },
        returnFlight: {
          include: {
            originCity: true,
            destinationCity: true
          }
        },
        hotel: {
          include: {
            hotelPrices: true
          }
        }
      }
    });

    // Process each package to find available flight blocks and calculate prices
    const results = await Promise.all(packages.map(async (pkg) => {
      // Get all flight block IDs stored in the package
      const flightBlockIds = pkg.flightBlockIds as string[] || [];
      const hotelIds = pkg.hotelIds as string[] || [];
      
      // Find available flight blocks near the search date
      const availableFlightBlocks = await findAvailableFlightBlocks(flightBlockIds, searchDate);
      
      if (availableFlightBlocks.length === 0) {
        return null; // No available flights for this date
      }

      // Use the first available flight block
      const flightBlock = availableFlightBlocks[0];
      
      // Calculate nights from flight dates
      const nights = Math.ceil(
        (flightBlock.returnFlight.departureTime.getTime() - flightBlock.outboundFlight.departureTime.getTime()) / 
        (1000 * 60 * 60 * 24)
      );

      // Calculate hotel prices for all hotels in the package
      const hotelPrices = await calculateHotelPrices(
        hotelIds.length > 0 ? hotelIds : [pkg.hotelId],
        flightBlock.outboundFlight.departureTime,
        flightBlock.returnFlight.departureTime,
        adults,
        childAges
      );

      if (hotelPrices.length === 0) {
        return null; // No available hotels for these dates
      }

      // Calculate flight price
      const flightPricePerPerson = ((flightBlock.outboundFlight.pricePerSeat + flightBlock.returnFlight.pricePerSeat) / 100);
      const totalFlightPrice = flightPricePerPerson * (adults + children);

      // Get service charge and profit margin
      const serviceCharge = Number(pkg.serviceCharge) || 0;
      const profitMargin = Number(pkg.profitMargin) || 20;

      // Calculate total price for cheapest hotel option
      const cheapestHotel = hotelPrices.reduce((min, hotel) => 
        hotel.price < min.price ? hotel : min
      );
      
      const subtotal = totalFlightPrice + cheapestHotel.price + serviceCharge;
      const profitAmount = subtotal * (profitMargin / 100);
      const totalPriceFrom = subtotal + profitAmount;

      return {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        nights,
        featured: pkg.featured,
        highlights: pkg.highlights,
        
        // Flight details
        flightDetails: {
          outbound: {
            flightNumber: flightBlock.outboundFlight.flightNumber,
            departure: flightBlock.outboundFlight.originCity.name,
            arrival: flightBlock.outboundFlight.destinationCity.name,
            departureTime: flightBlock.outboundFlight.departureTime.toISOString(),
            arrivalTime: flightBlock.outboundFlight.arrivalTime.toISOString()
          },
          return: {
            flightNumber: flightBlock.returnFlight.flightNumber,
            departure: flightBlock.returnFlight.originCity.name,
            arrival: flightBlock.returnFlight.destinationCity.name,
            departureTime: flightBlock.returnFlight.departureTime.toISOString(),
            arrivalTime: flightBlock.returnFlight.arrivalTime.toISOString()
          }
        },
        
        // Hotel options with calculated prices
        hotels: hotelPrices,
        
        // Pricing
        flightPrice: flightPricePerPerson,
        hotelPriceFrom: cheapestHotel.price,
        totalPriceFrom,
        serviceCharge,
        
        // Availability
        availableSeats: Math.min(
          flightBlock.outboundFlight.availableSeats,
          flightBlock.returnFlight.availableSeats
        )
      };
    }));

    // Filter out null results and sort by price
    const validResults = results
      .filter(r => r !== null)
      .sort((a, b) => a!.totalPriceFrom - b!.totalPriceFrom);

    return NextResponse.json({
      packages: validResults,
      totalFound: validResults.length
    });
  } catch (error) {
    console.error('Error searching packages:', error);
    return NextResponse.json(
      { error: 'Failed to search packages' },
      { status: 500 }
    );
  }
}

async function findAvailableFlightBlocks(blockGroupIds: string[], searchDate: Date) {
  if (blockGroupIds.length === 0) return [];
  
  // Find flights within +/- 3 days of search date
  const dateRange = 3;
  const startDate = new Date(searchDate);
  startDate.setDate(startDate.getDate() - dateRange);
  const endDate = new Date(searchDate);
  endDate.setDate(endDate.getDate() + dateRange);

  const flights = await prisma.flight.findMany({
    where: {
      blockGroupId: { in: blockGroupIds },
      departureTime: {
        gte: startDate,
        lte: endDate
      },
      availableSeats: { gt: 0 }
    },
    include: {
      originCity: true,
      destinationCity: true
    },
    orderBy: {
      departureTime: 'asc'
    }
  });

  // Group flights by blockGroupId
  const blockGroups: Record<string, any[]> = {};
  flights.forEach(flight => {
    if (!flight.blockGroupId) return;
    if (!blockGroups[flight.blockGroupId]) {
      blockGroups[flight.blockGroupId] = [];
    }
    blockGroups[flight.blockGroupId].push(flight);
  });

  // Find complete blocks (with both outbound and return)
  const availableBlocks = [];
  for (const blockGroupId in blockGroups) {
    const blockFlights = blockGroups[blockGroupId];
    const outboundFlight = blockFlights.find(f => !f.isReturn);
    const returnFlight = blockFlights.find(f => f.isReturn);
    
    if (outboundFlight && returnFlight) {
      availableBlocks.push({
        blockGroupId,
        outboundFlight,
        returnFlight
      });
    }
  }

  return availableBlocks;
}

async function calculateHotelPrices(
  hotelIds: string[],
  checkIn: Date,
  checkOut: Date,
  adults: number,
  childAges: number[]
) {
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  
  const hotels = await prisma.hotel.findMany({
    where: {
      id: { in: hotelIds },
      active: true
    },
    include: {
      hotelPrices: {
        where: {
          fromDate: { lte: checkIn },
          tillDate: { gte: checkOut }
        },
        orderBy: {
          double: 'asc'
        }
      }
    }
  });

  const hotelOptions = [];
  
  for (const hotel of hotels) {
    if (hotel.hotelPrices.length === 0) continue;
    
    // Use the first (cheapest) available price
    const price = hotel.hotelPrices[0];
    
    // Calculate adult pricing based on occupancy
    let pricePerNight = 0;
    
    if (adults === 1) {
      pricePerNight = Number(price.single);
    } else if (adults === 2) {
      pricePerNight = Number(price.double);
    } else if (adults === 3) {
      pricePerNight = Number(price.double) + Number(price.extraBed);
    }
    
    // Calculate children pricing
    let childrenPricePerNight = 0;
    
    childAges.forEach(age => {
      const ageRange = price.payingKidsAge || '';
      const [minAge, maxAge] = ageRange.split('-').map(a => parseInt(a) || 0);
      
      if (age >= minAge && age <= maxAge && minAge > 0) {
        childrenPricePerNight += Number(price.paymentKids);
      } else if (age >= maxAge) {
        childrenPricePerNight += Number(price.extraBed);
      }
    });
    
    const totalPrice = (pricePerNight + childrenPricePerNight) * nights;
    
    hotelOptions.push({
      id: hotel.id,
      name: hotel.name,
      rating: hotel.rating,
      board: price.board,
      roomType: price.roomType,
      price: totalPrice
    });
  }
  
  return hotelOptions;
}