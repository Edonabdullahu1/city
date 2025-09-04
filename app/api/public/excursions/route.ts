import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all active excursions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cityId = searchParams.get('cityId');

    const where: any = {
      active: true
    };

    if (cityId) {
      where.cityId = cityId;
    }

    const excursions = await prisma.excursion.findMany({
      where,
      include: {
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
            country: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: [
        { price: 'asc' },
        { title: 'asc' }
      ]
    });

    return NextResponse.json(excursions);
  } catch (error) {
    console.error('Error fetching excursions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch excursions' },
      { status: 500 }
    );
  }
}