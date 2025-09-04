import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const flight = await prisma.flight.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          select: {
            id: true,
            passengers: true,
            class: true,
            price: true,
            booking: {
              select: {
                id: true,
                reservationCode: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    return NextResponse.json(flight);

  } catch (error) {
    console.error('Flight fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flight' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      flightNumber,
      airline,
      origin,
      destination,
      departureTime,
      arrivalTime,
      totalSeats,
      availableSeats,
      pricePerSeat,
      isBlockSeat
    } = body;

    // Check if changing flight number/time conflicts with existing flight
    if (flightNumber && departureTime) {
      const existingFlight = await prisma.flight.findFirst({
        where: {
          AND: [
            { flightNumber },
            { departureTime: new Date(departureTime) },
            { NOT: { id: params.id } }
          ]
        }
      });

      if (existingFlight) {
        return NextResponse.json(
          { error: 'Another flight with this number and departure time already exists' },
          { status: 400 }
        );
      }
    }

    // Update the flight
    const updatedFlight = await prisma.flight.update({
      where: { id: params.id },
      data: {
        flightNumber,
        airline,
        origin: origin?.toUpperCase(),
        destination: destination?.toUpperCase(),
        departureTime: departureTime ? new Date(departureTime) : undefined,
        arrivalTime: arrivalTime ? new Date(arrivalTime) : undefined,
        totalSeats: totalSeats ? parseInt(totalSeats) : undefined,
        availableSeats: availableSeats ? parseInt(availableSeats) : undefined,
        pricePerSeat: pricePerSeat ? parseInt(pricePerSeat) : undefined,
        isBlockSeat: isBlockSeat !== undefined ? Boolean(isBlockSeat) : undefined
      }
    });

    return NextResponse.json(updatedFlight);

  } catch (error) {
    console.error('Flight update error:', error);
    return NextResponse.json(
      { error: 'Failed to update flight' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if flight has bookings
    const bookingCount = await prisma.flightBooking.count({
      where: {
        flightId: params.id,
        booking: {
          status: {
            in: ['SOFT', 'CONFIRMED', 'PAID']
          }
        }
      }
    });

    if (bookingCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete flight with ${bookingCount} active bookings` },
        { status: 400 }
      );
    }

    // Delete the flight
    await prisma.flight.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Flight deleted successfully'
    });

  } catch (error) {
    console.error('Flight delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete flight' },
      { status: 500 }
    );
  }
}