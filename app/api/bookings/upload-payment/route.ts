import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bookingId = formData.get('bookingId') as string;
    const reservationCode = formData.get('reservationCode') as string;

    if (!file || !bookingId || !reservationCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify booking exists and user has access
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user owns the booking (or is admin)
    if (booking.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'payments');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${reservationCode}_${timestamp}.${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Store file path in database (update booking notes or create a separate table)
    const fileUrl = `/uploads/payments/${fileName}`;

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        notes: booking.notes
          ? `${booking.notes}\n\nPayment proof uploaded: ${fileUrl}`
          : `Payment proof uploaded: ${fileUrl}`
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Payment confirmation uploaded successfully',
      fileUrl
    });

  } catch (error) {
    console.error('Payment upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload payment confirmation' },
      { status: 500 }
    );
  }
}
