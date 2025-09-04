import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface ModificationRequest {
  bookingId: string;
  agentId: string;
  modificationType: 'DATE_CHANGE' | 'PASSENGER_CHANGE' | 'SERVICE_ADD' | 'SERVICE_REMOVE' | 'CANCELLATION';
  description: string;
  oldData: any;
  newData: any;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  notes?: string;
}

export class BookingModificationService {
  /**
   * Create a modification request
   */
  static async createModificationRequest({
    bookingId,
    agentId,
    modificationType,
    description,
    oldData,
    newData,
    notes
  }: Omit<ModificationRequest, 'status'>) {
    // Get the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        flights: true,
        hotels: true,
        transfers: true,
        excursions: true
      }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if booking can be modified
    if (booking.status === 'CANCELLED') {
      throw new Error('Cannot modify cancelled bookings');
    }

    // Create audit log entry
    const audit = await prisma.bookingAudit.create({
      data: {
        bookingId,
        userId: agentId,
        action: 'MODIFICATION_REQUEST',
        changes: {
          modificationType,
          description,
          oldData,
          newData
        },
        previousState: booking,
        newState: null,
        notes
      }
    });

    return {
      success: true,
      auditId: audit.id,
      message: 'Modification request created successfully'
    };
  }

  /**
   * Process a date change modification
   */
  static async processDateChange(
    bookingId: string,
    agentId: string,
    newDates: {
      checkIn?: Date;
      checkOut?: Date;
      departureDate?: Date;
      returnDate?: Date;
    }
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hotels: true,
        flights: true
      }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    const updates: any = {};

    // Update hotel dates if provided
    if (newDates.checkIn && newDates.checkOut) {
      updates.checkInDate = newDates.checkIn;
      updates.checkOutDate = newDates.checkOut;

      // Check hotel availability for new dates
      for (const hotelBooking of booking.hotels) {
        // Here you would check availability and update room bookings
        await prisma.hotelBooking.update({
          where: { id: hotelBooking.id },
          data: {
            checkIn: newDates.checkIn,
            checkOut: newDates.checkOut
          }
        });
      }
    }

    // Update flight dates if provided
    if (newDates.departureDate) {
      for (const flightBooking of booking.flights) {
        await prisma.flightBooking.update({
          where: { id: flightBooking.id },
          data: {
            departureDate: newDates.departureDate,
            returnDate: newDates.returnDate
          }
        });
      }
    }

    // Update main booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: updates
    });

    // Create audit log
    await prisma.bookingAudit.create({
      data: {
        bookingId,
        userId: agentId,
        action: 'DATE_CHANGE',
        changes: newDates,
        previousState: booking,
        newState: updatedBooking,
        notes: 'Date modification completed'
      }
    });

    return updatedBooking;
  }

  /**
   * Add a service to an existing booking
   */
  static async addService(
    bookingId: string,
    agentId: string,
    serviceType: 'FLIGHT' | 'HOTEL' | 'TRANSFER' | 'EXCURSION',
    serviceData: any
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    let newService;
    let priceIncrease = 0;

    switch (serviceType) {
      case 'TRANSFER':
        newService = await prisma.transferBooking.create({
          data: {
            ...serviceData,
            bookingId
          }
        });
        priceIncrease = serviceData.price;
        break;

      case 'EXCURSION':
        newService = await prisma.excursionBooking.create({
          data: {
            ...serviceData,
            bookingId
          }
        });
        priceIncrease = serviceData.totalPrice;
        break;

      default:
        throw new Error('Service type not supported for addition');
    }

    // Update booking total
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        totalAmount: {
          increment: priceIncrease
        }
      }
    });

    // Create audit log
    await prisma.bookingAudit.create({
      data: {
        bookingId,
        userId: agentId,
        action: 'SERVICE_ADDED',
        changes: {
          serviceType,
          serviceData: newService
        },
        previousState: booking,
        newState: updatedBooking,
        notes: `Added ${serviceType.toLowerCase()} service`
      }
    });

    return {
      booking: updatedBooking,
      newService
    };
  }

  /**
   * Remove a service from a booking
   */
  static async removeService(
    bookingId: string,
    agentId: string,
    serviceType: 'TRANSFER' | 'EXCURSION',
    serviceId: string
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    let priceDecrease = 0;

    switch (serviceType) {
      case 'TRANSFER':
        const transfer = await prisma.transferBooking.findUnique({
          where: { id: serviceId }
        });
        if (transfer) {
          priceDecrease = transfer.price;
          await prisma.transferBooking.delete({
            where: { id: serviceId }
          });
        }
        break;

      case 'EXCURSION':
        const excursion = await prisma.excursionBooking.findUnique({
          where: { id: serviceId }
        });
        if (excursion) {
          priceDecrease = excursion.totalPrice;
          await prisma.excursionBooking.delete({
            where: { id: serviceId }
          });
        }
        break;
    }

    // Update booking total
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        totalAmount: {
          decrement: priceDecrease
        }
      }
    });

    // Create audit log
    await prisma.bookingAudit.create({
      data: {
        bookingId,
        userId: agentId,
        action: 'SERVICE_REMOVED',
        changes: {
          serviceType,
          serviceId
        },
        previousState: booking,
        newState: updatedBooking,
        notes: `Removed ${serviceType.toLowerCase()} service`
      }
    });

    return updatedBooking;
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(
    bookingId: string,
    agentId: string,
    reason: string
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        flights: true,
        hotels: true,
        transfers: true,
        excursions: true
      }
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === 'CANCELLED') {
      throw new Error('Booking is already cancelled');
    }

    // Release hotel rooms
    for (const hotel of booking.hotels) {
      if (hotel.roomId) {
        // Release room availability
        // Implementation depends on your room availability system
      }
    }

    // Release flight seats if block seats
    for (const flight of booking.flights) {
      if (flight.isBlockSeat && flight.flightId) {
        await prisma.flight.update({
          where: { id: flight.flightId },
          data: {
            availableSeats: {
              increment: flight.passengers
            }
          }
        });
      }
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED' as BookingStatus,
        cancelledAt: new Date(),
        notes: `Cancelled by agent: ${reason}`
      }
    });

    // Create audit log
    await prisma.bookingAudit.create({
      data: {
        bookingId,
        userId: agentId,
        action: 'CANCEL',
        changes: { reason },
        previousState: booking,
        newState: updatedBooking,
        notes: `Booking cancelled: ${reason}`
      }
    });

    return updatedBooking;
  }

  /**
   * Get modification history for a booking
   */
  static async getModificationHistory(bookingId: string) {
    const history = await prisma.bookingAudit.findMany({
      where: { bookingId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return history;
  }

  /**
   * Calculate modification fees
   */
  static calculateModificationFee(
    modificationType: string,
    booking: any
  ): number {
    const baseFee = 2500; // €25 base modification fee
    const daysBefore = Math.ceil(
      (new Date(booking.checkInDate || booking.departureDate).getTime() - 
       new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    let fee = baseFee;

    // Add urgency fee for last-minute changes
    if (daysBefore < 7) {
      fee += 5000; // €50 additional for changes within 7 days
    } else if (daysBefore < 14) {
      fee += 2500; // €25 additional for changes within 14 days
    }

    // Add complexity fee based on modification type
    switch (modificationType) {
      case 'DATE_CHANGE':
        fee += 2500; // €25 for date changes
        break;
      case 'PASSENGER_CHANGE':
        fee += 5000; // €50 for passenger changes
        break;
      case 'SERVICE_ADD':
        fee += 1500; // €15 for adding services
        break;
      case 'SERVICE_REMOVE':
        fee += 1000; // €10 for removing services
        break;
      case 'CANCELLATION':
        // Cancellation fees are usually percentage-based
        fee = Math.round(booking.totalAmount * 0.15); // 15% cancellation fee
        break;
    }

    return fee;
  }
}