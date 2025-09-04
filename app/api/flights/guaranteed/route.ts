import { NextRequest, NextResponse } from 'next/server';
import { FlightService } from '@/lib/services/flightService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const flightId = searchParams.get('id');

    if (flightId) {
      // Get specific guaranteed flight
      const flight = FlightService.getGuaranteedFlightById(flightId);
      
      if (!flight) {
        return NextResponse.json(
          { error: 'Guaranteed flight not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: flight,
      });
    }

    // Get all guaranteed flights
    const flights = FlightService.getGuaranteedFlights();

    return NextResponse.json({
      success: true,
      data: flights,
    });

  } catch (error) {
    console.error('Get guaranteed flights error:', error);
    return NextResponse.json(
      { error: 'Failed to get guaranteed flights' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin/agent role
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.AGENT)) {
      return NextResponse.json(
        { error: 'Admin or agent access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { flightId, passengers } = body;

    if (!flightId || !passengers) {
      return NextResponse.json(
        { error: 'Flight ID and number of passengers are required' },
        { status: 400 }
      );
    }

    // Check availability
    const isAvailable = await FlightService.checkFlightAvailability(flightId, passengers);
    
    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Not enough seats available' },
        { status: 400 }
      );
    }

    const flight = FlightService.getGuaranteedFlightById(flightId);
    
    return NextResponse.json({
      success: true,
      data: {
        flight,
        availableSeats: flight?.availableSeats || 0,
        requestedSeats: passengers,
        canBook: isAvailable,
      },
    });

  } catch (error) {
    console.error('Check guaranteed flight availability error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to check guaranteed flight availability' },
      { status: 500 }
    );
  }
}