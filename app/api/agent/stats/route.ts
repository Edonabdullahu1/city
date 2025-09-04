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

    // Get current date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // For now, we'll simulate agent-specific bookings
    // In a real app, bookings would be linked to the agent who created them
    const agentId = session.user.id;

    // Fetch agent statistics
    const [
      todayBookings,
      weekBookings,
      monthBookings,
      pendingBookings,
      activeBookings,
      monthRevenue
    ] = await Promise.all([
      // Today's bookings
      prisma.booking.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      
      // This week's bookings
      prisma.booking.count({
        where: {
          createdAt: {
            gte: weekAgo
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
      
      // Pending bookings (soft bookings)
      prisma.booking.count({
        where: {
          status: BookingStatus.SOFT
        }
      }),
      
      // Active bookings (confirmed but not completed)
      prisma.booking.count({
        where: {
          status: BookingStatus.CONFIRMED
        }
      }),
      
      // Month's revenue
      prisma.booking.aggregate({
        _sum: {
          totalAmount: true
        },
        where: {
          createdAt: {
            gte: startOfMonth
          },
          status: {
            in: [BookingStatus.CONFIRMED, BookingStatus.PAID]
          }
        }
      })
    ]);

    // Calculate commission (assuming 10% commission rate)
    const monthRevenueAmount = (monthRevenue._sum.totalAmount || 0) / 100;
    const commissionEarned = monthRevenueAmount * 0.1;

    return NextResponse.json({
      todayBookings,
      weekBookings,
      monthRevenue: monthRevenueAmount,
      pendingTasks: pendingBookings,
      activeBookings,
      commissionEarned
    });

  } catch (error) {
    console.error('Agent stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}