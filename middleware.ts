import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getDeviceType, DEVICE_COOKIE_NAME } from './lib/utils/deviceDetection'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Device detection
  const userAgent = request.headers.get('user-agent') || ''
  const deviceType = getDeviceType(userAgent)

  // Set device type cookie for client-side access
  response.cookies.set(DEVICE_COOKIE_NAME, deviceType, {
    httpOnly: false, // Allow client-side access
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })

  // Add device type to response headers for SSR
  response.headers.set('x-device-type', deviceType)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}