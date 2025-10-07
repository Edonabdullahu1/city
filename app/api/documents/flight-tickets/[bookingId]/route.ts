import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { bookingId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get booking with flight information
    const booking = await prisma.booking.findUnique({
      where: { reservationCode: bookingId },
      include: {
        packages: {
          include: {
            package: {
              include: {
                departureFlight: {
                  include: {
                    departureAirport: true,
                    arrivalAirport: true
                  }
                },
                returnFlight: {
                  include: {
                    departureAirport: true,
                    arrivalAirport: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify user has access to this booking
    if (session.user.role !== 'ADMIN' && session.user.role !== 'AGENT' && booking.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Extract passengers from passengerDetails
    let passengerList: any[] = [];
    if (booking.passengerDetails && typeof booking.passengerDetails === 'object') {
      const details = booking.passengerDetails as any;

      if (details.adults && Array.isArray(details.adults)) {
        passengerList = passengerList.concat(
          details.adults.map((adult: any, idx: number) => ({
            name: `${adult.title || ''} ${adult.firstName || ''} ${adult.lastName || ''}`.trim(),
            type: 'Adult',
            ticketNumber: `${booking.reservationCode}-ADT${(idx + 1).toString().padStart(2, '0')}`
          }))
        );
      }

      if (details.children && Array.isArray(details.children)) {
        passengerList = passengerList.concat(
          details.children.map((child: any, idx: number) => ({
            name: `${child.firstName || ''} ${child.lastName || ''}`.trim(),
            type: 'Child',
            ticketNumber: `${booking.reservationCode}-CHD${(idx + 1).toString().padStart(2, '0')}`
          }))
        );
      }

      if (details.infants && Array.isArray(details.infants)) {
        passengerList = passengerList.concat(
          details.infants.map((infant: any, idx: number) => ({
            name: `${infant.firstName || ''} ${infant.lastName || ''} (Infant)`.trim(),
            type: 'Infant',
            ticketNumber: `${booking.reservationCode}-INF${(idx + 1).toString().padStart(2, '0')}`
          }))
        );
      }
    }

    // If no passengers in details, create a single passenger from customer name
    if (passengerList.length === 0) {
      passengerList.push({
        name: booking.customerName || 'Passenger',
        type: 'Adult',
        ticketNumber: `${booking.reservationCode}-ADT01`
      });
    }

    const generatePassengerTicket = (passenger: any, departureFlight: any, returnFlight: any) => {
      const outboundDepartureDate = new Date(departureFlight.departureTime);
      const outboundArrivalDate = new Date(departureFlight.arrivalTime);
      const returnDepartureDate = new Date(returnFlight.departureTime);
      const returnArrivalDate = new Date(returnFlight.arrivalTime);

      // Extract flight number without block ID (remove everything after hyphen)
      const outboundFlightNumber = departureFlight.flightNumber.split('-')[0];
      const returnFlightNumber = returnFlight.flightNumber.split('-')[0];

      return `
      <div class="ticket-page">
        <div class="ticket-header">
          <div class="agency-name">MAX TRAVEL</div>
          <div class="ticket-title">ELECTRONIC FLIGHT TICKET</div>
        </div>

        <div class="ticket-body">
          <!-- Passenger Information -->
          <div class="section">
            <div class="section-title">PASSENGER INFORMATION</div>
            <div class="passenger-name">${passenger.name.toUpperCase()}</div>
            <div class="ticket-info-row">
              <span class="ticket-label">Electronic Ticket No:</span>
              <span class="ticket-value">${passenger.ticketNumber}</span>
              <span class="ticket-label" style="margin-left: 30px;">Issued by:</span>
              <span class="ticket-value">MAX TRAVEL</span>
            </div>
          </div>

          <!-- Outbound Flight Information -->
          <div class="section">
            <div class="section-title">FLIGHT DETAILS - OUTBOUND</div>
            <div class="flight-info-grid">
              <div class="flight-info-item">
                <div class="flight-info-label">Flight Number</div>
                <div class="flight-info-value">${outboundFlightNumber}</div>
              </div>
              <div class="flight-info-item">
                <div class="flight-info-label">Departure</div>
                <div class="flight-info-value">${departureFlight.departureAirport.code}<br/>${departureFlight.departureAirport.name}</div>
              </div>
              <div class="flight-info-item">
                <div class="flight-info-label">Arrival</div>
                <div class="flight-info-value">${departureFlight.arrivalAirport.code}<br/>${departureFlight.arrivalAirport.name}</div>
              </div>
              <div class="flight-info-item">
                <div class="flight-info-label">Date</div>
                <div class="flight-info-value">${outboundDepartureDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
              <div class="flight-info-item">
                <div class="flight-info-label">Departure Time</div>
                <div class="flight-info-value">${outboundDepartureDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div class="flight-info-item">
                <div class="flight-info-label">Arrival Time</div>
                <div class="flight-info-value">${outboundArrivalDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          </div>

          <!-- Return Flight Information -->
          <div class="section">
            <div class="section-title">FLIGHT DETAILS - RETURN</div>
            <div class="flight-info-grid">
              <div class="flight-info-item">
                <div class="flight-info-label">Flight Number</div>
                <div class="flight-info-value">${returnFlightNumber}</div>
              </div>
              <div class="flight-info-item">
                <div class="flight-info-label">Departure</div>
                <div class="flight-info-value">${returnFlight.departureAirport.code}<br/>${returnFlight.departureAirport.name}</div>
              </div>
              <div class="flight-info-item">
                <div class="flight-info-label">Arrival</div>
                <div class="flight-info-value">${returnFlight.arrivalAirport.code}<br/>${returnFlight.arrivalAirport.name}</div>
              </div>
              <div class="flight-info-item">
                <div class="flight-info-label">Date</div>
                <div class="flight-info-value">${returnDepartureDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
              <div class="flight-info-item">
                <div class="flight-info-label">Departure Time</div>
                <div class="flight-info-value">${returnDepartureDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div class="flight-info-item">
                <div class="flight-info-label">Arrival Time</div>
                <div class="flight-info-value">${returnArrivalDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          </div>

          <!-- Important Notice -->
          <div class="notice-box">
            <h4>Thank you for choosing MAX TRAVEL for your journey.</h4>
            <p>This document serves as confirmation of your booking and payment.</p>
            <p><strong>Please note that name and surname changes are not permitted after the ticket has been issued.</strong></p>
            <p>Tickets purchased through unauthorized agents are considered invalid and will not be accepted for travel.</p>
          </div>

          <!-- Important Information -->
          <div class="info-box">
            <h4>Important Information to Know Before Your Flight:</h4>
            <ul>
              <li>Please ensure you have your travel documents and your booking number, which begins with <strong>${booking.reservationCode.split('-')[0]}</strong>.</li>
              <li>Your passport must be valid for at least 6 months from the date of travel.</li>
              <li>At check-in, you must present your ticket and passport.</li>
              <li>The booking number can be found on your reservation confirmation and invoice.</li>
              <li>Max Travel recommends all passengers arrive at the airport at least 2 hours before the flight.</li>
              <li>Please contact us one day prior to your flight to reconfirm flight details.</li>
            </ul>
          </div>

          <!-- Emergency Contact -->
          <div class="contact-section">
            <p><strong>24/7 Customer Support:</strong> +383 49 754 754 | +389 76 754 754</p>
          </div>
        </div>

        <div class="ticket-footer">
          <p>Booking Reference: <strong>${booking.reservationCode}</strong></p>
          <p>Document generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
      `;
    };

    // Generate tickets for all passengers - one page per passenger with both flights
    let ticketsHtml = '';

    if (booking.packages?.[0]?.package) {
      const pkg = booking.packages[0].package;

      // Generate one page per passenger showing both outbound and return flights
      if (pkg.departureFlight && pkg.returnFlight) {
        passengerList.forEach(passenger => {
          ticketsHtml += generatePassengerTicket(passenger, pkg.departureFlight, pkg.returnFlight);
        });
      }
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flight Tickets - ${booking.reservationCode}</title>
    <style>
        @page {
            size: A4;
            margin: 15mm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #333;
            background: white;
        }

        .ticket-page {
            width: 210mm;
            min-height: 297mm;
            page-break-after: always;
            background: white;
            position: relative;
        }

        .ticket-page:last-child {
            page-break-after: avoid;
        }

        .ticket-header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 12px;
            text-align: center;
            margin-bottom: 12px;
        }

        .agency-name {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 3px;
        }

        .ticket-title {
            font-size: 18pt;
            font-weight: bold;
        }

        .ticket-body {
            padding: 0 20px;
        }

        .section {
            margin-bottom: 12px;
            border: 2px solid #1e3c72;
            border-radius: 10px;
            padding: 12px;
        }

        .section-title {
            background: #1e3c72;
            color: white;
            padding: 6px 12px;
            font-size: 12pt;
            font-weight: bold;
            margin: -12px -12px 10px -12px;
            border-radius: 8px 8px 0 0;
        }

        .passenger-name {
            font-size: 16pt;
            font-weight: bold;
            color: #1e3c72;
            text-align: center;
            text-decoration: underline;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }

        .ticket-info-row {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 5px 0;
        }

        .ticket-label {
            font-weight: 600;
            color: #666;
            font-size: 10pt;
        }

        .ticket-value {
            color: #1e3c72;
            font-weight: 600;
            font-size: 11pt;
            margin-left: 8px;
        }

        .info-row {
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }

        .info-row:last-child {
            border-bottom: none;
        }

        .label {
            font-weight: 600;
            color: #666;
            min-width: 180px;
        }

        .value {
            color: #1e3c72;
            font-weight: 600;
            flex: 1;
        }

        .flight-info-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 15px;
            margin-top: 15px;
        }

        .flight-info-item {
            text-align: center;
        }

        .flight-info-label {
            font-size: 9pt;
            color: #666;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
        }

        .flight-info-value {
            font-size: 11pt;
            color: #1e3c72;
            font-weight: 700;
            line-height: 1.3;
        }

        .notice-box {
            background: #fff9e6;
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 10px;
        }

        .notice-box h4 {
            color: #856404;
            font-size: 11pt;
            margin-bottom: 6px;
        }

        .notice-box p {
            font-size: 9pt;
            color: #333;
            margin: 3px 0;
        }

        .info-box {
            background: #e7f3ff;
            border: 2px solid #2196F3;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 10px;
        }

        .info-box h4 {
            color: #1e3c72;
            font-size: 11pt;
            margin-bottom: 6px;
        }

        .info-box ul {
            margin-left: 18px;
        }

        .info-box li {
            font-size: 9pt;
            color: #333;
            margin: 3px 0;
        }

        .contact-section {
            text-align: center;
            background: #f8f9fa;
            padding: 8px;
            border-radius: 6px;
            margin-bottom: 10px;
        }

        .contact-section p {
            font-size: 9pt;
            color: #1e3c72;
        }

        .ticket-footer {
            text-align: center;
            padding: 10px;
            background: #f8f9fa;
            border-top: 2px solid #dee2e6;
            font-size: 8pt;
            color: #666;
            margin-top: 12px;
        }

        .ticket-footer p {
            margin: 3px 0;
        }

        @media screen and (max-width: 768px) {
            body {
                font-size: 10pt;
                background: white;
            }

            .ticket-page {
                width: 100%;
                min-height: auto;
                padding: 0;
            }

            .ticket-header {
                padding: 15px 10px;
            }

            .agency-name, .ticket-title {
                font-size: 16pt;
            }

            .ticket-body {
                padding: 0 10px;
            }

            .section {
                padding: 10px;
                margin-bottom: 10px;
            }

            .section-title {
                font-size: 11pt;
                padding: 8px 10px;
                margin: -10px -10px 10px -10px;
            }

            .passenger-name {
                font-size: 14pt;
            }

            .flight-info-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }

            .flight-info-label {
                font-size: 8pt;
            }

            .flight-info-value {
                font-size: 10pt;
            }

            .notice-box, .info-box {
                padding: 12px;
                margin-bottom: 12px;
            }

            .notice-box h4, .info-box h4 {
                font-size: 10pt;
            }

            .notice-box p, .info-box li {
                font-size: 8.5pt;
            }

            .ticket-footer {
                font-size: 7pt;
            }
        }

        @media print {
            body {
                margin: 0;
                padding: 0;
                background: white;
            }

            .ticket-page {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    ${ticketsHtml}
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="flight-tickets-${booking.reservationCode}.html"`
      }
    });

  } catch (error) {
    console.error('Flight tickets generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate flight tickets' },
      { status: 500 }
    );
  }
}
