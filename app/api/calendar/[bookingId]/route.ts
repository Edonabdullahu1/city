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

    const pkg = booking.packages?.[0]?.package;
    if (!pkg) {
      return NextResponse.json({ error: 'No package found' }, { status: 404 });
    }

    const departureFlight = pkg.departureFlight;
    const returnFlight = pkg.returnFlight;

    if (!departureFlight && !returnFlight) {
      return NextResponse.json({ error: 'No flights found' }, { status: 404 });
    }

    // Format date for ICS file (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    // Escape special characters for ICS format
    const escapeICS = (str: string) => {
      return str.replace(/\\/g, '\\\\')
                .replace(/;/g, '\\;')
                .replace(/,/g, '\\,')
                .replace(/\n/g, '\\n');
    };

    let icsContent = 'BEGIN:VCALENDAR\r\n';
    icsContent += 'VERSION:2.0\r\n';
    icsContent += 'PRODID:-//MAX TRAVEL//Booking System//EN\r\n';
    icsContent += 'CALSCALE:GREGORIAN\r\n';
    icsContent += 'METHOD:PUBLISH\r\n';

    // Add outbound flight
    if (departureFlight) {
      const departureTime = new Date(departureFlight.departureTime);
      const arrivalTime = new Date(departureFlight.arrivalTime);
      const flightNum = departureFlight.flightNumber.split('-')[0];

      icsContent += 'BEGIN:VEVENT\r\n';
      icsContent += `UID:${booking.reservationCode}-outbound@maxtravel.com\r\n`;
      icsContent += `DTSTAMP:${formatICSDate(new Date())}\r\n`;
      icsContent += `DTSTART:${formatICSDate(departureTime)}\r\n`;
      icsContent += `DTEND:${formatICSDate(arrivalTime)}\r\n`;
      icsContent += `SUMMARY:${escapeICS(`Flight ${flightNum} - ${departureFlight.departureAirport.code} to ${departureFlight.arrivalAirport.code}`)}\r\n`;
      icsContent += `DESCRIPTION:${escapeICS(`Outbound Flight\nBooking: ${booking.reservationCode}\nFrom: ${departureFlight.departureAirport.name}\nTo: ${departureFlight.arrivalAirport.name}\nReminder: Arrive at airport 2 hours before departure`)}\r\n`;
      icsContent += `LOCATION:${escapeICS(departureFlight.departureAirport.name)}\r\n`;
      icsContent += 'STATUS:CONFIRMED\r\n';
      icsContent += 'SEQUENCE:0\r\n';
      icsContent += 'BEGIN:VALARM\r\n';
      icsContent += 'TRIGGER:-PT2H\r\n';
      icsContent += 'ACTION:DISPLAY\r\n';
      icsContent += `DESCRIPTION:${escapeICS('Flight in 2 hours - Depart for airport')}\r\n`;
      icsContent += 'END:VALARM\r\n';
      icsContent += 'END:VEVENT\r\n';
    }

    // Add return flight
    if (returnFlight) {
      const departureTime = new Date(returnFlight.departureTime);
      const arrivalTime = new Date(returnFlight.arrivalTime);
      const flightNum = returnFlight.flightNumber.split('-')[0];

      icsContent += 'BEGIN:VEVENT\r\n';
      icsContent += `UID:${booking.reservationCode}-return@maxtravel.com\r\n`;
      icsContent += `DTSTAMP:${formatICSDate(new Date())}\r\n`;
      icsContent += `DTSTART:${formatICSDate(departureTime)}\r\n`;
      icsContent += `DTEND:${formatICSDate(arrivalTime)}\r\n`;
      icsContent += `SUMMARY:${escapeICS(`Flight ${flightNum} - ${returnFlight.departureAirport.code} to ${returnFlight.arrivalAirport.code}`)}\r\n`;
      icsContent += `DESCRIPTION:${escapeICS(`Return Flight\nBooking: ${booking.reservationCode}\nFrom: ${returnFlight.departureAirport.name}\nTo: ${returnFlight.arrivalAirport.name}\nReminder: Arrive at airport 2 hours before departure`)}\r\n`;
      icsContent += `LOCATION:${escapeICS(returnFlight.departureAirport.name)}\r\n`;
      icsContent += 'STATUS:CONFIRMED\r\n';
      icsContent += 'SEQUENCE:0\r\n';
      icsContent += 'BEGIN:VALARM\r\n';
      icsContent += 'TRIGGER:-PT2H\r\n';
      icsContent += 'ACTION:DISPLAY\r\n';
      icsContent += `DESCRIPTION:${escapeICS('Flight in 2 hours - Depart for airport')}\r\n`;
      icsContent += 'END:VALARM\r\n';
      icsContent += 'END:VEVENT\r\n';
    }

    icsContent += 'END:VCALENDAR\r\n';

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="flights-${booking.reservationCode}.ics"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Calendar generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar' },
      { status: 500 }
    );
  }
}
