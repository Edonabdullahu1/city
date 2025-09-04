import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from '@prisma/client';

/**
 * Role-based route protection for API routes
 */
export async function withAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  allowedRoles?: UserRole[]
) {
  return async (request: NextRequest, context?: any) => {
    try {
      // Get token from request
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      // Check if user is authenticated
      if (!token) {
        return NextResponse.json(
          { success: false, message: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check role permissions if specified
      if (allowedRoles && allowedRoles.length > 0) {
        const userRole = token.role as UserRole;
        if (!allowedRoles.includes(userRole)) {
          return NextResponse.json(
            { success: false, message: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }

      // Add user info to request context
      const userContext = {
        user: {
          id: token.sub!,
          email: token.email!,
          role: token.role as UserRole,
        },
      };

      return handler(request, { ...context, ...userContext });
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return NextResponse.json(
        { success: false, message: 'Authentication error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Admin-only route protection
 */
export function withAdminAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return withAuth(handler, [UserRole.ADMIN]);
}

/**
 * Agent and Admin route protection
 */
export function withAgentAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return withAuth(handler, [UserRole.AGENT, UserRole.ADMIN]);
}

/**
 * Client-side role guard utility (component moved to separate .tsx file)
 */
export interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  userRole?: UserRole;
}

/**
 * Check if current path is protected and requires authentication
 */
export function isProtectedPath(pathname: string): boolean {
  const protectedPaths = [
    '/dashboard',
    '/admin',
    '/booking',
    '/profile',
    '/api/bookings',
    '/api/users',
    '/api/admin',
  ];

  return protectedPaths.some(path => pathname.startsWith(path));
}

/**
 * Check if current path requires admin role
 */
export function requiresAdminRole(pathname: string): boolean {
  const adminPaths = ['/admin', '/api/admin'];
  return adminPaths.some(path => pathname.startsWith(path));
}

/**
 * Check if current path requires agent role
 */
export function requiresAgentRole(pathname: string): boolean {
  const agentPaths = ['/dashboard', '/api/bookings', '/api/users'];
  return agentPaths.some(path => pathname.startsWith(path));
}

/**
 * Get redirect URL based on user role
 */
export function getRedirectUrl(role: UserRole, pathname: string = '/'): string {
  // If trying to access admin area but not admin, redirect to dashboard
  if (pathname.startsWith('/admin') && role !== UserRole.ADMIN) {
    return '/dashboard';
  }

  // Default redirects based on role
  switch (role) {
    case UserRole.ADMIN:
      return '/admin/dashboard';
    case UserRole.AGENT:
      return '/dashboard';
    default:
      return '/dashboard';
  }
}