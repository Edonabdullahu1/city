import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Calculate and store all price variations for a package
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get package details with flights and hotels
    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        departureFlight: true,
        returnFlight: true,
        hotel: {
          include: {
            hotelPrices: true
          }
        },
        transfer: true,
        city: true
      }
    });

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Delete existing pre-calculated prices
    await prisma.packagePrice.deleteMany({
      where: { packageId: id }
    });

    const calculatedPrices = [];
    
    // Get flight blocks if available
    let flightBlocks = [];
    if (pkg.flightBlockIds && Array.isArray(pkg.flightBlockIds)) {
      // Fetch all flight blocks for this package
      const blockGroupIds = pkg.flightBlockIds as string[];
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
          // Find outbound and return flights based on airport codes
          const outbound = flights.find(f => 
            f.departureAirport.code !== pkg.city.airportCode
          ) || flights[0];
          const returnFlight = flights.find(f => 
            f.arrivalAirport.code !== pkg.city.airportCode
          ) || flights[1];
          
          flightBlocks.push({
            blockGroupId,
            outbound,
            return: returnFlight
          });
        }
      }
    }
    
    // If no flight blocks, use the default flights
    if (flightBlocks.length === 0 && pkg.departureFlight && pkg.returnFlight) {
      flightBlocks.push({
        blockGroupId: 'default',
        outbound: pkg.departureFlight,
        return: pkg.returnFlight
      });
    }

    // Define occupancy variations
    const occupancies = [
      { adults: 1, children: 0, childAges: '' },
      { adults: 1, children: 1, childAges: '5' },
      { adults: 2, children: 0, childAges: '' },
      { adults: 2, children: 1, childAges: '5' },
      { adults: 2, children: 2, childAges: '5,10' },
      { adults: 3, children: 0, childAges: '' },
    ];

    // Process each flight block
    for (const flightBlock of flightBlocks) {
      // Calculate nights for this specific flight block
      const checkIn = new Date(flightBlock.outbound.arrivalTime);
      const checkOut = new Date(flightBlock.return.departureTime);
      const nights = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      
      // Get actual flight prices from the flight block
      const outboundPrice = flightBlock.outbound.pricePerSeat / 100; // Convert from cents to euros
      const returnPrice = flightBlock.return.pricePerSeat / 100;
      const flightPricePerPerson = outboundPrice + returnPrice;
      
      console.log(`Flight Block ${flightBlock.blockGroupId}: €${flightPricePerPerson} per person (${nights} nights)`);
    
      // Get all hotel IDs from the package (stored in JSON field)
      const hotelIds = pkg.hotelIds as string[] || [pkg.hotelId];
      
      // Fetch all hotels
      const hotels = await prisma.hotel.findMany({
        where: {
          id: { in: hotelIds }
        },
        include: {
          hotelPrices: {
            where: {
              fromDate: { lte: checkIn },
              tillDate: { gte: checkOut }
            }
          }
        }
      });

      // For each hotel
      for (const hotel of hotels) {
        if (hotel.hotelPrices.length === 0) {
          continue; // Skip if no prices available for these dates
        }

        // For each occupancy variation
        for (const occupancy of occupancies) {
          // Use actual flight prices from the flight block
          const totalFlightPrice = flightPricePerPerson * (occupancy.adults + occupancy.children);

          // Get hotel price for the date range
          const hotelPrice = hotel.hotelPrices[0]; // Use first available price
          
          // Calculate hotel cost based on occupancy
          let hotelCost = 0;
          let roomType = 'Standard';
          
          if (occupancy.adults === 1) {
            hotelCost = Number(hotelPrice.single) * nights;
            roomType = 'Single';
          } else if (occupancy.adults === 2) {
            hotelCost = Number(hotelPrice.double) * nights;
            roomType = 'Double';
          } else if (occupancy.adults === 3) {
            hotelCost = (Number(hotelPrice.double) + Number(hotelPrice.extraBed)) * nights;
            roomType = 'Triple';
          }

          // Calculate children costs using actual hotel pricing
          if (occupancy.children > 0 && occupancy.childAges) {
            const ages = occupancy.childAges.split(',').map(a => parseInt(a));
            
            ages.forEach(age => {
              // Parse the paying kids age range (e.g., "7-11")
              const ageRange = hotelPrice.payingKidsAge || '';
              const [minAge, maxAge] = ageRange.split('-').map(a => parseInt(a) || 0);
              
              if (age >= minAge && age <= maxAge && minAge > 0) {
                // Child is in paying age range - use paymentKids price
                const childPricePerNight = Number(hotelPrice.paymentKids);
                hotelCost += childPricePerNight * nights;
              } else if (age < minAge) {
                // Child is free (under minimum paying age)
                // No cost added
              } else if (age > maxAge) {
                // Older children might need extra bed
                const extraBedPrice = Number(hotelPrice.extraBed);
                hotelCost += extraBedPrice * nights;
              }
            });
          }

          // Transfer cost (only if included in package)
          let transferCost = 0;
          if (pkg.includesTransfer && pkg.transfer) {
            // Use actual transfer price from database
            transferCost = (pkg.transfer.price / 100) * (occupancy.adults + occupancy.children);
          }

          // Get service charge and profit margin from package
          const serviceCharge = Number(pkg.serviceCharge) || 0;
          // Use 0 if explicitly set to 0, only default to 20 if null/undefined
          const profitMargin = pkg.profitMargin !== null && pkg.profitMargin !== undefined ? Number(pkg.profitMargin) : 20;

          // Calculate total with service charge and profit margin
          const subtotal = totalFlightPrice + hotelCost + transferCost + serviceCharge;
          const profitAmount = subtotal * (profitMargin / 100);
          const totalPrice = subtotal + profitAmount;

          calculatedPrices.push({
            packageId: id,
            adults: occupancy.adults,
            children: occupancy.children,
            childAges: occupancy.childAges,
            flightPrice: totalFlightPrice,
            hotelPrice: hotelCost,
            transferPrice: transferCost,
            totalPrice,
            hotelBoard: hotelPrice.board,
            roomType: `${roomType} (${hotelPrice.board})`,
            hotelName: hotel.name,
            flightBlockId: flightBlock.blockGroupId,
            nights: nights
          });
        }
      }
    } // End of flight block loop

    // Bulk create all price variations
    if (calculatedPrices.length > 0) {
      await prisma.packagePrice.createMany({
        data: calculatedPrices.map(price => ({
          packageId: price.packageId,
          adults: price.adults,
          children: price.children,
          childAges: price.childAges,
          flightPrice: price.flightPrice,
          hotelPrice: price.hotelPrice,
          transferPrice: price.transferPrice,
          totalPrice: price.totalPrice,
          hotelBoard: price.hotelBoard,
          roomType: price.roomType,
          hotelName: price.hotelName
        }))
      });
    }

    return NextResponse.json({
      message: `Calculated ${calculatedPrices.length} price variations`,
      count: calculatedPrices.length,
      calculations: calculatedPrices,
      flightBlocks: flightBlocks.map(fb => ({
        blockGroupId: fb.blockGroupId,
        nights: Math.floor((new Date(fb.return.departureTime).getTime() - new Date(fb.outbound.arrivalTime).getTime()) / (1000 * 60 * 60 * 24)),
        flightPrice: (fb.outbound.pricePerSeat + fb.return.pricePerSeat) / 100
      }))
    });

  } catch (error) {
    console.error('Error calculating package prices:', error);
    return NextResponse.json(
      { error: 'Failed to calculate package prices' },
      { status: 500 }
    );
  }
}

// GET - Fetch pre-calculated prices for display
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get package with hotels
    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        hotel: true
      }
    });

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Get all hotel IDs
    const hotelIds = pkg.hotelIds as string[] || [pkg.hotelId];
    
    // Fetch all hotels
    const hotels = await prisma.hotel.findMany({
      where: {
        id: { in: hotelIds }
      }
    });

    // Fetch pre-calculated prices
    const prices = await prisma.packagePrice.findMany({
      where: { packageId: id },
      orderBy: [
        { hotelName: 'asc' },
        { adults: 'asc' },
        { children: 'asc' }
      ]
    });

    return NextResponse.json(prices);
  } catch (error) {
    console.error('Error fetching package prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch package prices' },
      { status: 500 }
    );
  }
}