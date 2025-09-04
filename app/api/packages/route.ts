import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cityId = searchParams.get('cityId');
    const featured = searchParams.get('featured');
    const active = searchParams.get('active');
    const availableFrom = searchParams.get('availableFrom');
    const availableTo = searchParams.get('availableTo');
    
    const where: any = {};
    
    if (cityId) where.cityId = cityId;
    if (featured === 'true') where.featured = true;
    if (active === 'true') where.active = true;
    
    if (availableFrom || availableTo) {
      where.AND = [];
      if (availableFrom) {
        where.AND.push({ availableTo: { gte: new Date(availableFrom) } });
      }
      if (availableTo) {
        where.AND.push({ availableFrom: { lte: new Date(availableTo) } });
      }
    }

    const packages = await prisma.package.findMany({
      where,
      orderBy: {
        featured: 'desc',
        name: 'asc'
      },
      include: {
        city: {
          include: {
            country: true
          }
        },
        hotel: {
          select: {
            id: true,
            name: true,
            rating: true,
            category: true
          }
        },
        room: {
          select: {
            id: true,
            type: true,
            capacity: true
          }
        },
        departureFlight: {
          include: {
            departureAirport: true,
            arrivalAirport: true
          }
        },
        returnFlight: {
          include: {
            departureAirport: true,
            arrivalAirport: true
          }
        },
        transfer: true,
        excursions: {
          include: {
            excursion: true
          }
        }
      }
    });

    return NextResponse.json(packages);
  } catch (error) {
    console.error('Get packages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'AGENT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      cityId,
      departureFlightId,
      returnFlightId,
      hotelId,
      roomId,
      nights,
      basePrice,
      maxOccupancy,
      availableFrom,
      availableTo,
      includesTransfer,
      transferId,
      images,
      highlights,
      featured,
      excursionIds
    } = body;

    // Validate required fields
    if (!name || !cityId || !departureFlightId || !returnFlightId || !hotelId || !roomId || !nights || !basePrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate flights are for the correct destination
    const [departureFlight, returnFlight] = await Promise.all([
      prisma.flight.findUnique({ where: { id: departureFlightId } }),
      prisma.flight.findUnique({ where: { id: returnFlightId } })
    ]);

    if (!departureFlight || !returnFlight) {
      return NextResponse.json(
        { error: 'Invalid flight IDs' },
        { status: 400 }
      );
    }

    if (departureFlight.destinationCityId !== cityId || returnFlight.originCityId !== cityId) {
      return NextResponse.json(
        { error: 'Flights must match the package destination city' },
        { status: 400 }
      );
    }

    // Create the package
    const packageData = await prisma.package.create({
      data: {
        name,
        description,
        cityId,
        departureFlightId,
        returnFlightId,
        hotelId,
        roomId,
        nights,
        basePrice,
        maxOccupancy: maxOccupancy || 2,
        availableFrom: new Date(availableFrom),
        availableTo: new Date(availableTo),
        includesTransfer: includesTransfer ?? true,
        transferId,
        images: images || [],
        highlights: highlights || [],
        featured: featured ?? false,
        active: true,
        excursions: {
          create: excursionIds?.map((excursionId: string, index: number) => ({
            excursionId,
            included: index === 0, // First excursion is included
            price: index === 0 ? null : 5000 // Others cost extra €50
          })) || []
        }
      },
      include: {
        city: true,
        hotel: true,
        room: true,
        departureFlight: true,
        returnFlight: true,
        transfer: true,
        excursions: {
          include: {
            excursion: true
          }
        }
      }
    });

    return NextResponse.json(packageData);
  } catch (error: any) {
    console.error('Create package error:', error);
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference ID provided' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create package' },
      { status: 500 }
    );
  }
}