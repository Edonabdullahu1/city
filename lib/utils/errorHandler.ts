import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, code: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT_ERROR', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

export class BookingError extends AppError {
  constructor(message: string, code: string = 'BOOKING_ERROR') {
    super(message, code, 400);
    this.name = 'BookingError';
  }
}

export class InventoryError extends AppError {
  constructor(message: string) {
    super(message, 'INVENTORY_ERROR', 409);
    this.name = 'InventoryError';
  }
}

export class PaymentError extends AppError {
  constructor(message: string) {
    super(message, 'PAYMENT_ERROR', 402);
    this.name = 'PaymentError';
  }
}

function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

function formatPrismaError(error: Prisma.PrismaClientKnownRequestError): ErrorResponse {
  let message = 'Database operation failed';
  let statusCode = 500;
  let errorCode = 'DATABASE_ERROR';

  switch (error.code) {
    case 'P2001':
      message = 'Record not found';
      statusCode = 404;
      errorCode = 'RECORD_NOT_FOUND';
      break;
    case 'P2002':
      message = 'Unique constraint violation';
      statusCode = 409;
      errorCode = 'DUPLICATE_RECORD';
      if (error.meta?.target) {
        const target = Array.isArray(error.meta.target) ? error.meta.target.join(', ') : error.meta.target;
        message = `Duplicate value for: ${target}`;
      }
      break;
    case 'P2003':
      message = 'Foreign key constraint violation';
      statusCode = 400;
      errorCode = 'INVALID_REFERENCE';
      break;
    case 'P2004':
      message = 'Database constraint violation';
      statusCode = 400;
      errorCode = 'CONSTRAINT_VIOLATION';
      break;
    case 'P2014':
      message = 'Invalid ID provided';
      statusCode = 400;
      errorCode = 'INVALID_ID';
      break;
    case 'P2025':
      message = 'Record not found for operation';
      statusCode = 404;
      errorCode = 'RECORD_NOT_FOUND';
      break;
    default:
      console.error('Unhandled Prisma error:', error.code, error.message);
      break;
  }

  return {
    success: false,
    error: errorCode,
    message,
    code: error.code,
    timestamp: new Date().toISOString(),
  };
}

function formatZodError(error: ZodError): ErrorResponse {
  const fieldErrors = error.flatten().fieldErrors;
  const messages = Object.entries(fieldErrors)
    .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
    .join('; ');

  return {
    success: false,
    error: 'VALIDATION_ERROR',
    message: `Validation failed: ${messages}`,
    details: fieldErrors,
    timestamp: new Date().toISOString(),
  };
}

export function formatError(error: unknown): ErrorResponse {
  const timestamp = new Date().toISOString();

  // Handle custom application errors
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.code,
      message: error.message,
      timestamp,
    };
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return formatZodError(error);
  }

  // Handle Prisma errors
  if (isPrismaError(error)) {
    return formatPrismaError(error);
  }

  // Handle generic JavaScript errors
  if (error instanceof Error) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      details: isDevelopment ? error.stack : undefined,
      timestamp,
    };
  }

  // Handle unknown errors
  return {
    success: false,
    error: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    details: typeof error === 'string' ? error : 'Unknown error type',
    timestamp,
  };
}

export function createErrorResponse(error: unknown, statusCode?: number): NextResponse {
  const formattedError = formatError(error);
  
  let responseStatus = 500;
  
  if (error instanceof AppError) {
    responseStatus = error.statusCode;
  } else if (statusCode) {
    responseStatus = statusCode;
  }

  return NextResponse.json(formattedError, { status: responseStatus });
}

export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);
      return createErrorResponse(error);
    }
  };
}

export function withAsyncErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Async operation error:', error);
      throw error;
    }
  };
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  userId?: string;
  requestId?: string;
  action?: string;
  resource?: string;
  metadata?: Record<string, unknown>;
}

export function logError(
  error: unknown,
  level: LogLevel = 'error',
  context?: LogContext
) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    error: formatError(error),
    context,
  };

  switch (level) {
    case 'error':
      console.error('Application Error:', logData);
      break;
    case 'warn':
      console.warn('Application Warning:', logData);
      break;
    case 'info':
      console.info('Application Info:', logData);
      break;
    case 'debug':
      console.debug('Application Debug:', logData);
      break;
  }
}

export function handleApiError(error: unknown, request?: NextRequest): NextResponse {
  const context: LogContext = {};
  
  if (request) {
    context.requestId = request.headers.get('x-request-id') || 'unknown';
    context.metadata = {
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
    };
  }

  logError(error, 'error', context);
  return createErrorResponse(error);
}

export const ErrorCodes = {
  // Authentication & Authorization
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  
  // Business Logic
  BOOKING_ERROR: 'BOOKING_ERROR',
  INVENTORY_ERROR: 'INVENTORY_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  
  // System
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // External Services
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
  WHATSAPP_SERVICE_ERROR: 'WHATSAPP_SERVICE_ERROR',
} as const;