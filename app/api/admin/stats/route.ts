import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { BookingStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Fetch statistics
    const [
      totalBookings,
      pendingBookings,
      todayBookings,
      thisMonthBookings,
      lastMonthBookings,
      totalRevenue,
      activeUsers
    ] = await Promise.all([
      // Total bookings
      prisma.booking.count(),
      
      // Pending bookings (soft bookings not yet confirmed)
      prisma.booking.count({
        where: {
          status: BookingStatus.SOFT
        }
      }),
      
      // Today's bookings
      prisma.booking.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      
      // This month's bookings
      prisma.booking.count({
        where: {
          createdAt: {
            gte: startOfMonth
          }
        }
      }),
      
      // Last month's bookings
      prisma.booking.count({
        where: {
          createdAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth
          }
        }
      }),
      
      // Total revenue (only from paid bookings)
      prisma.booking.aggregate({
        _sum: {
          totalAmount: true
        },
        where: {
          status: BookingStatus.PAID
        }
      }),
      
      // Active users (users with at least one booking)
      prisma.user.count({
        where: {
          bookings: {
            some: {}
          }
        }
      })
    ]);

    // Calculate monthly growth
    const monthlyGrowth = lastMonthBookings > 0 
      ? Math.round(((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100)
      : 0;

    return NextResponse.json({
      totalBookings,
      pendingBookings,
      todayBookings,
      totalRevenue: (totalRevenue._sum.totalAmount || 0) / 100, // Convert from cents to euros
      activeUsers,
      monthlyGrowth
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}