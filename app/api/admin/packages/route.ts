import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper function to ensure unique slug
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.package.findUnique({
      where: { slug }
    });
    
    if (!existing) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// GET all packages
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const packages = await prisma.package.findMany({
      include: {
        city: {
          select: {
            name: true,
            country: {
              select: {
                name: true
              }
            }
          }
        },
        departureFlight: {
          select: {
            flightNumber: true,
            departureTime: true,
            arrivalTime: true,
            originCity: {
              select: {
                name: true
              }
            }
          }
        },
        returnFlight: {
          select: {
            flightNumber: true,
            departureTime: true,
            arrivalTime: true
          }
        },
        hotel: {
          select: {
            name: true
          }
        },
        packageBookings: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data for frontend
    const transformedPackages = packages.map(pkg => ({
      ...pkg,
      location: pkg.city ? `${pkg.city.name}, ${pkg.city.country.name}` : '',
      bookingCount: pkg.packageBookings.length,
      packageBookings: undefined // Remove from response
    }));

    return NextResponse.json(transformedPackages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}

// POST create new package
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Package creation request body:', JSON.stringify(body, null, 2));
    const {
      name,
      description,
      countryId,
      cityId,
      flightBlocks, // Array of flight block IDs (outbound and return pairs)
      hotelIds, // Array of hotel IDs
      nights,
      basePrice,
      adults,
      serviceCharge,
      profitMargin,
      availableFrom,
      availableTo,
      includesTransfer,
      transferId,
      images,
      highlights,
      featured
    } = body;

    // Validate required fields
    if (!name || !cityId || !flightBlocks || flightBlocks.length === 0 || !hotelIds || hotelIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For now, we'll use the first flight block and hotel
    // In a full implementation, we'd handle multiple selections
    const firstFlightBlock = flightBlocks[0];
    const firstHotelId = hotelIds[0];

    // Get the flight block details
    const flights = await prisma.flight.findMany({
      where: {
        blockGroupId: firstFlightBlock.blockGroupId
      }
    });

    if (flights.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid flight block - must have outbound and return flights' },
        { status: 400 }
      );
    }

    const departureFlight = flights.find(f => !f.isReturn);
    const returnFlight = flights.find(f => f.isReturn);

    if (!departureFlight || !returnFlight) {
      return NextResponse.json(
        { error: 'Flight block must have both outbound and return flights' },
        { status: 400 }
      );
    }

    // Generate unique slug for the package
    const slug = await ensureUniqueSlug(generateSlug(name));
    
    // Create the package (template)
    const newPackage = await prisma.package.create({
      data: {
        name,
        slug,
        description: description || '',
        cityId,
        departureFlightId: departureFlight.id,
        returnFlightId: returnFlight.id,
        hotelId: firstHotelId,
        // Store all flight blocks and hotels as JSON
        flightBlockIds: flightBlocks.map((fb: any) => fb.blockGroupId || fb),
        hotelIds: hotelIds,
        // Pricing configuration
        serviceCharge: serviceCharge || 0,
        profitMargin: profitMargin || 20,
        // roomId is optional - will be determined dynamically based on occupancy
        nights: nights || 7,
        basePrice: Math.round(basePrice * 100) || 0, // Convert to cents
        maxOccupancy: adults || 1,
        availableFrom: new Date(availableFrom || Date.now()),
        availableTo: new Date(availableTo || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
        includesTransfer: includesTransfer !== undefined ? includesTransfer : true,
        transferId,
        images: images || [],
        highlights: highlights?.filter((h: string) => h.trim() !== '') || [],
        featured: featured || false
      },
      include: {
        city: {
          select: {
            name: true,
            country: {
              select: {
                name: true
              }
            }
          }
        },
        departureFlight: true,
        returnFlight: true,
        hotel: {
          select: {
            name: true
          }
        }
      }
    });

    // Trigger background price calculation
    // In production, this could be a queue job
    fetch(`${request.nextUrl.origin}/api/admin/packages/${newPackage.id}/calculate-prices`, {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    }).catch(error => {
      console.error('Failed to trigger price calculation:', error);
    });

    return NextResponse.json(newPackage);
  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json(
      { error: 'Failed to create package' },
      { status: 500 }
    );
  }
}