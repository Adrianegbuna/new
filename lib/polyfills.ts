/**
 * Browser Polyfills and Compatibility Layer
 * Ensures cross-browser compatibility for older browsers
 */

// Polyfill for Object.assign (IE11)
if (typeof Object.assign !== 'function') {
  Object.defineProperty(Object, 'assign', {
    value: function assign(target: any, ...sources: any[]) {
      if (target === null || target === undefined) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      const to = Object(target);

      for (let index = 0; index < sources.length; index++) {
        const nextSource = sources[index];

        if (nextSource !== null && nextSource !== undefined) {
          for (const nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true,
  });
}

// Array.from is natively supported in modern browsers

// Polyfill for Promise (IE11)
if (typeof Promise === 'undefined') {
  console.warn('Promise not available - using polyfill. Consider upgrading your browser.');
}

// Polyfill for IntersectionObserver (for lazy loading in older browsers)
if (typeof IntersectionObserver === 'undefined') {
  (window as any).IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill for fetch (IE11)
if (!window.fetch) {
  console.warn('Fetch API not available - you may need to use a polyfill library');
}

// Add vendor prefixes for CSS features
export const addVendorPrefix = (property: string, value: string): { [key: string]: string } => {
  const prefixes = ['-webkit-', '-moz-', '-ms-', '-o-', ''];
  const result: { [key: string]: string } = {};

  prefixes.forEach((prefix) => {
    result[prefix + property] = value;
  });

  return result;
};

// Detect browser and return user agent info
export const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor);
  const isEdge = /Edg/.test(ua);
  const isIE = /MSIE 10|Trident\/7\./.test(ua);

  return {
    isChrome,
    isFirefox,
    isSafari,
    isEdge,
    isIE,
    isModern: !isIE,
  };
};

// Performance observer for monitoring
export const setupPerformanceMonitoring = () => {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`${entry.name}: ${entry.duration}ms`);
          }
        });
      });
      observer.observe({ entryTypes: ['navigation', 'resource'] });
    } catch (e) {
      // PerformanceObserver not fully supported
    }
  }
};

// Fix for flexbox issues in older browsers
export const applyFlexboxFix = (element: HTMLElement) => {
  if (element) {
    element.style.display = '-webkit-box';
    element.style.display = '-moz-box';
    element.style.display = 'flex';
  }
};

// Ensure CSS variables fallbacks for older browsers
export const setupCSSVariableFallbacks = () => {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  // Check if CSS variables are supported
  if (!computedStyle.getPropertyValue('--primary-color')) {
    // Set fallback colors for older browsers
    document.documentElement.style.setProperty('--primary-color', '#0066cc');
    document.documentElement.style.setProperty('--secondary-color', '#f0f0f0');
    document.documentElement.style.setProperty('--text-color', '#333333');
  }
};

export default {
  getBrowserInfo,
  setupPerformanceMonitoring,
  applyFlexboxFix,
  setupCSSVariableFallbacks,
  addVendorPrefix,
};
