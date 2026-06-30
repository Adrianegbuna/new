/**
 * Responsive and Mobile Utilities
 * Helper functions for responsive design and mobile support
 */

/**
 * Check if device is mobile/tablet
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Check for mobile user agents
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  return mobileRegex.test(userAgent.toLowerCase());
};

/**
 * Check if device is touch-capable
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return (
    (typeof window !== 'undefined' &&
      ('ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0)) ||
    false
  );
};

/**
 * Get screen size category
 */
export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const getScreenSize = (): ScreenSize => {
  if (typeof window === 'undefined') return 'md';
  
  const width = window.innerWidth;
  
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  if (width < 1536) return 'xl';
  return '2xl';
};

/**
 * Detect if device is in landscape or portrait
 */
export const isLandscape = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > window.innerHeight;
};

/**
 * Get safe area padding (for notched devices)
 */
export const getSafeAreaPadding = () => {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top')) || 0,
    right: parseInt(style.getPropertyValue('--safe-area-inset-right')) || 0,
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom')) || 0,
    left: parseInt(style.getPropertyValue('--safe-area-inset-left')) || 0,
  };
};

/**
 * Responsive image optimization
 */
export const getResponsiveImageSrc = (
  baseUrl: string,
  width: number,
  quality: number = 75
): string => {
  // For Unsplash images
  if (baseUrl.includes('unsplash.com')) {
    return `${baseUrl}&w=${width}&q=${quality}&fit=crop`;
  }
  
  // For Cloudinary
  if (baseUrl.includes('cloudinary.com')) {
    const parts = baseUrl.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/w_${width},q_${quality},c_fill,ar_16:9/${parts[1]}`;
    }
  }
  
  return baseUrl;
};

/**
 * Throttle function for resize/scroll events
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Get viewport height (accounting for mobile browser UI)
 */
export const getViewportHeight = (): number => {
  if (typeof window === 'undefined') return 0;
  
  // Use 100vh from CSS if available, otherwise calculate
  return Math.min(window.innerHeight, window.visualViewport?.height || window.innerHeight);
};

/**
 * Enable/disable body scroll
 */
export const setBodyScroll = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  
  if (enabled) {
    document.body.style.overflow = '';
  } else {
    document.body.style.overflow = 'hidden';
  }
};

/**
 * Breakpoint constants (Tailwind)
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Check if viewport matches breakpoint
 */
export const matchesBreakpoint = (breakpoint: ScreenSize): boolean => {
  if (typeof window === 'undefined') return false;
  
  const breakpointValue = BREAKPOINTS[breakpoint];
  return window.innerWidth >= breakpointValue;
};
