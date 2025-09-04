import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BookingService } from '@/lib/services/bookingService';
import { EmailService } from '@/lib/services/emailService';
import { PDFService } from '@/lib/services/pdfService';

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

    // Check if user has access to confirm this booking
    if (booking.userId !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'AGENT') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Confirm the booking
    const confirmedBooking = await BookingService.confirmBooking(reservationCode);
    
    // Generate PDF confirmation
    const pdfBuffer = await PDFService.generateBookingConfirmation(confirmedBooking);
    
    // Send confirmation email with PDF attachment
    await EmailService.sendBookingConfirmation(confirmedBooking, pdfBuffer);
    
    return NextResponse.json(confirmedBooking);

  } catch (error: any) {
    console.error('Booking confirmation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm booking' },
      { status: 500 }
    );
  }
}