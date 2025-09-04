import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { BookingStatus } from '@prisma/client';
import { sendCancellationEmail } from '@/lib/email';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'AGENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reason } = body;

    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        flights: true,
        hotels: true,
        transfers: true,
        excursions: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    if (booking.status === 'PAID') {
      return NextResponse.json({ error: 'Cannot cancel paid bookings without refund process' }, { status: 400 });
    }

    // Store previous status for audit
    const previousStatus = booking.status;

    // Update booking status to cancelled
    const updatedBooking = await prisma.booking.update({
      where: { id: params.bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        notes: reason ? `Cancelled by agent: ${reason}` : 'Cancelled by agent'
      }
    });

    // Create audit log
    await createAuditLog({
      bookingId: params.bookingId,
      userId: session.user.id,
      action: 'CANCEL',
      previousState: { status: previousStatus },
      newState: { status: 'CANCELLED', reason },
      notes: reason || `Booking cancelled by ${session.user.name}`,
      request
    });

    // TODO: Release any block seats back to inventory
    if (booking.flights.length > 0) {
      for (const flightBooking of booking.flights) {
        if (flightBooking.isBlockSeat && flightBooking.flightId) {
          await prisma.flight.update({
            where: { id: flightBooking.flightId },
            data: {
              availableSeats: {
                increment: flightBooking.passengers
              }
            }
          });
        }
      }
    }

    // Send cancellation notifications
    try {
      if (booking.customerEmail) {
        await sendCancellationEmail({
          to: booking.customerEmail,
          bookingCode: booking.reservationCode,
          customerName: booking.customerName || '',
          reason: reason || 'Agent cancellation'
        });
      }

      if (booking.customerPhone) {
        await sendWhatsAppNotification({
          to: booking.customerPhone,
          message: `Your booking ${booking.reservationCode} has been cancelled. Please contact us if you have any questions.`
        });
      }
    } catch (error) {
      console.error('Error sending cancellation notifications:', error);
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}