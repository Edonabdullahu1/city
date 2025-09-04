import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['AGENT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sample destination availability data
    // In production, this would come from flight service or inventory management
    const destinations = [
      {
        destination: 'Paris, France',
        availableSeats: 15,
        totalSeats: 30,
        nextDeparture: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        price: 29900 // €299 in cents
      },
      {
        destination: 'Rome, Italy',
        availableSeats: 8,
        totalSeats: 25,
        nextDeparture: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        price: 34900 // €349 in cents
      },
      {
        destination: 'Barcelona, Spain',
        availableSeats: 22,
        totalSeats: 35,
        nextDeparture: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        price: 27900 // €279 in cents
      },
      {
        destination: 'Amsterdam, Netherlands',
        availableSeats: 3,
        totalSeats: 20,
        nextDeparture: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        price: 31900 // €319 in cents
      },
      {
        destination: 'Prague, Czech Republic',
        availableSeats: 18,
        totalSeats: 28,
        nextDeparture: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        price: 24900 // €249 in cents
      },
      {
        destination: 'Vienna, Austria',
        availableSeats: 12,
        totalSeats: 22,
        nextDeparture: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        price: 32900 // €329 in cents
      }
    ];

    return NextResponse.json({ destinations });

  } catch (error) {
    console.error('Agent destinations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destinations' },
      { status: 500 }
    );
  }
}