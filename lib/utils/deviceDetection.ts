/**
 * Device Detection Utilities
 * Used by middleware and components to determine device type
 */

export function isMobileDevice(userAgent: string): boolean {
  // Check for mobile user agents
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
}

export function isTablet(userAgent: string): boolean {
  // Detect tablets specifically
  const tabletRegex = /iPad|Android(?!.*Mobile)/i;
  return tabletRegex.test(userAgent);
}

export function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  if (isTablet(userAgent)) {
    return 'tablet';
  }
  if (isMobileDevice(userAgent)) {
    return 'mobile';
  }
  return 'desktop';
}

export const DEVICE_COOKIE_NAME = 'device-type';
