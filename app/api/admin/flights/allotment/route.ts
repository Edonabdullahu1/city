import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const destination = searchParams.get('destination');

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'From date and to date are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    // Get all flight blocks within the date range
    const flights = await prisma.flight.findMany({
      where: {
        isBlockSeat: true,
        departureTime: {
          gte: startDate,
          lte: endDate
        },
        ...(destination && destination !== 'all' ? {
          arrivalAirport: {
            city: {
              name: destination
            }
          }
        } : {})
      },
      include: {
        departureAirport: {
          include: {
            city: true
          }
        },
        arrivalAirport: {
          include: {
            city: true
          }
        },
        bookings: {
          include: {
            booking: true
          }
        }
      },
      orderBy: {
        departureTime: 'asc'
      }
    });

    // Group flights by base flight number (without block suffix) and route
    const flightGroups = new Map<string, any>();

    flights.forEach(flight => {
      const route = `${flight.departureAirport.city.name}-${flight.arrivalAirport.city.name}`;

      // Extract base flight number (e.g., "PC342" from "PC342-659794")
      const baseFlightNumber = flight.flightNumber.split('-')[0];
      const key = `${baseFlightNumber}_${route}`;

      if (!flightGroups.has(key)) {
        flightGroups.set(key, {
          flightNumber: baseFlightNumber,
          route: route,
          dailyData: [],
          totalAllotment: 0,
          totalUsed: 0,
          totalAvailable: 0,
          percentage: 0
        });
      }

      const group = flightGroups.get(key);

      // Calculate used seats from bookings with valid status
      const usedSeats = flight.bookings.reduce((sum, fb) => {
        if (fb.booking && ['SOFT', 'CONFIRMED', 'PAID'].includes(fb.booking.status)) {
          return sum + fb.passengers;
        }
        return sum;
      }, 0);

      const allotment = flight.totalSeats || 0;
      // Calculate available = allotment - used (not using availableSeats field)
      const available = allotment - usedSeats;

      group.dailyData.push({
        date: flight.departureTime,
        allotment: allotment,
        used: usedSeats,
        available: available
      });

      group.totalAllotment += allotment;
      group.totalUsed += usedSeats;
      group.totalAvailable += available;
    });

    // Calculate percentages and format data
    const allotmentData = Array.from(flightGroups.values()).map(group => {
      group.percentage = group.totalAllotment > 0
        ? Math.round((group.totalUsed / group.totalAllotment) * 100)
        : 0;

      // Sort daily data by date
      group.dailyData.sort((a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Generate daily data for all days in range
      const dailyDataMap = new Map();
      group.dailyData.forEach((data: any) => {
        const dateKey = new Date(data.date).toISOString().split('T')[0];
        if (!dailyDataMap.has(dateKey)) {
          dailyDataMap.set(dateKey, {
            allotment: 0,
            used: 0,
            available: 0
          });
        }
        const existing = dailyDataMap.get(dateKey);
        existing.allotment += data.allotment;
        existing.used += data.used;
        existing.available += data.available;
      });

      // Fill in missing dates with zeros
      const fullDailyData = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        if (dailyDataMap.has(dateKey)) {
          fullDailyData.push(dailyDataMap.get(dateKey));
        } else {
          fullDailyData.push({
            allotment: 0,
            used: 0,
            available: 0
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      group.dailyData = fullDailyData;
      return group;
    });

    return NextResponse.json({
      success: true,
      allotmentData
    });

  } catch (error) {
    console.error('Error fetching allotment data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch allotment data' },
      { status: 500 }
    );
  }
}
