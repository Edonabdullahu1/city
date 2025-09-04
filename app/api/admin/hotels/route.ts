import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET all hotels
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cityId = searchParams.get('cityId');

    const whereClause = cityId ? { cityId } : {};

    const hotels = await prisma.hotel.findMany({
      where: whereClause,
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
        bookings: {
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
    const transformedHotels = hotels.map(hotel => ({
      ...hotel,
      location: hotel.city ? `${hotel.city.name}, ${hotel.city.country.name}` : '',
      starRating: hotel.rating, // Map rating to starRating for consistency
      bookingCount: hotel.bookings.length,
      bookings: undefined, // Remove bookings array from response
      city: undefined // Remove city object from response
    }));

    return NextResponse.json(transformedHotels);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotels' },
      { status: 500 }
    );
  }
}

// Helper function to generate slug
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

// Helper function to ensure unique slug
async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  let slug = generateSlug(name);
  let finalSlug = slug;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.hotel.findFirst({
      where: { 
        slug: finalSlug,
        ...(excludeId && { id: { not: excludeId } })
      }
    });
    
    if (!existing) break;
    
    finalSlug = `${slug}-${counter}`;
    counter++;
  }
  
  return finalSlug;
}

// POST create new hotel
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { hotelId, name, location, address, starRating, facilities } = body;

    // Verify hotelId is unique
    const existing = await prisma.hotel.findUnique({
      where: { hotelId }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Hotel ID already exists' },
        { status: 400 }
      );
    }

    // Find city by name
    const city = await prisma.city.findFirst({
      where: { name: location }
    });

    if (!city) {
      return NextResponse.json(
        { error: 'City not found' },
        { status: 400 }
      );
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(name);

    const hotel = await prisma.hotel.create({
      data: {
        hotelId,
        name,
        slug,
        cityId: city.id,
        address,
        category: 'standard', // Default category
        rating: starRating || 3,
        amenities: facilities || [],
        description: '',
        images: []
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
        }
      }
    });

    // Transform for consistent response
    const transformedHotel = {
      ...hotel,
      location: hotel.city ? `${hotel.city.name}, ${hotel.city.country.name}` : '',
      starRating: hotel.rating,
      city: undefined
    };

    return NextResponse.json(transformedHotel);
  } catch (error) {
    console.error('Error creating hotel:', error);
    return NextResponse.json(
      { error: 'Failed to create hotel' },
      { status: 500 }
    );
  }
}

// PUT update existing hotel
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Hotel ID is required' },
        { status: 400 }
      );
    }

    // Get existing hotel to check if slug needs updating
    const existingHotel = await prisma.hotel.findUnique({
      where: { id }
    });

    if (!existingHotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }

    let dataToUpdate: any = { ...updateData };

    // If name is being updated or slug is missing, generate new slug
    if (name && (name !== existingHotel.name || !existingHotel.slug)) {
      dataToUpdate.name = name;
      dataToUpdate.slug = await generateUniqueSlug(name, id);
    } else if (!existingHotel.slug) {
      // Generate slug from existing name if missing
      dataToUpdate.slug = await generateUniqueSlug(existingHotel.name, id);
    }

    const hotel = await prisma.hotel.update({
      where: { id },
      data: dataToUpdate,
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
        }
      }
    });

    // Transform for consistent response
    const transformedHotel = {
      ...hotel,
      location: hotel.city ? `${hotel.city.name}, ${hotel.city.country.name}` : '',
      starRating: hotel.rating,
      city: undefined
    };

    return NextResponse.json(transformedHotel);
  } catch (error) {
    console.error('Error updating hotel:', error);
    return NextResponse.json(
      { error: 'Failed to update hotel' },
      { status: 500 }
    );
  }
}