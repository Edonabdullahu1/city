import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      where: {
        active: true
      },
      select: {
        id: true,
        name: true,
        popular: true,
        country: {
          select: {
            id: true,
            name: true
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
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}