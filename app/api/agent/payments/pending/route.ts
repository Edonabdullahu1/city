import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { BookingStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'AGENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch confirmed bookings that haven't been paid yet
    const pendingPayments = await prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED
      },
      select: {
        id: true,
        reservationCode: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        totalAmount: true,
        currency: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        destination: true,
        createdAt: true,
        confirmedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        confirmedAt: 'asc' // Oldest confirmed first
      }
    });

    return NextResponse.json({
      success: true,
      bookings: pendingPayments
    });

  } catch (error) {
    console.error('Error fetching pending payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending payments' },
      { status: 500 }
    );
  }
}