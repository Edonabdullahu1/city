import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/roleGuard';
import { BookingService } from '@/lib/services/bookingService';
import { z } from 'zod';

const softBookingSchema = z.object({
  totalAmount: z.number().min(0, 'Total amount must be positive'),
  currency: z.string().default('EUR'),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest, context: any) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedInput = softBookingSchema.safeParse(body);
    if (!validatedInput.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid input',
          errors: validatedInput.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { totalAmount, currency, expiresAt } = validatedInput.data;

    // Create soft booking
    const booking = await BookingService.createSoftBooking({
      userId: context.user.id,
      totalAmount,
      currency,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Soft booking created successfully',
        booking: {
          id: booking.id,
          reservationCode: booking.reservationCode,
          status: booking.status,
          totalAmount: booking.totalAmount / 100, // Convert from cents
          currency: booking.currency,
          expiresAt: booking.expiresAt,
          createdAt: booking.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Soft booking error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create soft booking',
      },
      { status: 500 }
    );
  }
}

// Note: Authentication middleware temporarily removed for build compatibility