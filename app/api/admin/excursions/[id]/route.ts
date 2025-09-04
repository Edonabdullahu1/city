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

    const excursion = await prisma.excursion.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          select: {
            id: true,
            excursionDate: true,
            participants: true,
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

    if (!excursion) {
      return NextResponse.json({ error: 'Excursion not found' }, { status: 404 });
    }

    return NextResponse.json(excursion);

  } catch (error) {
    console.error('Excursion fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch excursion' },
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
      title,
      description,
      location,
      duration,
      price,
      capacity,
      meetingPoint,
      includes,
      excludes,
      active
    } = body;

    // Update the excursion
    const updatedExcursion = await prisma.excursion.update({
      where: { id: params.id },
      data: {
        title,
        description,
        location,
        duration: duration ? parseInt(duration) : undefined,
        price: price ? parseInt(price) : undefined,
        capacity: capacity ? parseInt(capacity) : undefined,
        meetingPoint,
        includes: includes || [],
        excludes: excludes || [],
        active: active !== undefined ? Boolean(active) : undefined
      }
    });

    return NextResponse.json(updatedExcursion);

  } catch (error) {
    console.error('Excursion update error:', error);
    return NextResponse.json(
      { error: 'Failed to update excursion' },
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

    // Check if excursion has bookings
    const bookingCount = await prisma.excursionBooking.count({
      where: {
        excursionId: params.id,
        booking: {
          status: {
            in: ['SOFT', 'CONFIRMED', 'PAID']
          }
        }
      }
    });

    if (bookingCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete excursion with ${bookingCount} active bookings` },
        { status: 400 }
      );
    }

    // Soft delete by marking as inactive
    const excursion = await prisma.excursion.update({
      where: { id: params.id },
      data: { active: false }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Excursion deactivated successfully',
      excursion
    });

  } catch (error) {
    console.error('Excursion delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete excursion' },
      { status: 500 }
    );
  }
}