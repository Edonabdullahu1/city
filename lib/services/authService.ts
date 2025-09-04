import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserService, type SafeUser } from './userService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Input validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
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
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export interface AuthResult {
  success: boolean;
  user?: SafeUser;
  message?: string;
}

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async authenticateUser(input: LoginInput): Promise<AuthResult> {
    try {
      // Validate input
      const validatedInput = loginSchema.parse(input);

      // Find user with password
      const user = await UserService.getUserByEmailWithPassword(validatedInput.email);
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(validatedInput.password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Return success with user data (excluding password)
      const { password, ...safeUser } = user;
      return {
        success: true,
        user: safeUser,
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        message: 'Authentication failed',
      };
    }
  }

  /**
   * Register new user
   */
  static async registerUser(input: RegisterInput): Promise<AuthResult> {
    try {
      // Validate input
      const validatedInput = registerSchema.parse(input);

      // Create user using UserService
      const user = await UserService.createUser(validatedInput);

      return {
        success: true,
        user,
        message: 'User registered successfully',
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof z.ZodError) {
        return {
          success: false,
          message: 'Invalid input data',
        };
      }

      if (error instanceof Error) {
        return {
          success: false,
          message: error.message,
        };
      }

      return {
        success: false,
        message: 'Registration failed',
      };
    }
  }

  /**
   * Validate email format and check availability
   */
  static async isEmailAvailable(email: string): Promise<boolean> {
    try {
      const user = await UserService.getUserByEmail(email);
      return !user;
    } catch (error) {
      console.error('Email validation error:', error);
      return false;
    }
  }

  /**
   * Generate password hash
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Log user activity (for auditing)
   */
  static async logActivity(
    userId: string,
    action: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      // This could be extended to use a separate audit log table
      console.log(`User Activity - ID: ${userId}, Action: ${action}, Details:`, details);
      
      // For now, we'll just log to console
      // In production, you might want to store this in a database table
    } catch (error) {
      console.error('Activity logging error:', error);
      // Don't throw error for logging failures
    }
  }

  /**
   * Get user login history (placeholder for future implementation)
   */
  static async getUserLoginHistory(userId: string, limit: number = 10) {
    // This would require a separate login_history table
    // For now, return empty array
    return [];
  }

  /**
   * Check if password has been recently used (placeholder for future implementation)
   */
  static async isPasswordRecentlyUsed(userId: string, newPassword: string): Promise<boolean> {
    // This would require storing password history
    // For now, return false (password can be used)
    return false;
  }

  /**
   * Generate secure random token (for password reset, email verification, etc.)
   */
  static generateSecureToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Clean up expired sessions or tokens (placeholder for future implementation)
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      // Clean up expired NextAuth sessions
      const expiredSessions = await prisma.session.findMany({
        where: {
          expires: {
            lte: new Date(),
          },
        },
      });

      if (expiredSessions.length > 0) {
        await prisma.session.deleteMany({
          where: {
            expires: {
              lte: new Date(),
            },
          },
        });
        
        console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
      }
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }
}