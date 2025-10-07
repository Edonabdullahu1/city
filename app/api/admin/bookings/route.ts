import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { BookingStatus } from '@prisma/client';
import { sendBookingConfirmationEmail, sendCancellationEmail, sendPaymentReceivedEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const status = searchParams.get('status') as BookingStatus | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { reservationCode: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (startDate) {
      where.checkInDate = {
        gte: new Date(startDate)
      };
    }

    if (endDate) {
      where.checkOutDate = {
        lte: new Date(endDate)
      };
    }

    // Fetch bookings with pagination
    const [bookings, totalCount] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          flights: true,
          hotels: true,
          transfers: true,
          excursions: true,
          packages: {
            include: {
              selectedHotel: {
                select: {
                  id: true,
                  name: true,
                  city: {
                    select: {
                      name: true,
                      country: {
                        select: {
                          name: true
                        }
                      }
                    }
                  }
                }
              },
              package: {
                select: {
                  id: true,
                  name: true,
                  hotel: {
                    select: {
                      id: true,
                      name: true,
                      city: {
                        select: {
                          name: true,
                          country: {
                            select: {
                              name: true
                            }
                          }
                        }
                      }
                    }
                  },
                  departureFlight: {
                    select: {
                      id: true,
                      flightNumber: true,
                      departureTime: true,
                      arrivalTime: true,
                      departureAirport: {
                        select: {
                          code: true,
                          name: true
                        }
                      },
                      arrivalAirport: {
                        select: {
                          code: true,
                          name: true
                        }
                      }
                    }
                  },
                  returnFlight: {
                    select: {
                      id: true,
                      flightNumber: true,
                      departureTime: true,
                      arrivalTime: true,
                      departureAirport: {
                        select: {
                          code: true,
                          name: true
                        }
                      },
                      arrivalAirport: {
                        select: {
                          code: true,
                          name: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.booking.count({ where })
    ]);

    // Calculate statistics
    const [totalBookings, pendingCount, confirmedCount, totalRevenue] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: BookingStatus.SOFT } }),
      prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
      prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.PAID] } }
      })
    ]);

    return NextResponse.json({
      bookings,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        current: page,
        limit
      },
      statistics: {
        totalBookings,
        pendingCount,
        confirmedCount,
        totalRevenue: (totalRevenue._sum.totalAmount || 0) / 100 // Convert cents to currency
      }
    });

  } catch (error) {
    console.error('Admin bookings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes, passengerDetails } = body;

    if (!id) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

    // Get current booking to check for status changes
    const currentBooking = await prisma.booking.findUnique({
      where: { id },
      select: { status: true }
    });

    const oldStatus = currentBooking?.status;
    const statusChanged = status && oldStatus && status !== oldStatus;

    // If cancelling a booking, release the seats back to the flights
    if (status === 'CANCELLED') {
      // Get current booking with flight details
      const currentBooking = await prisma.booking.findUnique({
        where: { id },
        include: {
          flights: true
        }
      });

      if (currentBooking && currentBooking.status !== 'CANCELLED' && currentBooking.flights.length > 0) {
        // Release seats for each flight booking
        for (const flightBooking of currentBooking.flights) {
          await prisma.flight.update({
            where: { id: flightBooking.flightId },
            data: {
              availableSeats: {
                increment: flightBooking.passengers
              }
            }
          });
        }
      }
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (passengerDetails !== undefined) updateData.passengerDetails = passengerDetails;

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        packages: {
          include: {
            package: {
              include: {
                city: true
              }
            }
          }
        }
      }
    });

    // Send emails based on status changes
    if (statusChanged && updatedBooking.customerEmail) {
      const emailData = {
        to: updatedBooking.customerEmail,
        bookingCode: updatedBooking.reservationCode,
        customerName: updatedBooking.customerName || 'Customer',
        checkInDate: updatedBooking.checkInDate?.toISOString() || new Date().toISOString(),
        checkOutDate: updatedBooking.checkOutDate?.toISOString() || new Date().toISOString(),
        destination: updatedBooking.packages[0]?.package?.destination?.name || 'Your Destination',
        totalAmount: updatedBooking.totalAmount,
        bookingId: updatedBooking.id,
      };

      try {
        if (status === 'CONFIRMED') {
          await sendBookingConfirmationEmail(emailData);
          console.log(`[EMAIL] Booking confirmation sent to ${updatedBooking.customerEmail}`);
        } else if (status === 'PAID') {
          await sendPaymentReceivedEmail({
            to: emailData.to,
            bookingCode: emailData.bookingCode,
            customerName: emailData.customerName,
            totalAmount: emailData.totalAmount,
          });
          console.log(`[EMAIL] Payment received email sent to ${updatedBooking.customerEmail}`);
        } else if (status === 'CANCELLED') {
          await sendCancellationEmail({
            to: emailData.to,
            bookingCode: emailData.bookingCode,
            customerName: emailData.customerName,
            reason: notes || 'Booking cancelled by admin',
          });
          console.log(`[EMAIL] Cancellation email sent to ${updatedBooking.customerEmail}`);
        }
      } catch (emailError) {
        console.error('[EMAIL] Failed to send status change email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(updatedBooking);

  } catch (error) {
    console.error('Admin booking update error:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

    // Soft delete by setting status to CANCELLED
    const cancelledBooking = await prisma.booking.update({
      where: { id },
      data: { 
        status: BookingStatus.CANCELLED,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Booking cancelled successfully',
      booking: cancelledBooking 
    });

  } catch (error) {
    console.error('Admin booking delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete booking' },
      { status: 500 }
    );
  }
}