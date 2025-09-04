import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const countryId = searchParams.get('countryId');
    const popular = searchParams.get('popular');
    const active = searchParams.get('active');
    
    const where: any = {};
    
    if (countryId) where.countryId = countryId;
    if (popular === 'true') where.popular = true;
    if (active === 'true') where.active = true;

    const cities = await prisma.city.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      include: {
        country: true,
        airports: {
          where: { active: true },
          orderBy: { code: 'asc' }
        },
        _count: {
          select: {
            hotelsInCity: true,
            excursions: true,
            packages: true
          }
        }
      }
    });

    return NextResponse.json(cities);
  } catch (error) {
    console.error('Get cities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, countryId, timezone, popular, active } = body;

    if (!name || !countryId) {
      return NextResponse.json(
        { error: 'City name and country ID are required' },
        { status: 400 }
      );
    }

    const city = await prisma.city.create({
      data: {
        name,
        countryId,
        timezone: timezone || 'Europe/London',
        popular: popular ?? false,
        active: active ?? true
      },
      include: {
        country: true
      }
    });

    return NextResponse.json(city);
  } catch (error: any) {
    console.error('Create city error:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'City already exists in this country' },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid country ID' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create city' },
      { status: 500 }
    );
  }
}