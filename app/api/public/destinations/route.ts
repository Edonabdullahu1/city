import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET cities that have active packages
export async function GET(request: NextRequest) {
  try {
    // Get cities that have active packages
    const cities = await prisma.city.findMany({
      where: {
        active: true,
        packages: {
          some: {
            active: true,
            availableFrom: {
              lte: new Date()
            },
            availableTo: {
              gte: new Date()
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        popular: true,
        profileImage: true,
        country: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            packages: {
              where: {
                active: true
              }
            }
          }
        }
      },
      orderBy: [
        { popular: 'desc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(cities);
  } catch (error) {
    console.error('Error fetching destinations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destinations' },
      { status: 500 }
    );
  }
}