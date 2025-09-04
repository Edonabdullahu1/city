import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET flight blocks grouped by blockGroupId
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const destinationCityId = searchParams.get('destinationCityId');
    const blockGroupId = searchParams.get('blockGroupId');

    // Build where clause
    const whereClause: any = {
      isBlockSeat: true,
      blockGroupId: { not: null }
    };

    // If filtering by specific blockGroupId
    if (blockGroupId) {
      whereClause.blockGroupId = blockGroupId;
    }
    // If filtering by destination city for a package TO that city:
    // - Outbound flights should go FROM origin TO the destination city
    // - Return flights should go FROM the destination city back TO origin
    // Since we're looking for packages TO a destination, we need:
    // - Flights where destination matches AND it's not a return flight (going TO city)
    // - Flights where origin matches AND it IS a return flight (coming back FROM city)
    else if (destinationCityId) {
      whereClause.OR = [
        { destinationCityId: destinationCityId, isReturn: false }, // Outbound TO destination
        { originCityId: destinationCityId, isReturn: true }  // Return FROM destination
      ];
    }

    // Fetch all block seat flights
    const flights = await prisma.flight.findMany({
      where: whereClause,
      include: {
        airline: true,
        originCity: true,
        destinationCity: true,
        departureAirport: true,
        arrivalAirport: true
      },
      orderBy: {
        departureTime: 'asc'
      }
    });

    // Group flights by blockGroupId
    const flightBlocks: any = {};
    
    flights.forEach(flight => {
      if (!flight.blockGroupId) return;
      
      if (!flightBlocks[flight.blockGroupId]) {
        flightBlocks[flight.blockGroupId] = {
          blockGroupId: flight.blockGroupId,
          outboundFlight: null,
          returnFlight: null
        };
      }

      const flightData = {
        id: flight.id,
        flightNumber: flight.flightNumber,
        airline: flight.airline.name,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        totalSeats: flight.totalSeats,
        availableSeats: flight.availableSeats,
        pricePerSeat: flight.pricePerSeat,
        originCity: flight.originCity.name,
        destinationCity: flight.destinationCity.name,
        departureAirport: `${flight.departureAirport.code} - ${flight.departureAirport.name}`,
        arrivalAirport: `${flight.arrivalAirport.code} - ${flight.arrivalAirport.name}`
      };

      if (flight.isReturn) {
        flightBlocks[flight.blockGroupId].returnFlight = flightData;
      } else {
        flightBlocks[flight.blockGroupId].outboundFlight = flightData;
      }
    });

    // Convert to array and filter out incomplete blocks
    const completeBlocks = Object.values(flightBlocks).filter(
      (block: any) => block.outboundFlight && block.returnFlight
    );

    return NextResponse.json({ flightBlocks: completeBlocks });
  } catch (error) {
    console.error('Error fetching flight blocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flight blocks' },
      { status: 500 }
    );
  }
}

// POST create new flight block (outbound and return pair)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { outboundFlight, returnFlight } = body;

    // Validate required fields
    if (!outboundFlight || !returnFlight) {
      return NextResponse.json(
        { error: 'Both outbound and return flights are required' },
        { status: 400 }
      );
    }

    // Generate a unique blockGroupId
    const blockGroupId = `BLOCK-${Date.now()}`;

    // Fetch flight templates to get complete flight details
    const outboundTemplate = await prisma.flight.findUnique({
      where: { id: outboundFlight.flightId }
    });

    const returnTemplate = await prisma.flight.findUnique({
      where: { id: returnFlight.flightId }
    });

    if (!outboundTemplate || !returnTemplate) {
      return NextResponse.json(
        { error: 'Invalid flight templates specified' },
        { status: 400 }
      );
    }

    // Create both flights in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create outbound flight block
      const outbound = await prisma.flight.create({
        data: {
          flightNumber: `${outboundTemplate.flightNumber}-${blockGroupId.slice(-6)}`,
          airlineId: outboundTemplate.airlineId,
          originCityId: outboundTemplate.originCityId,
          destinationCityId: outboundTemplate.destinationCityId,
          departureAirportId: outboundTemplate.departureAirportId,
          arrivalAirportId: outboundTemplate.arrivalAirportId,
          departureTime: new Date(outboundFlight.departureTime),
          arrivalTime: new Date(outboundFlight.arrivalTime),
          totalSeats: outboundFlight.totalSeats,
          availableSeats: outboundFlight.availableSeats,
          pricePerSeat: outboundFlight.pricePerSeat,
          blockGroupId,
          isReturn: false,
          isBlockSeat: true
        },
        include: {
          airline: true,
          originCity: true,
          destinationCity: true,
          departureAirport: true,
          arrivalAirport: true
        }
      });

      // Create return flight block
      const returnFlt = await prisma.flight.create({
        data: {
          flightNumber: `${returnTemplate.flightNumber}-${blockGroupId.slice(-6)}`,
          airlineId: returnTemplate.airlineId,
          originCityId: returnTemplate.originCityId,
          destinationCityId: returnTemplate.destinationCityId,
          departureAirportId: returnTemplate.departureAirportId,
          arrivalAirportId: returnTemplate.arrivalAirportId,
          departureTime: new Date(returnFlight.departureTime),
          arrivalTime: new Date(returnFlight.arrivalTime),
          totalSeats: returnFlight.totalSeats,
          availableSeats: returnFlight.availableSeats,
          pricePerSeat: returnFlight.pricePerSeat,
          blockGroupId,
          isReturn: true,
          isBlockSeat: true
        },
        include: {
          airline: true,
          originCity: true,
          destinationCity: true,
          departureAirport: true,
          arrivalAirport: true
        }
      });

      return { outbound, returnFlt };
    });

    return NextResponse.json({
      blockGroupId,
      outboundFlight: result.outbound,
      returnFlight: result.returnFlt
    });
  } catch (error) {
    console.error('Error creating flight block:', error);
    return NextResponse.json(
      { error: 'Failed to create flight block' },
      { status: 500 }
    );
  }
}