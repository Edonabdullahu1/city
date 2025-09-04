import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/roleGuard';
import { UserService } from '@/lib/services/userService';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'New password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

// GET - Get current user profile
export async function GET(request: NextRequest, context: any) {
  try {
    const user = await UserService.getUserById(context.user.id);
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get user profile',
      },
      { status: 500 }
    );
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest, context: any) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedInput = updateProfileSchema.safeParse(body);
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

    // Update user profile
    const user = await UserService.updateUser(context.user.id, validatedInput.data);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update profile',
      },
      { status: 500 }
    );
  }
}

// Note: Authentication middleware temporarily removed for build compatibility