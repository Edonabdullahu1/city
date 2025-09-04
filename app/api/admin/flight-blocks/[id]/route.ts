import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if this is a group ID or individual flight ID
    // Only delete actual blocks, not templates
    const flightsToDelete = await prisma.flight.findMany({
      where: {
        OR: [
          { id },
          { blockGroupId: id }
        ],
        // Ensure we're only deleting blocks, not templates
        isBlockSeat: true,
        totalSeats: { gt: 0 }
      },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    });

    if (!flightsToDelete.length) {
      return NextResponse.json({ error: 'Flight block not found' }, { status: 404 });
    }

    // Check if any flight has bookings
    const hasBookings = flightsToDelete.some(flight => flight._count.bookings > 0);
    if (hasBookings) {
      return NextResponse.json({ 
        error: 'Cannot delete flight block with existing bookings' 
      }, { status: 400 });
    }

    // Delete all flights in the group (only blocks, not templates)
    await prisma.flight.deleteMany({
      where: {
        OR: [
          { id },
          { blockGroupId: id }
        ],
        // Ensure we're only deleting blocks, not templates
        isBlockSeat: true,
        totalSeats: { gt: 0 }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Flight block delete error:', error);
    return NextResponse.json({ error: 'Failed to delete flight block' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if this is a group update
    if (body.isGroup) {
      const {
        outboundData,
        returnData
      } = body;

      // Update outbound flight
      if (outboundData) {
        // Get current flight to calculate seat changes
        const currentFlight = await prisma.flight.findUnique({
          where: { id: outboundData.id }
        });
        
        if (currentFlight) {
          const newTotalSeats = outboundData.totalSeats !== undefined ? parseInt(outboundData.totalSeats.toString()) : currentFlight.totalSeats;
          
          // Calculate how many seats are actually booked by counting flight bookings
          const actualBookings = await prisma.flightBooking.aggregate({
            where: { flightId: currentFlight.id },
            _sum: { passengers: true }
          });
          const bookedSeats = actualBookings._sum.passengers || 0;
          
          // New available seats = new total - actual booked seats (but can't be less than 0)
          const newAvailableSeats = Math.max(0, newTotalSeats - bookedSeats);
          
          // Validate that new total seats is not less than booked seats
          if (newTotalSeats < bookedSeats) {
            return NextResponse.json({ 
              error: `Cannot set total seats to ${newTotalSeats}. There are already ${bookedSeats} booked seats.` 
            }, { status: 400 });
          }
          
          await prisma.flight.update({
            where: { id: outboundData.id },
            data: {
              departureTime: outboundData.departureTime ? new Date(outboundData.departureTime) : undefined,
              arrivalTime: outboundData.arrivalTime ? new Date(outboundData.arrivalTime) : undefined,
              totalSeats: newTotalSeats,
              availableSeats: newAvailableSeats,
              pricePerSeat: outboundData.pricePerSeat !== undefined ? Math.round(parseFloat(outboundData.pricePerSeat.toString()) * 100) : undefined
            }
          });
        }
      }

      // Update return flight if exists
      if (returnData) {
        // Get current flight to calculate seat changes
        const currentReturnFlight = await prisma.flight.findUnique({
          where: { id: returnData.id }
        });
        
        if (currentReturnFlight) {
          const newTotalSeats = returnData.totalSeats !== undefined ? parseInt(returnData.totalSeats.toString()) : currentReturnFlight.totalSeats;
          
          // Calculate how many seats are actually booked by counting flight bookings
          const actualReturnBookings = await prisma.flightBooking.aggregate({
            where: { flightId: currentReturnFlight.id },
            _sum: { passengers: true }
          });
          const bookedSeats = actualReturnBookings._sum.passengers || 0;
          
          // New available seats = new total - actual booked seats (but can't be less than 0)
          const newAvailableSeats = Math.max(0, newTotalSeats - bookedSeats);
          
          // Validate that new total seats is not less than booked seats
          if (newTotalSeats < bookedSeats) {
            return NextResponse.json({ 
              error: `Cannot set total seats to ${newTotalSeats}. There are already ${bookedSeats} booked seats on return flight.` 
            }, { status: 400 });
          }
          
          await prisma.flight.update({
            where: { id: returnData.id },
            data: {
              departureTime: returnData.departureTime ? new Date(returnData.departureTime) : undefined,
              arrivalTime: returnData.arrivalTime ? new Date(returnData.arrivalTime) : undefined,
              totalSeats: newTotalSeats,
              availableSeats: newAvailableSeats,
              pricePerSeat: returnData.pricePerSeat !== undefined ? Math.round(parseFloat(returnData.pricePerSeat.toString()) * 100) : undefined
            }
          });
        }
      }

      return NextResponse.json({ success: true });
    } else {
      // Single flight update
      const {
        departureTime,
        arrivalTime,
        totalSeats,
        availableSeats,
        pricePerSeat
      } = body;

      // Get current flight to calculate seat changes
      const currentFlight = await prisma.flight.findUnique({
        where: { id }
      });

      if (!currentFlight) {
        return NextResponse.json({ error: 'Flight block not found' }, { status: 404 });
      }

      const updateData: any = {};
      if (departureTime) updateData.departureTime = new Date(departureTime);
      if (arrivalTime) updateData.arrivalTime = new Date(arrivalTime);
      if (pricePerSeat !== undefined) updateData.pricePerSeat = Math.round(parseFloat(pricePerSeat.toString()) * 100);
      
      // Handle seat updates properly
      if (totalSeats !== undefined) {
        const newTotalSeats = parseInt(totalSeats.toString());
        updateData.totalSeats = newTotalSeats;
        
        // Calculate how many seats are actually booked by counting flight bookings
        const actualBookings = await prisma.flightBooking.aggregate({
          where: { flightId: currentFlight.id },
          _sum: { passengers: true }
        });
        const bookedSeats = actualBookings._sum.passengers || 0;
        
        // If availableSeats is not explicitly provided, calculate based on actual bookings
        if (availableSeats === undefined) {
          // Validate that new total seats is not less than booked seats
          if (newTotalSeats < bookedSeats) {
            return NextResponse.json({ 
              error: `Cannot set total seats to ${newTotalSeats}. There are already ${bookedSeats} booked seats.` 
            }, { status: 400 });
          }
          
          // New available seats = new total - actual booked seats (but can't be less than 0)
          updateData.availableSeats = Math.max(0, newTotalSeats - bookedSeats);
        } else {
          const newAvailableSeats = parseInt(availableSeats.toString());
          // Validate that available seats + booked seats doesn't exceed total seats
          if (newAvailableSeats + bookedSeats > newTotalSeats) {
            return NextResponse.json({ 
              error: `Available seats (${newAvailableSeats}) + booked seats (${bookedSeats}) cannot exceed total seats (${newTotalSeats}).` 
            }, { status: 400 });
          }
          updateData.availableSeats = newAvailableSeats;
        }
      } else if (availableSeats !== undefined) {
        updateData.availableSeats = parseInt(availableSeats.toString());
      }

      const flightBlock = await prisma.flight.update({
        where: { id },
        data: updateData,
        include: {
          airline: true,
          departureAirport: {
            include: { city: true }
          },
          arrivalAirport: {
            include: { city: true }
          }
        }
      });

      return NextResponse.json(flightBlock);
    }
  } catch (error) {
    console.error('Flight block update error:', error);
    return NextResponse.json({ error: 'Failed to update flight block' }, { status: 500 });
  }
}