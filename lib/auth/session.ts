import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import type { Session } from 'next-auth';

export interface AuthSession extends Session {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: UserRole;
  };
}

/**
 * Get the current session from the server
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const session = await getServerSession(authOptions);
  return session as AuthSession | null;
}

/**
 * Get the current user from the server session
 */
export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}

/**
 * Check if user is agent or admin
 */
export function isAgentOrAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.AGENT || userRole === UserRole.ADMIN;
}

/**
 * Check if user can access admin features
 */
export async function canAccessAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? isAdmin(user.role) : false;
}

/**
 * Check if user can access agent features
 */
export async function canAccessAgent(): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? isAgentOrAdmin(user.role) : false;
}