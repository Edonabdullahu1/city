import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { BookingStatus } from '@prisma/client';
import { sendConfirmationEmail } from '@/lib/email';
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

    if (booking.status !== 'SOFT') {
      return NextResponse.json({ error: 'Booking is already confirmed or cancelled' }, { status: 400 });
    }

    // Update booking status to confirmed
    const updatedBooking = await prisma.booking.update({
      where: { id: params.bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
        expiresAt: null // Clear expiration date
      }
    });

    // Create audit log
    await createAuditLog({
      bookingId: params.bookingId,
      userId: session.user.id,
      action: 'CONFIRM',
      previousState: { status: booking.status },
      newState: { status: 'CONFIRMED' },
      notes: `Booking confirmed by ${session.user.name}`,
      request
    });

    // Send confirmation notifications
    try {
      if (booking.customerEmail) {
        await sendConfirmationEmail({
          to: booking.customerEmail,
          bookingCode: booking.reservationCode,
          customerName: booking.customerName || '',
          checkInDate: booking.checkInDate?.toISOString() || '',
          checkOutDate: booking.checkOutDate?.toISOString() || '',
          destination: booking.destination || '',
          totalAmount: booking.totalAmount
        });
      }

      if (booking.customerPhone) {
        await sendWhatsAppNotification({
          to: booking.customerPhone,
          message: `Your booking ${booking.reservationCode} has been confirmed! Check your email for details and travel documents.`
        });
      }
    } catch (error) {
      console.error('Error sending confirmation notifications:', error);
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error confirming booking:', error);
    return NextResponse.json(
      { error: 'Failed to confirm booking' },
      { status: 500 }
    );
  }
}