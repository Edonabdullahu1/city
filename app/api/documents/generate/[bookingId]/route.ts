import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DocumentService } from '@/lib/services/documentService';
import { BookingService } from '@/lib/services/bookingService';
import { UserRole } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await params;
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('type') || 'booking_confirmation';
    const serviceId = searchParams.get('serviceId');
    const language = (searchParams.get('language') as 'en' | 'al' | 'mk') || 'en';
    const includeQR = searchParams.get('includeQR') !== 'false';

    // Get booking and check permissions
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user can access this booking
    const canAccess = BookingService.canUserAccessBooking(
      booking,
      session.user.id,
      session.user.role as UserRole
    );

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let pdfBuffer: Buffer;
    let filename: string;

    const options = { language, includeQR };

    switch (documentType) {
      case 'booking_confirmation':
        pdfBuffer = await DocumentService.generateBookingConfirmation(bookingId, options);
        filename = `booking-confirmation-${booking.reservationCode}.pdf`;
        break;

      case 'flight_ticket':
        if (!serviceId) {
          return NextResponse.json({ error: 'Service ID required for flight ticket' }, { status: 400 });
        }
        pdfBuffer = await DocumentService.generateFlightTicket(bookingId, serviceId, options);
        filename = `flight-ticket-${booking.reservationCode}-${serviceId}.pdf`;
        break;

      case 'hotel_voucher':
        if (!serviceId) {
          return NextResponse.json({ error: 'Service ID required for hotel voucher' }, { status: 400 });
        }
        pdfBuffer = await DocumentService.generateHotelVoucher(bookingId, serviceId, options);
        filename = `hotel-voucher-${booking.reservationCode}-${serviceId}.pdf`;
        break;

      case 'transfer_voucher':
        if (!serviceId) {
          return NextResponse.json({ error: 'Service ID required for transfer voucher' }, { status: 400 });
        }
        pdfBuffer = await DocumentService.generateTransferVoucher(bookingId, serviceId, options);
        filename = `transfer-voucher-${booking.reservationCode}-${serviceId}.pdf`;
        break;

      case 'excursion_voucher':
        if (!serviceId) {
          return NextResponse.json({ error: 'Service ID required for excursion voucher' }, { status: 400 });
        }
        pdfBuffer = await DocumentService.generateExcursionVoucher(bookingId, serviceId, options);
        filename = `excursion-voucher-${booking.reservationCode}-${serviceId}.pdf`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // Return PDF as download
    const response = new NextResponse(pdfBuffer as any);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    response.headers.set('Content-Length', pdfBuffer.length.toString());
    
    return response;

  } catch (error) {
    console.error('Document generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await params;
    const body = await request.json();
    const { 
      documentTypes = ['booking_confirmation'], 
      language = 'en',
      includeQR = true,
      serviceIds = {}
    } = body;

    // Get booking and check permissions
    const booking = await BookingService.getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const canAccess = BookingService.canUserAccessBooking(
      booking,
      session.user.id,
      session.user.role as UserRole
    );

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const options = { language, includeQR };
    const documents: { type: string; filename: string; buffer: Buffer }[] = [];

    for (const docType of documentTypes) {
      try {
        let pdfBuffer: Buffer;
        let filename: string;

        switch (docType) {
          case 'booking_confirmation':
            pdfBuffer = await DocumentService.generateBookingConfirmation(bookingId, options);
            filename = `booking-confirmation-${booking.reservationCode}.pdf`;
            break;

          case 'flight_tickets':
            for (const flight of booking.flights) {
              pdfBuffer = await DocumentService.generateFlightTicket(bookingId, flight.id, options);
              filename = `flight-ticket-${booking.reservationCode}-${flight.id}.pdf`;
              documents.push({ type: 'flight_ticket', filename, buffer: pdfBuffer });
            }
            continue;

          case 'hotel_vouchers':
            for (const hotel of booking.hotels) {
              pdfBuffer = await DocumentService.generateHotelVoucher(bookingId, hotel.id, options);
              filename = `hotel-voucher-${booking.reservationCode}-${hotel.id}.pdf`;
              documents.push({ type: 'hotel_voucher', filename, buffer: pdfBuffer });
            }
            continue;

          case 'transfer_vouchers':
            for (const transfer of booking.transfers) {
              pdfBuffer = await DocumentService.generateTransferVoucher(bookingId, transfer.id, options);
              filename = `transfer-voucher-${booking.reservationCode}-${transfer.id}.pdf`;
              documents.push({ type: 'transfer_voucher', filename, buffer: pdfBuffer });
            }
            continue;

          case 'excursion_vouchers':
            for (const excursion of booking.excursions) {
              pdfBuffer = await DocumentService.generateExcursionVoucher(bookingId, excursion.id, options);
              filename = `excursion-voucher-${booking.reservationCode}-${excursion.id}.pdf`;
              documents.push({ type: 'excursion_voucher', filename, buffer: pdfBuffer });
            }
            continue;

          default:
            console.warn(`Unknown document type: ${docType}`);
            continue;
        }

        documents.push({ type: docType, filename, buffer: pdfBuffer });

      } catch (error) {
        console.error(`Failed to generate ${docType}:`, error);
      }
    }

    if (documents.length === 0) {
      return NextResponse.json({ error: 'No documents could be generated' }, { status: 500 });
    }

    // If single document, return it directly
    if (documents.length === 1) {
      const doc = documents[0];
      const response = new NextResponse(doc.buffer as any);
      response.headers.set('Content-Type', 'application/pdf');
      response.headers.set('Content-Disposition', `attachment; filename="${doc.filename}"`);
      response.headers.set('Content-Length', doc.buffer.length.toString());
      return response;
    }

    // For multiple documents, create a zip file
    // For simplicity, we'll return the first document for now
    // In production, you might want to use a zip library like 'node-stream-zip'
    const firstDoc = documents[0];
    const response = new NextResponse(firstDoc.buffer as any);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="${firstDoc.filename}"`);
    response.headers.set('Content-Length', firstDoc.buffer.length.toString());
    
    return response;

  } catch (error) {
    console.error('Batch document generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate documents' },
      { status: 500 }
    );
  }
}