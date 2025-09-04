import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cityId = searchParams.get('cityId');
    const active = searchParams.get('active');
    
    const where: any = {};
    
    if (cityId) where.cityId = cityId;
    if (active === 'true') where.active = true;

    const airports = await prisma.airport.findMany({
      where,
      orderBy: {
        code: 'asc'
      },
      include: {
        city: {
          include: {
            country: true
          }
        }
      }
    });

    return NextResponse.json(airports);
  } catch (error) {
    console.error('Get airports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch airports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, cityId, active } = body;

    if (!code || !name || !cityId) {
      return NextResponse.json(
        { error: 'Airport code, name, and city ID are required' },
        { status: 400 }
      );
    }

    const airport = await prisma.airport.create({
      data: {
        code: code.toUpperCase(),
        name,
        cityId,
        active: active ?? true
      },
      include: {
        city: {
          include: {
            country: true
          }
        }
      }
    });

    return NextResponse.json(airport);
  } catch (error: any) {
    console.error('Create airport error:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Airport code already exists' },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid city ID' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create airport' },
      { status: 500 }
    );
  }
}