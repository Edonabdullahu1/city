import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'AGENT' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Reservation code required' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { reservationCode: code },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        },
        flights: true,
        hotels: true,
        transfers: true,
        excursions: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Get modification history (mock data for now)
    const modificationHistory = [];

    return NextResponse.json({
      ...booking,
      modificationHistory
    });
  } catch (error) {
    console.error('Agent booking search error:', error);
    return NextResponse.json(
      { error: 'Failed to search booking' },
      { status: 500 }
    );
  }
}