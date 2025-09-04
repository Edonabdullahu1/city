import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const type = searchParams.get('type'); // 'code', 'email', 'phone', 'name'
    
    if (!query) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    let where: any = {};

    // Build search conditions based on user role
    if (session.user.role === 'USER') {
      // Regular users can only search their own bookings
      where.userId = session.user.id;
    }

    // Add search criteria based on type
    switch (type) {
      case 'code':
        where.reservationCode = {
          equals: query.toUpperCase(),
          mode: 'insensitive'
        };
        break;
      case 'email':
        where.customerEmail = {
          contains: query,
          mode: 'insensitive'
        };
        break;
      case 'phone':
        where.customerPhone = {
          contains: query,
          mode: 'insensitive'
        };
        break;
      case 'name':
        where.customerName = {
          contains: query,
          mode: 'insensitive'
        };
        break;
      default:
        // Search across multiple fields
        where.OR = [
          { reservationCode: { contains: query, mode: 'insensitive' } },
          { customerName: { contains: query, mode: 'insensitive' } },
          { customerEmail: { contains: query, mode: 'insensitive' } },
          { customerPhone: { contains: query, mode: 'insensitive' } }
        ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      take: 20, // Limit results
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        reservationCode: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        checkInDate: true,
        checkOutDate: true,
        status: true,
        totalAmount: true,
        currency: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Format results for display
    const results = bookings.map(booking => ({
      ...booking,
      totalAmount: booking.totalAmount / 100, // Convert cents to currency
      displayName: `${booking.reservationCode} - ${booking.customerName}`,
      displayDates: `${new Date(booking.checkInDate).toLocaleDateString()} - ${new Date(booking.checkOutDate).toLocaleDateString()}`
    }));

    return NextResponse.json({
      results,
      count: results.length,
      query,
      type
    });

  } catch (error) {
    console.error('Booking search error:', error);
    return NextResponse.json(
      { error: 'Failed to search bookings' },
      { status: 500 }
    );
  }
}