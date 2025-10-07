import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  sendWelcomeEmail,
  sendConfirmationEmail,
  sendBookingConfirmationEmail,
  sendPaymentSentEmail,
  sendPaymentReceivedEmail,
  sendCancellationEmail,
  sendModificationEmail
} from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailType } = body;

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        packages: {
          include: {
            package: {
              include: {
                destination: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (!booking.customerEmail) {
      return NextResponse.json({ error: 'No customer email available' }, { status: 400 });
    }

    const emailData = {
      to: booking.customerEmail,
      bookingCode: booking.reservationCode,
      customerName: booking.customerName || 'Customer',
      checkInDate: booking.checkInDate?.toISOString() || new Date().toISOString(),
      checkOutDate: booking.checkOutDate?.toISOString() || new Date().toISOString(),
      destination: booking.packages[0]?.package?.destination?.name || 'Your Destination',
      totalAmount: booking.totalAmount,
    };

    // Send the appropriate email
    switch (emailType) {
      case 'welcome':
        await sendWelcomeEmail({
          to: booking.customerEmail,
          customerName: emailData.customerName,
          customerEmail: booking.customerEmail,
        });
        break;

      case 'new-booking':
        await sendConfirmationEmail(emailData);
        break;

      case 'booking-confirmation':
        await sendBookingConfirmationEmail({ ...emailData, bookingId: id });
        break;

      case 'payment-sent':
        await sendPaymentSentEmail({
          to: emailData.to,
          bookingCode: emailData.bookingCode,
          customerName: emailData.customerName,
          totalAmount: emailData.totalAmount,
        });
        break;

      case 'payment-received':
        await sendPaymentReceivedEmail({
          to: emailData.to,
          bookingCode: emailData.bookingCode,
          customerName: emailData.customerName,
          totalAmount: emailData.totalAmount,
        });
        break;

      case 'booking-cancelled':
        await sendCancellationEmail({
          to: emailData.to,
          bookingCode: emailData.bookingCode,
          customerName: emailData.customerName,
          reason: booking.notes || 'Booking cancelled',
        });
        break;

      case 'booking-edited':
        await sendModificationEmail({
          to: emailData.to,
          bookingCode: emailData.bookingCode,
          customerName: emailData.customerName,
          checkInDate: emailData.checkInDate,
          checkOutDate: emailData.checkOutDate,
          modificationReason: booking.notes || 'Booking details updated',
          agentName: session.user.name || 'Admin',
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    console.log(`[EMAIL] Manual ${emailType} email sent to ${booking.customerEmail} for booking ${booking.reservationCode}`);

    return NextResponse.json({
      success: true,
      message: `${emailType} email sent successfully`,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
