import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate unique 5-digit hotel ID
    let hotelId: number;
    let isUnique = false;
    
    while (!isUnique) {
      // Generate random 5-digit number (10000-99999)
      hotelId = Math.floor(10000 + Math.random() * 90000);
      
      // Check if it's unique
      const existing = await prisma.hotel.findUnique({
        where: { hotelId }
      });
      
      if (!existing) {
        isUnique = true;
      }
    }

    return NextResponse.json({ hotelId });
  } catch (error) {
    console.error('Error generating hotel ID:', error);
    return NextResponse.json(
      { error: 'Failed to generate hotel ID' },
      { status: 500 }
    );
  }
}