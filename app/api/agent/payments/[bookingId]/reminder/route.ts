import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendPaymentReminderEmail } from '@/lib/email';
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

    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        flights: true,
        hotels: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json({ 
        error: 'Payment reminders can only be sent for confirmed bookings' 
      }, { status: 400 });
    }

    // Calculate payment due date (e.g., 7 days from confirmation)
    const confirmedDate = booking.confirmedAt || booking.createdAt;
    const dueDate = new Date(confirmedDate);
    dueDate.setDate(dueDate.getDate() + 7);

    // Send reminder notifications
    try {
      if (booking.customerEmail) {
        await sendPaymentReminderEmail({
          to: booking.customerEmail,
          bookingCode: booking.reservationCode,
          customerName: booking.customerName || '',
          totalAmount: booking.totalAmount,
          dueDate: dueDate.toISOString()
        });
      }

      if (booking.customerPhone) {
        const message = whatsappTemplates.paymentReminder(
          booking.reservationCode,
          (booking.totalAmount / 100).toFixed(2),
          dueDate.toLocaleDateString()
        );
        
        await sendWhatsAppNotification({
          to: booking.customerPhone,
          message,
          bookingCode: booking.reservationCode,
          type: 'reminder'
        });
      }

      // Create audit log entry
      await createAuditLog({
        bookingId: params.bookingId,
        userId: session.user.id,
        action: 'VIEW', // Using VIEW as we don't have a REMINDER action
        changes: {
          action: 'payment_reminder_sent',
          sentTo: {
            email: booking.customerEmail,
            phone: booking.customerPhone
          }
        },
        notes: `Payment reminder sent by ${session.user.name}`,
        request
      });

      return NextResponse.json({
        success: true,
        message: 'Payment reminder sent successfully'
      });

    } catch (error) {
      console.error('Error sending payment reminder:', error);
      return NextResponse.json(
        { error: 'Failed to send payment reminder' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing payment reminder request:', error);
    return NextResponse.json(
      { error: 'Failed to process payment reminder request' },
      { status: 500 }
    );
  }
}