import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/admin/cities
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
    const countryId = searchParams.get('countryId');

    const where: any = {};
    
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    
    if (countryId) {
      where.countryId = countryId;
    }

    const cities = await prisma.city.findMany({
      where,
      include: {
        country: true,
        _count: {
          select: { 
            airports: true,
            hotelsInCity: true,
            excursions: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(
      cities.map(city => ({
        id: city.id,
        name: city.name,
        countryId: city.countryId,
        countryName: city.country.name,
        timezone: city.timezone,
        popular: city.popular,
        active: city.active,
        about: city.about,
        profileImage: city.profileImage,
        airportCount: city._count.airports,
        hotelCount: city._count.hotelsInCity,
        excursionCount: city._count.excursions,
        createdAt: city.createdAt,
        updatedAt: city.updatedAt
      }))
    );
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}

// POST /api/admin/cities
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
    const { name, countryId, timezone = 'Europe/London', popular = false, about, profileImage } = body;

    if (!name || !countryId) {
      return NextResponse.json(
        { error: 'City name and country are required' },
        { status: 400 }
      );
    }

    // Check if country exists
    const country = await prisma.country.findUnique({
      where: { id: countryId }
    });

    if (!country) {
      return NextResponse.json(
        { error: 'Country not found' },
        { status: 404 }
      );
    }

    // Check if city already exists in this country
    const existingCity = await prisma.city.findFirst({
      where: {
        name,
        countryId
      }
    });

    if (existingCity) {
      return NextResponse.json(
        { error: 'City already exists in this country' },
        { status: 409 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const city = await prisma.city.create({
      data: {
        name,
        slug,
        countryId,
        timezone,
        popular,
        active: true,
        about,
        profileImage
      },
      include: {
        country: true
      }
    });

    return NextResponse.json({ city }, { status: 201 });
  } catch (error) {
    console.error('Error creating city:', error);
    return NextResponse.json(
      { error: 'Failed to create city' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/cities
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
    const { id, name, countryId, timezone, popular, active, about, profileImage } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'City ID is required' },
        { status: 400 }
      );
    }

    // If changing country, verify it exists
    if (countryId) {
      const country = await prisma.country.findUnique({
        where: { id: countryId }
      });

      if (!country) {
        return NextResponse.json(
          { error: 'Country not found' },
          { status: 404 }
        );
      }
    }

    // Check for duplicate if changing name or country
    if (name || countryId) {
      const existingCity = await prisma.city.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { name: name || undefined },
            { countryId: countryId || undefined }
          ]
        }
      });

      if (existingCity) {
        return NextResponse.json(
          { error: 'Another city with this name already exists in the country' },
          { status: 409 }
        );
      }
    }

    // Generate new slug if name is being updated
    const updateData: any = {};
    if (name) {
      updateData.name = name;
      updateData.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    if (countryId) updateData.countryId = countryId;
    if (timezone) updateData.timezone = timezone;
    if (popular !== undefined) updateData.popular = popular;
    if (active !== undefined) updateData.active = active;
    if (about !== undefined) updateData.about = about;
    if (profileImage !== undefined) updateData.profileImage = profileImage;

    const city = await prisma.city.update({
      where: { id },
      data: updateData,
      include: {
        country: true
      }
    });

    return NextResponse.json({ city });
  } catch (error) {
    console.error('Error updating city:', error);
    return NextResponse.json(
      { error: 'Failed to update city' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/cities
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
        { error: 'City ID is required' },
        { status: 400 }
      );
    }

    // Check if city has related data
    const [airportCount, hotelCount, excursionCount] = await Promise.all([
      prisma.airport.count({ where: { cityId: id } }),
      prisma.hotel.count({ where: { cityId: id } }),
      prisma.excursion.count({ where: { cityId: id } })
    ]);

    const relatedData = [];
    if (airportCount > 0) relatedData.push(`${airportCount} airports`);
    if (hotelCount > 0) relatedData.push(`${hotelCount} hotels`);
    if (excursionCount > 0) relatedData.push(`${excursionCount} excursions`);

    if (relatedData.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete city with ${relatedData.join(', ')}. Please delete related data first.` },
        { status: 400 }
      );
    }

    await prisma.city.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting city:', error);
    return NextResponse.json(
      { error: 'Failed to delete city' },
      { status: 500 }
    );
  }
}