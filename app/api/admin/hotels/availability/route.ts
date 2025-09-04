import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RoomAvailabilityService } from '@/lib/services/roomAvailability';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'AGENT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const roomId = searchParams.get('roomId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!roomId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const calendar = await RoomAvailabilityService.getAvailabilityCalendar(
      roomId,
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json({ calendar });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, roomId, startDate, endDate, ...params } = body;

    if (!action || !roomId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    switch (action) {
      case 'initialize':
        await RoomAvailabilityService.initializeAvailability(
          roomId,
          start,
          end,
          params.totalRooms
        );
        break;

      case 'updatePricing':
        await RoomAvailabilityService.updatePricing(
          roomId,
          start,
          end,
          params.priceOverride
        );
        break;

      case 'setBlocked':
        await RoomAvailabilityService.setBlockedStatus(
          roomId,
          start,
          end,
          params.isBlocked
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 }
    );
  }
}