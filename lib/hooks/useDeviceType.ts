import { useState, useEffect } from 'react';
import { DEVICE_COOKIE_NAME } from '../utils/deviceDetection';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Hook to get the current device type
 * Uses cookie set by middleware for SSR compatibility
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    // Read device type from cookie
    const cookies = document.cookie.split(';');
    const deviceCookie = cookies.find(cookie =>
      cookie.trim().startsWith(`${DEVICE_COOKIE_NAME}=`)
    );

    if (deviceCookie) {
      const type = deviceCookie.split('=')[1] as DeviceType;
      setDeviceType(type);
    } else {
      // Fallback to client-side detection if cookie not found
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setDeviceType(isMobile ? 'mobile' : 'desktop');
    }
  }, []);

  return deviceType;
}

/**
 * Hook to check if current device is mobile
 */
export function useIsMobile(): boolean {
  const deviceType = useDeviceType();
  return deviceType === 'mobile';
}

/**
 * Hook to check if current device is tablet
 */
export function useIsTablet(): boolean {
  const deviceType = useDeviceType();
  return deviceType === 'tablet';
}

/**
 * Hook to check if current device is desktop
 */
export function useIsDesktop(): boolean {
  const deviceType = useDeviceType();
  return deviceType === 'desktop';
}
