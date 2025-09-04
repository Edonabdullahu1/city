import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExcursionService } from '@/lib/services/excursionService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'AGENT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const excursions = await ExcursionService.getAllExcursions(includeInactive);

    return NextResponse.json({ excursions });
  } catch (error) {
    console.error('Error fetching excursions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch excursions' },
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
    
    const excursion = await ExcursionService.createExcursion(body);

    return NextResponse.json({ excursion });
  } catch (error) {
    console.error('Error creating excursion:', error);
    return NextResponse.json(
      { error: 'Failed to create excursion' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Excursion ID is required' },
        { status: 400 }
      );
    }

    const excursion = await ExcursionService.updateExcursion(id, data);

    return NextResponse.json({ excursion });
  } catch (error) {
    console.error('Error updating excursion:', error);
    return NextResponse.json(
      { error: 'Failed to update excursion' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Excursion ID is required' },
        { status: 400 }
      );
    }

    const excursion = await ExcursionService.deleteExcursion(id);

    return NextResponse.json({ success: true, excursion });
  } catch (error) {
    console.error('Error deleting excursion:', error);
    return NextResponse.json(
      { error: 'Failed to delete excursion' },
      { status: 500 }
    );
  }
}