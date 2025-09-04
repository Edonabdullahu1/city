import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BookingService } from '@/lib/services/bookingService';
import { PDFService } from '@/lib/services/pdfService';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reservationCode = params.code;
    const booking = await BookingService.getBookingByCode(reservationCode);

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this booking
    if (booking.userId !== session.user.id && session.user.role !== 'ADMIN' && session.user.role !== 'AGENT') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get the document type from query params
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'confirmation';

    let pdfBuffer: Buffer;
    let filename: string;

    switch (type) {
      case 'ticket':
        pdfBuffer = await PDFService.generateFlightTicket(booking, booking.flight);
        filename = `flight-ticket-${reservationCode}.pdf`;
        break;
      
      case 'hotel':
        pdfBuffer = await PDFService.generateHotelVoucher(booking, booking.hotel);
        filename = `hotel-voucher-${reservationCode}.pdf`;
        break;
      
      case 'confirmation':
      default:
        pdfBuffer = await PDFService.generateBookingConfirmation(booking);
        filename = `booking-confirmation-${reservationCode}.pdf`;
        break;
    }

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}