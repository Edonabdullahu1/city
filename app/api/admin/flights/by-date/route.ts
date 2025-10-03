import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all flight blocks for the selected date
    const flights = await prisma.flight.findMany({
      where: {
        isBlockSeat: true,
        departureTime: {
          gte: selectedDate,
          lte: endOfDay
        }
      },
      include: {
        departureAirport: {
          include: {
            city: true
          }
        },
        arrivalAirport: {
          include: {
            city: true
          }
        }
      },
      orderBy: {
        departureTime: 'asc'
      }
    });

    const formattedFlights = flights.map(flight => ({
      id: flight.id,
      flightNumber: flight.flightNumber,
      route: `${flight.departureAirport.city.name}-${flight.arrivalAirport.city.name}`,
      departureTime: flight.departureTime,
      totalSeats: flight.totalSeats,
      availableSeats: flight.availableSeats
    }));

    return NextResponse.json({
      success: true,
      flights: formattedFlights
    });

  } catch (error) {
    console.error('Error fetching flights by date:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flights' },
      { status: 500 }
    );
  }
}
