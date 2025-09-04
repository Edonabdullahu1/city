import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BookingService } from '@/lib/services/bookingService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['AGENT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // For agents, prioritize bookings that need attention
    const filters: any = { 
      limit, 
      offset,
      // Prioritize soft bookings and confirmed bookings
    };

    const result = await BookingService.getBookings(filters);

    // Transform bookings for agent dashboard
    const transformedBookings = result.bookings.map(booking => ({
      id: booking.id,
      reservationCode: booking.reservationCode,
      customerName: `${booking.user.firstName} ${booking.user.lastName}`,
      email: booking.user.email,
      phone: undefined, // Phone field not available in user model
      status: booking.status,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      expiresAt: booking.expiresAt,
      createdAt: booking.createdAt,
      services: {
        flights: booking.flights.length,
        hotels: booking.hotels.length,
        transfers: booking.transfers.length,
        excursions: booking.excursions.length
      },
      destinations: [
        ...booking.flights.map(f => `${f.origin}-${f.destination}`),
        ...booking.hotels.map(h => h.location)
      ].filter((dest, index, arr) => arr.indexOf(dest) === index) // Remove duplicates
    }));

    // Sort by urgency (soft bookings first, then by expiration time)
    transformedBookings.sort((a, b) => {
      if (a.status === 'SOFT' && b.status !== 'SOFT') return -1;
      if (b.status === 'SOFT' && a.status !== 'SOFT') return 1;
      
      if (a.status === 'SOFT' && b.status === 'SOFT' && a.expiresAt && b.expiresAt) {
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      bookings: transformedBookings,
      total: result.total,
      hasMore: result.hasMore
    });

  } catch (error) {
    console.error('Agent bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}