import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendModificationEmail } from '@/lib/email';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { createAuditLog, calculateChanges } from '@/lib/audit';

export async function PUT(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'AGENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      checkInDate,
      checkOutDate,
      notes
    } = body;

    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        flights: true,
        hotels: true,
        transfers: true,
        excursions: true,
        user: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Store previous state for audit
    const previousState = {
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      notes: booking.notes
    };

    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { id: params.bookingId },
      data: {
        customerName,
        customerEmail,
        customerPhone,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        notes,
        updatedAt: new Date()
      },
      include: {
        flights: true,
        hotels: true
      }
    });

    // Create audit log
    const newState = {
      customerName,
      customerEmail,
      customerPhone,
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      notes
    };

    await createAuditLog({
      bookingId: params.bookingId,
      userId: session.user.id,
      action: 'MODIFY',
      changes: calculateChanges(previousState, newState),
      previousState,
      newState,
      notes: `Booking modified by ${session.user.name}`,
      request
    });

    // Send notification emails
    try {
      await sendModificationEmail({
        to: customerEmail,
        bookingCode: booking.reservationCode,
        customerName,
        checkInDate,
        checkOutDate,
        modificationReason: notes || 'Booking details updated',
        agentName: session.user.name || 'Agent'
      });

      // Send WhatsApp notification if phone is provided
      if (customerPhone) {
        await sendWhatsAppNotification({
          to: customerPhone,
          message: `Your booking ${booking.reservationCode} has been modified. Check your email for details.`
        });
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error modifying booking:', error);
    return NextResponse.json(
      { error: 'Failed to modify booking' },
      { status: 500 }
    );
  }
}