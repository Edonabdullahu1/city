import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';

export type AuditAction = 'CREATE' | 'MODIFY' | 'CONFIRM' | 'CANCEL' | 'PAYMENT' | 'VIEW';

interface AuditLogData {
  bookingId: string;
  userId: string;
  action: AuditAction;
  changes?: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  notes?: string;
  request?: NextRequest;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    const ipAddress = data.request?.headers.get('x-forwarded-for') || 
                      data.request?.headers.get('x-real-ip') || 
                      'unknown';
    
    const userAgent = data.request?.headers.get('user-agent') || 'unknown';

    const auditLog = await prisma.bookingAudit.create({
      data: {
        bookingId: data.bookingId,
        userId: data.userId,
        action: data.action,
        changes: data.changes || {},
        previousState: data.previousState || null,
        newState: data.newState || null,
        notes: data.notes,
        ipAddress,
        userAgent
      }
    });

    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging shouldn't break the main operation
    return null;
  }
}

export async function getBookingAuditHistory(bookingId: string) {
  try {
    const auditLogs = await prisma.bookingAudit.findMany({
      where: { bookingId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return auditLogs;
  } catch (error) {
    console.error('Failed to fetch audit history:', error);
    return [];
  }
}

export async function getUserActivityLog(userId: string, limit = 50) {
  try {
    const activities = await prisma.bookingAudit.findMany({
      where: { userId },
      include: {
        booking: {
          select: {
            id: true,
            reservationCode: true,
            customerName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return activities;
  } catch (error) {
    console.error('Failed to fetch user activity:', error);
    return [];
  }
}

// Helper to calculate changes between two objects
export function calculateChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};

  // Check for changed fields
  for (const key in newData) {
    if (oldData[key] !== newData[key]) {
      changes[key] = {
        old: oldData[key],
        new: newData[key]
      };
    }
  }

  // Check for removed fields
  for (const key in oldData) {
    if (!(key in newData)) {
      changes[key] = {
        old: oldData[key],
        new: undefined
      };
    }
  }

  return changes;
}