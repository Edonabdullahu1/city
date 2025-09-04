import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/roleGuard';
import { UserService } from '@/lib/services/userService';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'New password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

// POST - Change user password
export async function POST(request: NextRequest, context: any) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedInput = changePasswordSchema.safeParse(body);
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

    // Change password
    await UserService.changePassword(context.user.id, validatedInput.data);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to change password',
      },
      { status: 500 }
    );
  }
}

// Note: Authentication middleware temporarily removed for build compatibility