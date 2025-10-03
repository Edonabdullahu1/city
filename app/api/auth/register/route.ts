import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient, UserRole } from '@prisma/client';
import { withErrorHandler, ValidationError, ConflictError } from '@/lib/utils/errorHandler';

const prisma = new PrismaClient();

// Validation schema for registration
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phone: z.string().optional().refine((val) => !val || /^\+?[\d\s\-\(\)]+$/.test(val), {
    message: 'Invalid phone number format'
  }),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // Validate input
  const validatedFields = registerSchema.safeParse(body);
  if (!validatedFields.success) {
    throw new ValidationError('Invalid registration data', validatedFields.error.flatten().fieldErrors);
  }

  const { email, password, firstName, lastName, phone } = validatedFields.data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new ConflictError('A user with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || null,
      role: UserRole.USER, // Default role
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  await prisma.$disconnect();

  return NextResponse.json(
    {
      success: true,
      message: 'User registered successfully',
      user,
    },
    { status: 201 }
  );
});