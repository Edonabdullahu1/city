import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PUT update hotel description
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description } = body;

    const hotel = await prisma.hotel.update({
      where: { id },
      data: {
        description: description || ''
      }
    });

    return NextResponse.json(hotel);
  } catch (error) {
    console.error('Error updating hotel description:', error);
    return NextResponse.json(
      { error: 'Failed to update hotel description' },
      { status: 500 }
    );
  }
}