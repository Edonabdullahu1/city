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

    const searchParams = request.nextUrl.searchParams;
    const startDate = new Date(searchParams.get('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
    const endDate = new Date(searchParams.get('endDate') || new Date().toISOString());
    const reportType = searchParams.get('type') || 'overview';

    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    // Fetch all bookings in date range
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Calculate base statistics
    const totalBookings = bookings.length;
    const totalRevenue = bookings
      .filter(b => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PAID)
      .reduce((sum, b) => sum + (b.totalAmount / 100), 0);
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Top destinations
    const destinationMap = new Map<string, { count: number; revenue: number }>();
    bookings.forEach(booking => {
      const dest = booking.destination || 'Unknown';
      const current = destinationMap.get(dest) || { count: 0, revenue: 0 };
      current.count++;
      if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PAID) {
        current.revenue += booking.totalAmount / 100;
      }
      destinationMap.set(dest, current);
    });

    const topDestinations = Array.from(destinationMap.entries())
      .map(([destination, data]) => ({ destination, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Bookings by month
    const monthMap = new Map<string, { count: number; revenue: number }>();
    bookings.forEach(booking => {
      const monthKey = `${booking.createdAt.getFullYear()}-${String(booking.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const monthName = new Date(booking.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      const current = monthMap.get(monthName) || { count: 0, revenue: 0 };
      current.count++;
      if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PAID) {
        current.revenue += booking.totalAmount / 100;
      }
      monthMap.set(monthName, current);
    });

    const bookingsByMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });

    // Bookings by status
    const statusCounts = {
      SOFT: 0,
      CONFIRMED: 0,
      PAID: 0,
      CANCELLED: 0
    };
    
    bookings.forEach(booking => {
      statusCounts[booking.status]++;
    });

    const bookingsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0
    }));

    // Agent performance
    const agentMap = new Map<string, { name: string; bookings: number; revenue: number }>();
    
    bookings.forEach(booking => {
      if (booking.user && booking.user.role === 'AGENT') {
        const agentKey = booking.user.id;
        const current = agentMap.get(agentKey) || { 
          name: booking.user.name || booking.user.email || 'Unknown Agent',
          bookings: 0,
          revenue: 0 
        };
        current.bookings++;
        if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PAID) {
          current.revenue += booking.totalAmount / 100;
        }
        agentMap.set(agentKey, current);
      }
    });

    const agentPerformance = Array.from(agentMap.values())
      .map(agent => ({
        ...agent,
        commission: agent.revenue * 0.1 // 10% commission
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Additional statistics for different report types
    let additionalStats = {};

    switch (reportType) {
      case 'sales':
        // Add daily breakdown for sales report
        const dailyMap = new Map<string, { date: string; bookings: number; revenue: number }>();
        bookings.forEach(booking => {
          const dateKey = booking.createdAt.toISOString().split('T')[0];
          const current = dailyMap.get(dateKey) || { date: dateKey, bookings: 0, revenue: 0 };
          current.bookings++;
          if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PAID) {
            current.revenue += booking.totalAmount / 100;
          }
          dailyMap.set(dateKey, current);
        });
        
        additionalStats = {
          dailyBreakdown: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
        };
        break;

      case 'customers':
        // Add customer statistics
        const customerMap = new Map<string, { email: string; bookings: number; totalSpent: number }>();
        bookings.forEach(booking => {
          const key = booking.customerEmail;
          const current = customerMap.get(key) || {
            email: booking.customerEmail,
            bookings: 0,
            totalSpent: 0
          };
          current.bookings++;
          if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PAID) {
            current.totalSpent += booking.totalAmount / 100;
          }
          customerMap.set(key, current);
        });

        const topCustomers = Array.from(customerMap.values())
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 10);

        additionalStats = {
          totalCustomers: customerMap.size,
          repeatCustomers: Array.from(customerMap.values()).filter(c => c.bookings > 1).length,
          topCustomers
        };
        break;
    }

    return NextResponse.json({
      totalBookings,
      totalRevenue,
      averageBookingValue,
      topDestinations,
      bookingsByMonth,
      bookingsByStatus,
      agentPerformance,
      ...additionalStats
    });

  } catch (error) {
    console.error('Admin reports error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}