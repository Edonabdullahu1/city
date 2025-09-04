import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET available flight dates for a city
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cityId = searchParams.get('cityId');

    if (!cityId) {
      return NextResponse.json(
        { error: 'City ID is required' },
        { status: 400 }
      );
    }

    // Get active packages for this city
    const packages = await prisma.package.findMany({
      where: {
        cityId,
        active: true,
        availableFrom: {
          lte: new Date()
        },
        availableTo: {
          gte: new Date()
        }
      },
      select: {
        flightBlockIds: true,
        departureFlightId: true,
        departureFlight: {
          select: {
            id: true,
            departureTime: true,
            availableSeats: true,
            blockGroupId: true
          }
        }
      }
    });

    // Get unique flight block IDs
    const flightBlockIds = new Set<string>();
    packages.forEach(pkg => {
      if (pkg.flightBlockIds && Array.isArray(pkg.flightBlockIds)) {
        pkg.flightBlockIds.forEach((id: string) => flightBlockIds.add(id));
      } else if (pkg.departureFlight?.blockGroupId) {
        flightBlockIds.add(pkg.departureFlight.blockGroupId);
      }
    });

    // Get flights for these block groups
    const flights = await prisma.flight.findMany({
      where: {
        blockGroupId: {
          in: Array.from(flightBlockIds)
        },
        isReturn: false, // Only outbound flights
        availableSeats: {
          gt: 0
        },
        departureTime: {
          gte: new Date()
        }
      },
      select: {
        departureTime: true,
        availableSeats: true,
        blockGroupId: true
      },
      orderBy: {
        departureTime: 'asc'
      }
    });

    // Group by date and sum available seats
    const dateMap = new Map<string, number>();
    flights.forEach(flight => {
      const dateStr = flight.departureTime.toISOString().split('T')[0];
      const currentSeats = dateMap.get(dateStr) || 0;
      dateMap.set(dateStr, currentSeats + flight.availableSeats);
    });

    // Convert to array format
    const availableDates = Array.from(dateMap.entries()).map(([date, seats]) => ({
      date,
      availableSeats: seats
    }));

    return NextResponse.json(availableDates);
  } catch (error) {
    console.error('Error fetching available dates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available dates' },
      { status: 500 }
    );
  }
}