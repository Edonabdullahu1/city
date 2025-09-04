import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/admin/airports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const cityId = searchParams.get('cityId');

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (cityId) {
      where.cityId = cityId;
    }

    const airports = await prisma.airport.findMany({
      where,
      include: {
        city: {
          include: {
            country: true
          }
        },
        _count: {
          select: {
            flightDepartures: true,
            flightArrivals: true
          }
        }
      },
      orderBy: { code: 'asc' }
    });

    return NextResponse.json({
      airports: airports.map(airport => ({
        id: airport.id,
        code: airport.code,
        name: airport.name,
        cityId: airport.cityId,
        cityName: airport.city.name,
        countryName: airport.city.country.name,
        active: airport.active,
        departureCount: airport._count.flightDepartures,
        arrivalCount: airport._count.flightArrivals,
        createdAt: airport.createdAt,
        updatedAt: airport.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching airports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch airports' },
      { status: 500 }
    );
  }
}

// POST /api/admin/airports
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code, name, cityId } = body;

    if (!code || !name || !cityId) {
      return NextResponse.json(
        { error: 'Airport code, name, and city are required' },
        { status: 400 }
      );
    }

    // Check if city exists
    const city = await prisma.city.findUnique({
      where: { id: cityId }
    });

    if (!city) {
      return NextResponse.json(
        { error: 'City not found' },
        { status: 404 }
      );
    }

    // Check if airport code already exists
    const existingAirport = await prisma.airport.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existingAirport) {
      return NextResponse.json(
        { error: 'Airport with this code already exists' },
        { status: 409 }
      );
    }

    const airport = await prisma.airport.create({
      data: {
        code: code.toUpperCase(),
        name,
        cityId,
        active: true
      },
      include: {
        city: {
          include: {
            country: true
          }
        }
      }
    });

    return NextResponse.json({ airport }, { status: 201 });
  } catch (error) {
    console.error('Error creating airport:', error);
    return NextResponse.json(
      { error: 'Failed to create airport' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/airports
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, code, name, cityId, active } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Airport ID is required' },
        { status: 400 }
      );
    }

    // If changing city, verify it exists
    if (cityId) {
      const city = await prisma.city.findUnique({
        where: { id: cityId }
      });

      if (!city) {
        return NextResponse.json(
          { error: 'City not found' },
          { status: 404 }
        );
      }
    }

    // Check for duplicate code if changing
    if (code) {
      const existingAirport = await prisma.airport.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { code: code.toUpperCase() }
          ]
        }
      });

      if (existingAirport) {
        return NextResponse.json(
          { error: 'Another airport with this code already exists' },
          { status: 409 }
        );
      }
    }

    const airport = await prisma.airport.update({
      where: { id },
      data: {
        ...(code && { code: code.toUpperCase() }),
        ...(name && { name }),
        ...(cityId && { cityId }),
        ...(active !== undefined && { active })
      },
      include: {
        city: {
          include: {
            country: true
          }
        }
      }
    });

    return NextResponse.json({ airport });
  } catch (error) {
    console.error('Error updating airport:', error);
    return NextResponse.json(
      { error: 'Failed to update airport' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/airports
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Airport ID is required' },
        { status: 400 }
      );
    }

    // Check if airport has flights
    const [departureCount, arrivalCount] = await Promise.all([
      prisma.flight.count({ where: { departureAirportId: id } }),
      prisma.flight.count({ where: { arrivalAirportId: id } })
    ]);

    const totalFlights = departureCount + arrivalCount;

    if (totalFlights > 0) {
      return NextResponse.json(
        { error: `Cannot delete airport with ${totalFlights} flights. Please delete or reassign flights first.` },
        { status: 400 }
      );
    }

    await prisma.airport.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting airport:', error);
    return NextResponse.json(
      { error: 'Failed to delete airport' },
      { status: 500 }
    );
  }
}