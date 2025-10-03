import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flightId = searchParams.get('flightId');

    if (!flightId) {
      return NextResponse.json(
        { error: 'Flight ID is required' },
        { status: 400 }
      );
    }

    // Get flight with its bookings
    const flight = await prisma.flight.findUnique({
      where: {
        id: flightId
      },
      include: {
        bookings: {
          where: {
            booking: {
              status: {
                in: ['SOFT', 'CONFIRMED', 'PAID']
              }
            }
          },
          include: {
            booking: {
              include: {
                hotels: {
                  include: {
                    hotel: true
                  }
                },
                packages: {
                  include: {
                    package: {
                      include: {
                        hotel: true
                      }
                    },
                    selectedHotel: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!flight) {
      return NextResponse.json(
        { error: 'Flight not found' },
        { status: 404 }
      );
    }

    // Sort bookings by reservation code
    const sortedBookings = flight.bookings.sort((a, b) => {
      const codeA = a.booking?.reservationCode || '';
      const codeB = b.booking?.reservationCode || '';
      return codeA.localeCompare(codeB);
    });

    // Extract passenger details from bookings
    const passengers: any[] = [];

    sortedBookings.forEach(fb => {
      const booking = fb.booking;

      if (!booking) return;

      // Get hotel name from either hotel bookings or package
      let hotelName = null;

      // First try to get from direct hotel bookings
      if (booking.hotels && booking.hotels.length > 0) {
        hotelName = booking.hotels[0].hotel?.name;
      }

      // If no hotel booking, try to get from package's selected hotel or default hotel
      if (!hotelName && booking.packages && booking.packages.length > 0) {
        const packageBooking = booking.packages[0];
        // Prioritize selectedHotel if available
        if (packageBooking.selectedHotel) {
          hotelName = packageBooking.selectedHotel.name;
        } else if (packageBooking.package?.hotel) {
          hotelName = packageBooking.package.hotel.name;
        }
      }

      // Extract passenger details from passengerDetails JSON field
      if (booking.passengerDetails) {
        const passengerData = booking.passengerDetails as any;

        // Add adults
        if (passengerData.adults && Array.isArray(passengerData.adults)) {
          passengerData.adults.forEach((adult: any) => {
            passengers.push({
              title: adult.title || 'Mr',
              firstName: adult.firstName || '',
              lastName: adult.lastName || '',
              dateOfBirth: adult.dateOfBirth || '',
              bookingNumber: booking.reservationCode,
              hotel: hotelName || '-',
              type: 'Adult'
            });
          });
        }

        // Add children
        if (passengerData.children && Array.isArray(passengerData.children)) {
          passengerData.children.forEach((child: any) => {
            passengers.push({
              title: child.title || 'Miss/Master',
              firstName: child.firstName || '',
              lastName: child.lastName || '',
              dateOfBirth: child.dateOfBirth || '',
              bookingNumber: booking.reservationCode,
              hotel: hotelName || '-',
              type: 'Child'
            });
          });
        }

        // Add infants
        if (passengerData.infants && Array.isArray(passengerData.infants)) {
          passengerData.infants.forEach((infant: any) => {
            passengers.push({
              title: infant.title || 'Infant',
              firstName: infant.firstName || '',
              lastName: infant.lastName || '',
              dateOfBirth: infant.dateOfBirth || '',
              bookingNumber: booking.reservationCode,
              hotel: hotelName || '-',
              type: 'Infant'
            });
          });
        }
      } else {
        // Fallback: if no passengerDetails, create entries based on passenger count
        const totalPassengers = fb.passengers || booking.adults + booking.children + booking.infants;

        for (let i = 0; i < totalPassengers; i++) {
          passengers.push({
            title: i === 0 ? 'Mr/Ms' : 'Passenger',
            firstName: booking.customerName?.split(' ')[0] || 'N/A',
            lastName: booking.customerName?.split(' ').slice(1).join(' ') || 'N/A',
            bookingNumber: booking.reservationCode,
            hotel: hotelName,
            type: i < booking.adults ? 'Adult' : (i < booking.adults + booking.children ? 'Child' : 'Infant')
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      passengers
    });

  } catch (error) {
    console.error('Error fetching PNL data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PNL data' },
      { status: 500 }
    );
  }
}
