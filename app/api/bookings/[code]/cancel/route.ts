import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BookingService } from '@/lib/services/bookingService';
import { EmailService } from '@/lib/services/emailService';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reservationCode = params.code;
    
    // First get the booking to check ownership
    const booking = await BookingService.getBookingByCode(reservationCode);
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user has access to cancel this booking
    if (booking.userId !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'AGENT') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Cancel the booking
    const cancelledBooking = await BookingService.cancelBooking(reservationCode);
    
    // Send cancellation email
    await EmailService.sendBookingCancellation(cancelledBooking);
    
    // TODO: Process any refunds if applicable
    
    return NextResponse.json(cancelledBooking);

  } catch (error: any) {
    console.error('Booking cancellation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}