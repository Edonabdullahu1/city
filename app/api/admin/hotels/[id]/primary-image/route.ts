import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { primaryImage } = await request.json();

    const hotel = await prisma.hotel.update({
      where: { id: params.id },
      data: { primaryImage }
    });

    return NextResponse.json({ success: true, primaryImage: hotel.primaryImage });
  } catch (error) {
    console.error('Error setting primary image:', error);
    return NextResponse.json(
      { error: 'Failed to set primary image' },
      { status: 500 }
    );
  }
}