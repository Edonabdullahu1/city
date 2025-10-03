import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET flight blocks by blockGroupIds
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const blockIds = searchParams.get('blockIds');
    
    if (!blockIds) {
      return NextResponse.json({ error: 'blockIds parameter required' }, { status: 400 });
    }
    
    const blockIdArray = blockIds.split(',');
    
    // Fetch flights for the specified block group IDs
    const flights = await prisma.flight.findMany({
      where: {
        blockGroupId: {
          in: blockIdArray
        },
        isBlockSeat: true
      },
      include: {
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
      },
      orderBy: [
        { blockGroupId: 'asc' },
        { isReturn: 'asc' },
        { departureTime: 'asc' }
      ]
    });
    
    // Group flights by blockGroupId
    const flightBlocks: Record<string, any> = {};
    
    flights.forEach(flight => {
      const blockId = flight.blockGroupId!;
      
      if (!flightBlocks[blockId]) {
        flightBlocks[blockId] = {
          blockGroupId: blockId,
          outbound: null,
          return: null
        };
      }
      
      if (flight.isReturn) {
        flightBlocks[blockId].return = {
          flightNumber: flight.flightNumber,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          departureAirport: flight.departureAirport,
          arrivalAirport: flight.arrivalAirport,
          pricePerSeat: flight.pricePerSeat,
          totalSeats: flight.totalSeats,
          availableSeats: flight.availableSeats
        };
      } else {
        flightBlocks[blockId].outbound = {
          flightNumber: flight.flightNumber,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          departureAirport: flight.departureAirport,
          arrivalAirport: flight.arrivalAirport,
          pricePerSeat: flight.pricePerSeat,
          totalSeats: flight.totalSeats,
          availableSeats: flight.availableSeats
        };
      }
    });
    
    return NextResponse.json(Object.values(flightBlocks));
  } catch (error) {
    console.error('Error fetching flight blocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flight blocks' },
      { status: 500 }
    );
  }
}