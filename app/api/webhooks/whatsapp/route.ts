import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/services/whatsappService';
import prisma from '@/lib/prisma';

// Webhook endpoint for WhatsApp status updates from n8n
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, messageId, status, phoneNumber, error } = body;

    console.log('WhatsApp webhook received:', {
      event,
      messageId,
      status,
      phoneNumber,
      error
    });

    // Handle different webhook events
    switch (event) {
      case 'message.delivered':
        // Log successful delivery
        console.log(`WhatsApp message delivered to ${phoneNumber}`);
        break;
      
      case 'message.failed':
        // Log failure and potentially retry
        console.error(`WhatsApp message failed for ${phoneNumber}:`, error);
        // Could implement retry logic here
        break;
      
      case 'message.read':
        // Log that message was read
        console.log(`WhatsApp message read by ${phoneNumber}`);
        break;
      
      default:
        console.log(`Unknown WhatsApp webhook event: ${event}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Endpoint to manually trigger WhatsApp messages (for testing)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    let success = false;
    let message = '';

    switch (action) {
      case 'confirmation':
        success = await WhatsAppService.sendBookingConfirmation(booking);
        message = 'Confirmation message';
        break;
      
      case 'reminder':
        success = await WhatsAppService.sendBookingReminder(booking);
        message = 'Reminder message';
        break;
      
      case 'expiring':
        success = await WhatsAppService.sendSoftBookingExpiring(booking);
        message = 'Expiring notification';
        break;
      
      case 'cancellation':
        success = await WhatsAppService.sendBookingCancellation(booking);
        message = 'Cancellation message';
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success,
      message: `${message} ${success ? 'sent' : 'failed'}`,
      booking: {
        id: booking.id,
        code: booking.reservationCode,
        phone: booking.customerPhone
      }
    });

  } catch (error) {
    console.error('WhatsApp test endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}