import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          select: {
            id: true,
            transferDate: true,
            passengers: true,
            booking: {
              select: {
                id: true,
                reservationCode: true,
                status: true,
                customerName: true
              }
            }
          }
        }
      }
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    return NextResponse.json(transfer);

  } catch (error) {
    console.error('Transfer fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfer' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      fromLocation,
      toLocation,
      vehicleType,
      capacity,
      price,
      duration,
      description,
      active
    } = body;

    // Update the transfer
    const updatedTransfer = await prisma.transfer.update({
      where: { id: params.id },
      data: {
        name,
        fromLocation,
        toLocation,
        vehicleType,
        capacity: capacity ? parseInt(capacity) : undefined,
        price: price ? parseInt(price) : undefined,
        duration: duration ? parseInt(duration) : undefined,
        description: description !== undefined ? description : undefined,
        active: active !== undefined ? Boolean(active) : undefined
      }
    });

    return NextResponse.json(updatedTransfer);

  } catch (error) {
    console.error('Transfer update error:', error);
    return NextResponse.json(
      { error: 'Failed to update transfer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if transfer has bookings
    const bookingCount = await prisma.transferBooking.count({
      where: {
        transferId: params.id,
        booking: {
          status: {
            in: ['SOFT', 'CONFIRMED', 'PAID']
          }
        }
      }
    });

    if (bookingCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete transfer with ${bookingCount} active bookings` },
        { status: 400 }
      );
    }

    // Soft delete by marking as inactive
    const transfer = await prisma.transfer.update({
      where: { id: params.id },
      data: { active: false }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Transfer deactivated successfully',
      transfer
    });

  } catch (error) {
    console.error('Transfer delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transfer' },
      { status: 500 }
    );
  }
}