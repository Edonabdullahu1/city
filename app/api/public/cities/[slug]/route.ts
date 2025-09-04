import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET city details by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const cityData = await prisma.city.findUnique({
      where: {
        slug: slug,
        active: true
      },
      include: {
        country: true,
        packages: {
          where: {
            active: true,
            availableFrom: {
              lte: new Date()
            },
            availableTo: {
              gte: new Date()
            }
          },
          include: {
            hotel: {
              select: {
                name: true,
                rating: true,
                address: true
              }
            },
            departureFlight: {
              select: {
                departureTime: true,
                arrivalTime: true
              }
            },
            returnFlight: {
              select: {
                departureTime: true
              }
            },
            packagePrices: {
              select: {
                adults: true,
                children: true,
                totalPrice: true
              }
            }
          }
        }
      }
    });

    if (!cityData) {
      return NextResponse.json(
        { error: 'City not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(cityData);
  } catch (error) {
    console.error('Error fetching city details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch city details' },
      { status: 500 }
    );
  }
}