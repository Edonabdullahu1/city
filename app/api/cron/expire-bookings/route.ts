import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BookingStatus } from '@prisma/client';
import { WhatsAppService } from '@/lib/services/whatsappService';
import { EmailService } from '@/lib/services/emailService';

export async function GET(request: NextRequest) {
  try {
    // Check for authorization header or cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // In production, verify the request is from your cron service
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all soft bookings that have expired (older than 3 hours)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.SOFT,
        expiresAt: {
          lte: new Date()
        }
      },
      include: {
        user: true,
        flights: {
          include: {
            flight: true
          }
        },
        hotels: {
          include: {
            hotel: true
          }
        }
      }
    });

    if (expiredBookings.length === 0) {
      return NextResponse.json({ 
        message: 'No expired bookings found',
        processed: 0
      });
    }

    // Process each expired booking
    const results = await Promise.allSettled(
      expiredBookings.map(async (booking) => {
        // Release reserved inventory
        await releaseBookingInventory(booking);
        
        // Update booking status to cancelled
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date()
          }
        });

        // Send notifications
        if (booking.customerPhone) {
          await WhatsAppService.sendBookingCancellation({
            ...booking,
            reason: 'Booking expired - payment not received within 3 hours'
          });
        }

        if (booking.customerEmail) {
          await EmailService.sendBookingCancellation({
            ...booking,
            reason: 'Booking expired - payment not received within 3 hours'
          });
        }

        return {
          id: booking.id,
          reservationCode: booking.reservationCode,
          status: 'expired'
        };
      })
    );

    // Count successful and failed operations
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      message: `Processed ${expiredBookings.length} expired bookings`,
      processed: expiredBookings.length,
      successful,
      failed,
      results: results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as any).value)
    });

  } catch (error) {
    console.error('Booking expiration job error:', error);
    return NextResponse.json(
      { error: 'Failed to process expired bookings' },
      { status: 500 }
    );
  }
}

// Helper function to release inventory
async function releaseBookingInventory(booking: any) {
  const promises = [];

  // Release flight seats
  for (const flightBooking of booking.flights) {
    if (flightBooking.flight && flightBooking.flight.isBlockSeat) {
      promises.push(
        prisma.flight.update({
          where: { id: flightBooking.flightId },
          data: {
            availableSeats: {
              increment: flightBooking.passengers
            }
          }
        })
      );
    }
  }

  // In the future, also release hotel rooms, transfers, etc.
  // For now, we're only tracking flight inventory

  await Promise.all(promises);
}

// POST endpoint to manually trigger expiration check
export async function POST(request: NextRequest) {
  // Allow manual triggering for testing
  return GET(request);
}