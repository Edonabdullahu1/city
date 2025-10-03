import { NextRequest, NextResponse } from 'next/server';

interface RateLimitAttempt {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

// In-memory store - in production, use Redis or similar
const rateLimitStore = new Map<string, RateLimitAttempt>();

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Max attempts per window
  blockDurationMs?: number; // How long to block after exceeding limit
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
}

export class RateLimiter {
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxAttempts: config.maxAttempts,
      blockDurationMs: config.blockDurationMs || config.windowMs * 2,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      message: config.message || 'Too many requests. Please try again later.',
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
    };
  }

  private defaultKeyGenerator(request: NextRequest): string {
    // Use IP address and user agent for key generation
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    return `${ip}:${userAgent.substring(0, 50)}`;
  }

  private getClientIP(request: NextRequest): string {
    // Check various headers for the real IP
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return (
      request.headers.get('x-real-ip') ||
      request.headers.get('x-client-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'
    );
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime && (!entry.blockedUntil || now > entry.blockedUntil)) {
        rateLimitStore.delete(key);
      }
    }
  }

  async checkLimit(request: NextRequest): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    // Cleanup expired entries periodically
    if (Math.random() < 0.01) { // 1% chance to cleanup
      this.cleanupExpiredEntries();
    }

    const key = this.config.keyGenerator(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = rateLimitStore.get(key);

    // Initialize or reset entry if window expired
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
    }

    // Check if currently blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }

    // Increment counter
    entry.count += 1;

    // Check if limit exceeded
    if (entry.count > this.config.maxAttempts) {
      entry.blockedUntil = now + this.config.blockDurationMs;
      rateLimitStore.set(key, entry);

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil(this.config.blockDurationMs / 1000),
      };
    }

    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: Math.max(0, this.config.maxAttempts - entry.count),
      resetTime: entry.resetTime,
    };
  }

  middleware() {
    return async (request: NextRequest): Promise<NextResponse | null> => {
      const result = await this.checkLimit(request);

      if (!result.allowed) {
        const response = NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: this.config.message,
            retryAfter: result.retryAfter,
          },
          { status: 429 }
        );

        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', this.config.maxAttempts.toString());
        response.headers.set('X-RateLimit-Remaining', '0');
        response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
        
        if (result.retryAfter) {
          response.headers.set('Retry-After', result.retryAfter.toString());
        }

        return response;
      }

      // Add rate limit headers for successful requests
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', this.config.maxAttempts.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      return response;
    };
  }

  // Reset rate limit for a specific key (useful for testing or admin override)
  resetLimit(key: string): void {
    rateLimitStore.delete(key);
  }

  // Get current rate limit status for a key
  getStatus(key: string): RateLimitAttempt | null {
    return rateLimitStore.get(key) || null;
  }
}

// Pre-configured rate limiters for common scenarios
export const loginRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5, // 5 attempts per 15 minutes
  blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes after exceeding
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const apiRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 100, // 100 requests per 15 minutes
  message: 'API rate limit exceeded. Please slow down your requests.',
});

export const strictApiRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxAttempts: 10, // 10 requests per minute
  blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes
  message: 'Rate limit exceeded for sensitive operation.',
});

// Booking-specific rate limiter
export const bookingRateLimit = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxAttempts: 3, // Max 3 booking attempts per 5 minutes
  blockDurationMs: 10 * 60 * 1000, // Block for 10 minutes
  message: 'Too many booking attempts. Please wait before trying again.',
});

// Registration rate limiter
export const registrationRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 3, // Max 3 registration attempts per hour
  blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
  message: 'Too many registration attempts. Please try again later.',
});

// Password reset rate limiter
export const passwordResetRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 3, // Max 3 password reset attempts per 15 minutes
  blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
  message: 'Too many password reset attempts. Please try again later.',
});

// Helper function to apply rate limiting to API routes
export function withRateLimit(
  rateLimiter: RateLimiter,
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const rateLimitResult = await rateLimiter.checkLimit(request);

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', '5');
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('Retry-After', rateLimitResult.retryAfter?.toString() || '900');

      return response;
    }

    // Call the actual handler
    const response = await handler(request, context);

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());

    return response;
  };
}

export default RateLimiter;