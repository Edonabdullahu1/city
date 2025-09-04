import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { BookingStatus } from '@prisma/client';
import { sendBookingConfirmationEmail, sendPaymentReminderEmail } from '@/lib/email';
import { sendWhatsAppNotification, whatsappTemplates } from '@/lib/whatsapp';
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
    const {
      transactionId,
      bankName,
      paymentDate,
      amount,
      notes
    } = body;

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

    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json({ 
        error: 'Only confirmed bookings can receive payment' 
      }, { status: 400 });
    }

    // Update booking status to paid
    const updatedBooking = await prisma.booking.update({
      where: { id: params.bookingId },
      data: {
        status: BookingStatus.PAID,
        paidAt: new Date(paymentDate),
        notes: notes ? `Payment received: ${notes}\nTransaction ID: ${transactionId}` : `Payment received. Transaction ID: ${transactionId}`
      }
    });

    // Create payment record in audit log
    await createAuditLog({
      bookingId: params.bookingId,
      userId: session.user.id,
      action: 'PAYMENT',
      previousState: { status: 'CONFIRMED' },
      newState: { 
        status: 'PAID',
        transactionId,
        bankName,
        paymentDate,
        amount
      },
      notes: `Payment confirmed by ${session.user.name}. Transaction: ${transactionId}`,
      request
    });

    // Send confirmation notifications
    try {
      if (booking.customerEmail) {
        await sendBookingConfirmationEmail({
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
          message: whatsappTemplates.documentsReady(booking.reservationCode),
          bookingCode: booking.reservationCode,
          type: 'confirmation'
        });
      }
    } catch (error) {
      console.error('Error sending payment confirmation notifications:', error);
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}