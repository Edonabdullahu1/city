import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only fetch flight TEMPLATES (routes), not flight blocks with guaranteed seats
    // Templates have totalSeats = 0 and isBlockSeat = false
    const flights = await prisma.flight.findMany({
      where: {
        totalSeats: 0,
        isBlockSeat: false
      },
      include: {
        airline: true,
        departureAirport: {
          include: {
            city: true
          }
        },
        arrivalAirport: {
          include: {
            city: true
          }
        },
        originCity: true,
        destinationCity: true,
        _count: {
          select: { bookings: true }
        }
      },
      orderBy: {
        flightNumber: 'asc'
      }
    });

    return NextResponse.json({ flights });
  } catch (error) {
    console.error('Flights fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch flights' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      flightNumber,
      airlineId,
      departureAirportId,
      arrivalAirportId
    } = await request.json();

    // Validate required fields for flight route
    if (!flightNumber || !airlineId || !departureAirportId || !arrivalAirportId) {
      return NextResponse.json({ error: 'Flight number, airline, and airports are required' }, { status: 400 });
    }

    // Get airports with their cities
    const departureAirport = await prisma.airport.findUnique({
      where: { id: departureAirportId },
      include: { city: true }
    });

    const arrivalAirport = await prisma.airport.findUnique({
      where: { id: arrivalAirportId },
      include: { city: true }
    });

    if (!departureAirport || !arrivalAirport) {
      return NextResponse.json({ error: 'Invalid airport selection' }, { status: 400 });
    }

    // Check if flight template already exists (templates have totalSeats = 0)
    const existing = await prisma.flight.findFirst({
      where: { 
        flightNumber,
        totalSeats: 0,
        isBlockSeat: false
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Flight route with this number already exists' }, { status: 409 });
    }

    // Create a flight TEMPLATE (route definition) - not a block with guaranteed seats
    const flight = await prisma.flight.create({
      data: {
        flightNumber,
        airlineId,
        originCityId: departureAirport.cityId,
        destinationCityId: arrivalAirport.cityId,
        departureAirportId,
        arrivalAirportId,
        // Templates use placeholder times
        departureTime: new Date('2024-01-01T12:00:00Z'),
        arrivalTime: new Date('2024-01-01T14:00:00Z'),
        // Templates always have 0 seats and isBlockSeat = false
        totalSeats: 0,
        availableSeats: 0,
        pricePerSeat: 0,
        isBlockSeat: false
      },
      include: {
        airline: true,
        departureAirport: {
          include: { city: true }
        },
        arrivalAirport: {
          include: { city: true }
        }
      }
    });

    return NextResponse.json(flight);
  } catch (error) {
    console.error('Flight create error:', error);
    return NextResponse.json({ error: 'Failed to create flight' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      id,
      flightNumber,
      airlineId,
      departureAirportId,
      arrivalAirportId,
      departureTime,
      arrivalTime,
      totalSeats,
      availableSeats,
      pricePerSeat,
      isBlockSeat
    } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Flight ID is required' }, { status: 400 });
    }

    // If airports are being updated, get their cities
    let updateData: any = {};
    
    if (departureAirportId || arrivalAirportId) {
      const departureAirport = departureAirportId ? await prisma.airport.findUnique({
        where: { id: departureAirportId },
        include: { city: true }
      }) : null;

      const arrivalAirport = arrivalAirportId ? await prisma.airport.findUnique({
        where: { id: arrivalAirportId },
        include: { city: true }
      }) : null;

      if (departureAirport) {
        updateData.departureAirportId = departureAirportId;
        updateData.originCityId = departureAirport.cityId;
      }

      if (arrivalAirport) {
        updateData.arrivalAirportId = arrivalAirportId;
        updateData.destinationCityId = arrivalAirport.cityId;
      }
    }

    // Add other update fields
    if (flightNumber) updateData.flightNumber = flightNumber;
    if (airlineId) updateData.airlineId = airlineId;
    if (departureTime) updateData.departureTime = new Date(departureTime);
    if (arrivalTime) updateData.arrivalTime = new Date(arrivalTime);
    if (totalSeats !== undefined) updateData.totalSeats = parseInt(totalSeats);
    if (availableSeats !== undefined) updateData.availableSeats = parseInt(availableSeats);
    if (pricePerSeat !== undefined) updateData.pricePerSeat = Math.round(parseFloat(pricePerSeat) * 100);
    if (isBlockSeat !== undefined) updateData.isBlockSeat = isBlockSeat;

    const flight = await prisma.flight.update({
      where: { id },
      data: updateData,
      include: {
        airline: true,
        departureAirport: {
          include: { city: true }
        },
        arrivalAirport: {
          include: { city: true }
        }
      }
    });

    return NextResponse.json(flight);
  } catch (error) {
    console.error('Flight update error:', error);
    return NextResponse.json({ error: 'Failed to update flight' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Flight ID is required' }, { status: 400 });
    }

    // Check if flight has bookings
    const flight = await prisma.flight.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    });

    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    if (flight._count.bookings > 0) {
      return NextResponse.json({ error: 'Cannot delete flight with existing bookings' }, { status: 400 });
    }

    await prisma.flight.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Flight delete error:', error);
    return NextResponse.json({ error: 'Failed to delete flight' }, { status: 500 });
  }
}