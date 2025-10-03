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

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'AGENT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get booking with hotel information
    const booking = await prisma.booking.findUnique({
      where: { reservationCode: bookingId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        packages: {
          include: {
            selectedHotel: {
              include: {
                city: {
                  include: {
                    country: true
                  }
                }
              }
            },
            package: {
              include: {
                hotel: {
                  include: {
                    city: {
                      include: {
                        country: true
                      }
                    }
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

    // Get hotel info (prioritize selectedHotel, fallback to package hotel)
    const hotelInfo = booking.packages?.[0]?.selectedHotel || booking.packages?.[0]?.package?.hotel;

    // Get passenger information
    const packageInfo = booking.packages?.[0];
    const adults = packageInfo?.adults || 1;
    const children = packageInfo?.children || 0;
    const infants = packageInfo?.infants || 0;

    // Calculate nights - use package booking dates first, fallback to main booking dates
    const checkInDate = packageInfo?.checkIn ? new Date(packageInfo.checkIn) :
                        (booking.checkInDate ? new Date(booking.checkInDate) : null);
    const checkOutDate = packageInfo?.checkOut ? new Date(packageInfo.checkOut) :
                         (booking.checkOutDate ? new Date(booking.checkOutDate) : null);

    // Fix: Calculate nights correctly by using UTC dates to avoid timezone issues
    let nightsStay = 0;
    if (checkInDate && checkOutDate) {
      const checkInUTC = Date.UTC(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
      const checkOutUTC = Date.UTC(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate());
      nightsStay = Math.floor((checkOutUTC - checkInUTC) / (1000 * 60 * 60 * 24));
    }

    // Extract passenger names from passengerDetails
    let passengerList: string[] = [];
    let primaryGuestName = '';
    if (booking.passengerDetails && typeof booking.passengerDetails === 'object') {
      const details = booking.passengerDetails as any;

      // Debug: Log the passenger details to see what's in the database
      console.log('Passenger Details from DB:', JSON.stringify(details, null, 2));

      // Add adults
      if (details.adults && Array.isArray(details.adults)) {
        passengerList = passengerList.concat(
          details.adults.map((adult: any, index: number) => {
            console.log(`Adult ${index + 1}:`, adult);
            return `${adult.title || ''} ${adult.firstName || ''} ${adult.lastName || ''}`.trim();
          })
        );
        // Use first adult as primary guest
        if (details.adults.length > 0) {
          const firstAdult = details.adults[0];
          primaryGuestName = `${firstAdult.title || ''} ${firstAdult.firstName || ''} ${firstAdult.lastName || ''}`.trim();
        }
      }

      // Add children
      if (details.children && Array.isArray(details.children)) {
        passengerList = passengerList.concat(
          details.children.map((child: any) =>
            `${child.firstName || ''} ${child.lastName || ''}`.trim()
          )
        );
      }

      // Add infants
      if (details.infants && Array.isArray(details.infants)) {
        passengerList = passengerList.concat(
          details.infants.map((infant: any) =>
            `${infant.firstName || ''} ${infant.lastName || ''} (Infant)`.trim()
          )
        );
      }
    }

    // Fallback to customerName if no passenger details available
    if (!primaryGuestName) {
      primaryGuestName = booking.customerName || `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim();
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Hotel Voucher - ${booking.reservationCode}</title>
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
            line-height: 1.4;
            color: #333;
        }

        .voucher {
            max-width: 210mm;
            margin: 0 auto;
        }

        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 10px;
            text-align: center;
            margin-bottom: 8px;
        }

        .header h1 {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 0;
        }

        .reservation-code {
            background: #f8f9fa;
            border-left: 5px solid #1e3c72;
            padding: 8px 12px;
            margin-bottom: 8px;
            font-size: 18pt;
            font-weight: bold;
            color: #1e3c72;
        }

        .reservation-label {
            font-size: 8pt;
            color: #666;
            margin-bottom: 2px;
        }

        .section {
            margin-bottom: 10px;
        }

        .section-title {
            background: #1e3c72;
            color: white;
            padding: 6px 10px;
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 6px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 8px;
        }

        .info-box {
            border: 1px solid #ddd;
            padding: 8px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            border-bottom: 1px dotted #ddd;
        }

        .info-row:last-child {
            border-bottom: none;
        }

        .label {
            font-weight: 600;
            color: #666;
            font-size: 9pt;
        }

        .value {
            color: #1e3c72;
            font-weight: 600;
            text-align: right;
            font-size: 9pt;
        }

        .hotel-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px;
            margin-bottom: 8px;
        }

        .hotel-name {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 3px;
        }

        .hotel-location {
            font-size: 10pt;
            opacity: 0.9;
        }

        .payment-box {
            background: #fff9e6;
            border: 2px solid #ffc107;
            padding: 8px;
            margin-bottom: 8px;
        }

        .payment-title {
            font-size: 10pt;
            font-weight: bold;
            color: #856404;
            margin-bottom: 6px;
        }

        .payment-text {
            font-size: 9pt;
            color: #333;
            line-height: 1.4;
        }

        .additional-info {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 8px;
            margin-bottom: 8px;
        }

        .additional-info h4 {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 5px;
            color: #1e3c72;
        }

        .additional-info p, .additional-info ul {
            font-size: 8pt;
            line-height: 1.3;
            color: #555;
        }

        .additional-info ul {
            margin-left: 12px;
            margin-top: 3px;
        }

        .additional-info li {
            margin: 2px 0;
        }

        .footer {
            text-align: center;
            font-size: 8pt;
            color: #666;
            padding: 10px 0;
            border-top: 2px solid #dee2e6;
            margin-top: 10px;
        }

        .emergency {
            background: #e7f3ff;
            padding: 10px;
            margin-top: 10px;
            border-radius: 5px;
            font-weight: bold;
            color: #1e3c72;
        }

        @media print {
            body {
                margin: 0;
                padding: 0;
            }

            button {
                display: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="voucher">
        <!-- Header -->
        <div class="header">
            <div style="font-size: 14pt; margin-bottom: 5px;">MAX TRAVEL</div>
            <h1>HOTEL VOUCHER</h1>
        </div>

        <!-- Reservation Code -->
        <div class="reservation-code">
            <div class="reservation-label">Your booking confirmation number is</div>
            ${booking.reservationCode}
        </div>

        <!-- Guest and Stay Information -->
        <div class="info-grid">
            <div class="info-box">
                <div style="font-weight: bold; color: #1e3c72; margin-bottom: 10px; font-size: 12pt;">GUEST INFORMATION</div>
                <div class="info-row">
                    <span class="label">Primary Guest</span>
                    <span class="value">${primaryGuestName}</span>
                </div>
                <div class="info-row">
                    <span class="label">Email</span>
                    <span class="value">${booking.customerEmail || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Phone</span>
                    <span class="value">${booking.customerPhone || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Total Guests</span>
                    <span class="value">${adults} Adult${adults > 1 ? 's' : ''}${children > 0 ? ', ' + children + ' Child' + (children > 1 ? 'ren' : '') : ''}${infants > 0 ? ', ' + infants + ' Infant' + (infants > 1 ? 's' : '') : ''}</span>
                </div>
            </div>

            <div class="info-box">
                <div style="font-weight: bold; color: #1e3c72; margin-bottom: 10px; font-size: 12pt;">STAY DETAILS</div>
                <div class="info-row">
                    <span class="label">Check-in</span>
                    <span class="value">${checkInDate ? checkInDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBC'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Check-out</span>
                    <span class="value">${checkOutDate ? checkOutDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBC'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Duration</span>
                    <span class="value">${nightsStay > 0 ? nightsStay + ' Night' + (nightsStay > 1 ? 's' : '') : 'TBD'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Check-in Time</span>
                    <span class="value">After 3:00 PM</span>
                </div>
                <div class="info-row">
                    <span class="label">Check-out Time</span>
                    <span class="value">Before 12:00 PM</span>
                </div>
            </div>
        </div>

        <!-- Hotel Information -->
        ${hotelInfo ? `
        <div class="hotel-box">
            <div class="hotel-name">${hotelInfo.name}</div>
            <div class="hotel-location">📍 ${hotelInfo.city.name}, ${hotelInfo.city.country.name}</div>
        </div>
        ` : ''}

        <!-- Guest List -->
        ${passengerList.length > 0 ? `
        <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; margin-bottom: 15px;">
            <div style="font-weight: bold; color: #1e3c72; margin-bottom: 10px; font-size: 12pt;">GUEST NAMES</div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                ${passengerList.map((name, idx) => `
                    <div style="padding: 5px 0; border-bottom: 1px dotted #ddd;">
                        <span style="color: #666; font-size: 10pt;">${idx + 1}.</span>
                        <span style="color: #1e3c72; font-weight: 600; font-size: 10pt; margin-left: 8px;">${name.toUpperCase()}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Payment Details -->
        <div class="payment-box">
            <div class="payment-title">PAYMENT DETAILS - PAYMENT BY MAX TRAVEL</div>
            <div class="payment-text">
                <p><strong>This voucher is valid as payment only for the above mentioned services.</strong></p>
                <p style="margin-top: 8px;">Any extra cost will be paid directly by the client.</p>
            </div>
        </div>

        <!-- Additional Information -->
        <div class="additional-info">
            <h4>Additional Information Requests:</h4>
            <p>Specific room types, smoking preferences and bedding types cannot be guaranteed and are subject to availability at the time of check-in. It is always guaranteed that the room provided by the hotel will accommodate the number of guests booked.</p>

            <h4 style="margin-top: 10px;">Hotel Charges:</h4>
            <p>Additional hotel services, resort fees and city taxes must be paid to the hotel directly.</p>

            <h4 style="margin-top: 10px;">Emergency Contact:</h4>
            <p>In the case of an issue or emergency with your booking, when your agency is not reachable,<br/>please call MAX TRAVEL on phone: <strong>+383 49 754 754</strong> | <strong>+389 76 754 754</strong></p>
        </div>

        <!-- Footer with Actions -->
        <div class="footer">
            <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 15px;">
                <button onclick="window.print()" style="background: #1e3c72; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 11pt; font-weight: 600;">
                    📄 Create PDF
                </button>
                <button onclick="if(navigator.share){navigator.share({title:'Hotel Voucher',text:'Hotel Voucher - ${booking.reservationCode}',url:window.location.href})}else{alert('Sharing not supported on this device')}" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 11pt; font-weight: 600;">
                    🔗 Share
                </button>
            </div>
            <p style="margin-top: 5px; font-size: 9pt;">Document generated on ${new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</p>
        </div>
    </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="hotel-voucher-${booking.reservationCode}.html"`
      }
    });

  } catch (error) {
    console.error('Hotel voucher generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate hotel voucher' },
      { status: 500 }
    );
  }
}
