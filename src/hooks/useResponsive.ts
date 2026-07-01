import { useState, useEffect } from 'react';
import { getScreenSize, ScreenSize, isMobileDevice, isTouchDevice, isLandscape, throttle } from '@/lib/responsive';

/**
 * Hook to track responsive state
 */
export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState<ScreenSize>('md');
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [isLandscapeMode, setIsLandscapeMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);

  useEffect(() => {
    // Set initial values
    setScreenSize(getScreenSize());
    setIsMobile(isMobileDevice());
    setIsTouch(isTouchDevice());
    setIsLandscapeMode(isLandscape());
    setWindowWidth(window.innerWidth);
    setWindowHeight(window.innerHeight);

    // Handle resize with throttle
    const handleResize = throttle(() => {
      setScreenSize(getScreenSize());
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
      setIsLandscapeMode(isLandscape());
    }, 150);

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    screenSize,
    isMobile,
    isTouch,
    isLandscape: isLandscapeMode,
    windowWidth,
    windowHeight,
    isXs: screenSize === 'xs',
    isSm: screenSize === 'sm',
    isMd: screenSize === 'md',
    isLg: screenSize === 'lg',
    isXl: screenSize === 'xl',
    is2xl: screenSize === '2xl',
  };
};

/**
 * Hook to check if specific breakpoint is active
 */
export const useBreakpoint = (breakpoint: ScreenSize): boolean => {
  const { screenSize } = useResponsive();
  
  const breakpointOrder: ScreenSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(screenSize);
  const targetIndex = breakpointOrder.indexOf(breakpoint);
  
  return currentIndex >= targetIndex;
};

/**
 * Hook to get safe area insets (for notched devices)
 */
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      if (typeof window !== 'undefined') {
        const style = getComputedStyle(document.documentElement);
        setSafeArea({
          top: parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0,
          right: parseInt(style.getPropertyValue('env(safe-area-inset-right)')) || 0,
          bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
          left: parseInt(style.getPropertyValue('env(safe-area-inset-left)')) || 0,
        });
      }
    };

    updateSafeArea();
    window.addEventListener('orientationchange', updateSafeArea);

    return () => {
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);

  return safeArea;
};

/**
 * Hook to handle mobile menu toggle
 */
export const useMobileMenu = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);

  const toggle = () => setIsOpen(!isOpen);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  // Close menu on larger screens
  const { isMobile } = useResponsive();
  
  useEffect(() => {
    if (!isMobile) {
      close();
    }
  }, [isMobile]);

  return { isOpen, toggle, open, close };
};
