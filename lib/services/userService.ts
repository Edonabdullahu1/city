import { PrismaClient, User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const prisma = new PrismaClient();

// Input validation schemas
export const createUserSchema = z.object({
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
  role: z.nativeEnum(UserRole).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'New password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// User without password for safe responses
export type SafeUser = Omit<User, 'password'>;

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(input: CreateUserInput): Promise<SafeUser> {
    // Validate input
    const validatedInput = createUserSchema.parse(input);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedInput.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedInput.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedInput.email.toLowerCase(),
        password: hashedPassword,
        firstName: validatedInput.firstName,
        lastName: validatedInput.lastName,
        role: validatedInput.role || UserRole.USER,
      },
    });

    // Return user without password
    const { password, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    const { password, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) return null;

    const { password, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Get user by email (including password for authentication)
   */
  static async getUserByEmailWithPassword(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Update user profile
   */
  static async updateUser(id: string, input: UpdateUserInput): Promise<SafeUser> {
    // Validate input
    const validatedInput = updateUserSchema.parse(input);

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: validatedInput,
    });

    // Return user without password
    const { password, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Change user password
   */
  static async changePassword(id: string, input: ChangePasswordInput): Promise<boolean> {
    // Validate input
    const validatedInput = changePasswordSchema.parse(input);

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      validatedInput.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(validatedInput.newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword },
    });

    return true;
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(): Promise<SafeUser[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Return users without passwords
    return users.map(({ password, ...user }) => user);
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: UserRole): Promise<SafeUser[]> {
    const users = await prisma.user.findMany({
      where: { role },
      orderBy: { createdAt: 'desc' },
    });

    // Return users without passwords
    return users.map(({ password, ...user }) => user);
  }

  /**
   * Update user role (admin only)
   */
  static async updateUserRole(id: string, role: UserRole): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });

    // Return user without password
    const { password, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Delete user (admin only)
   */
  static async deleteUser(id: string): Promise<boolean> {
    // Check if user has bookings
    const userBookings = await prisma.booking.count({
      where: { userId: id },
    });

    if (userBookings > 0) {
      throw new Error('Cannot delete user with existing bookings');
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Get user statistics (admin only)
   */
  static async getUserStats() {
    const [totalUsers, adminCount, agentCount, userCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.ADMIN } }),
      prisma.user.count({ where: { role: UserRole.AGENT } }),
      prisma.user.count({ where: { role: UserRole.USER } }),
    ]);

    return {
      totalUsers,
      adminCount,
      agentCount,
      userCount,
    };
  }
}