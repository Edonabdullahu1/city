import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get('active');
    
    const where = active === 'true' ? { active: true } : {};

    const countries = await prisma.country.findMany({
      where,
      orderBy: {
        name: 'asc'
      },
      include: {
        _count: {
          select: {
            cities: true
          }
        }
      }
    });

    return NextResponse.json(countries);
  } catch (error) {
    console.error('Get countries error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, currency, active } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Country code and name are required' },
        { status: 400 }
      );
    }

    const country = await prisma.country.create({
      data: {
        code: code.toUpperCase(),
        name,
        currency: currency || 'EUR',
        active: active ?? true
      }
    });

    return NextResponse.json(country);
  } catch (error: any) {
    console.error('Create country error:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Country code or name already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create country' },
      { status: 500 }
    );
  }
}