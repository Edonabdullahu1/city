import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const airlines = await prisma.airline.findMany({
      include: {
        _count: {
          select: { flights: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ airlines });
  } catch (error) {
    console.error('Airlines fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch airlines' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, iataCode, active = true } = await request.json();

    // Validate required fields
    if (!name || !iataCode) {
      return NextResponse.json({ error: 'Name and IATA code are required' }, { status: 400 });
    }

    // Check if IATA code already exists
    const existing = await prisma.airline.findUnique({
      where: { iataCode: iataCode.toUpperCase() }
    });

    if (existing) {
      return NextResponse.json({ error: 'Airline with this IATA code already exists' }, { status: 409 });
    }

    const airline = await prisma.airline.create({
      data: {
        name,
        iataCode: iataCode.toUpperCase(),
        active
      }
    });

    return NextResponse.json(airline);
  } catch (error) {
    console.error('Airline create error:', error);
    return NextResponse.json({ error: 'Failed to create airline' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, iataCode, active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Airline ID is required' }, { status: 400 });
    }

    // Check if new IATA code is already taken by another airline
    if (iataCode) {
      const existing = await prisma.airline.findFirst({
        where: {
          iataCode: iataCode.toUpperCase(),
          NOT: { id }
        }
      });

      if (existing) {
        return NextResponse.json({ error: 'IATA code already in use' }, { status: 409 });
      }
    }

    const airline = await prisma.airline.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(iataCode && { iataCode: iataCode.toUpperCase() }),
        ...(active !== undefined && { active })
      }
    });

    return NextResponse.json(airline);
  } catch (error) {
    console.error('Airline update error:', error);
    return NextResponse.json({ error: 'Failed to update airline' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Airline ID is required' }, { status: 400 });
    }

    // Check if airline has flights
    const airline = await prisma.airline.findUnique({
      where: { id },
      include: {
        _count: {
          select: { flights: true }
        }
      }
    });

    if (!airline) {
      return NextResponse.json({ error: 'Airline not found' }, { status: 404 });
    }

    if (airline._count.flights > 0) {
      return NextResponse.json({ error: 'Cannot delete airline with existing flights' }, { status: 400 });
    }

    await prisma.airline.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Airline delete error:', error);
    return NextResponse.json({ error: 'Failed to delete airline' }, { status: 500 });
  }
}