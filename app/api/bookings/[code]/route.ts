import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BookingService } from '@/lib/services/bookingService';
import { withErrorHandler } from '@/lib/utils/errorHandler';
import prisma from '@/lib/prisma';

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) => {
  const session = await getServerSession(authOptions);
  const { code } = await params;
  const reservationCode = code;
  
  // Get booking with comprehensive nested relationships
  const booking = await prisma.booking.findUnique({
    where: { reservationCode },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      flights: {
        include: {
          flight: {
            include: {
              airline: true,
              departureAirport: true,
              arrivalAirport: true,
              originCity: true,
              destinationCity: true
            }
          }
        }
      },
      hotels: {
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
      },
      transfers: {
        include: {
          transfer: true
        }
      },
      excursions: {
        include: {
          excursion: true
        }
      },
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
  });

  if (!booking) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Booking not found',
        message: 'No booking found with this reservation code'
      },
      { status: 404 }
    );
  }

  // Check if soft booking has expired and auto-cancel if needed
  if (
    booking.status === 'SOFT' &&
    booking.expiresAt &&
    booking.expiresAt < new Date()
  ) {
    // Auto-cancel expired soft bookings
    await prisma.booking.update({
      where: { reservationCode },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    // Update the booking object to reflect the new status
    booking.status = 'CANCELLED';
  }

  // Require authentication to view bookings
  if (!session?.user) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to view bookings'
      },
      { status: 401 }
    );
  }

  // Check if user has access to this specific booking
  const hasUserAccess = (
    booking.userId === session.user.id || 
    session.user.role === 'ADMIN' || 
    session.user.role === 'AGENT'
  );

  if (!hasUserAccess) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to view this booking'
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    booking
  });
});