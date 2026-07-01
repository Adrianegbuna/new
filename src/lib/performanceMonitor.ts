/**
 * Performance Monitoring and Analytics Cookies
 * Tracks page performance, user interactions, and engagement metrics
 */

export interface PerformanceMetrics {
  pageLoadTime: number
  timeToInteractive: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  memoryUsage?: number
}

export interface UserInteraction {
  timestamp: string
  type: 'click' | 'scroll' | 'input' | 'navigation'
  target?: string
  value?: any
}

export interface PageViewData {
  timestamp: string
  url: string
  referrer: string
  sessionDuration: number
  interactions: number
  pageLoadTime: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    pageLoadTime: 0,
    timeToInteractive: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
  }
  private interactions: UserInteraction[] = []
  private pageStartTime = Date.now()

  constructor() {
    if (typeof window === 'undefined') return
    this.capturePerformanceMetrics()
    this.setupInteractionTracking()
  }

  /**
   * Capture Web Vitals and performance metrics
   */
  private capturePerformanceMetrics() {
    if (typeof window === 'undefined') return

    // Page load time
    window.addEventListener('load', () => {
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navTiming) {
        this.metrics.pageLoadTime = navTiming.loadEventEnd - navTiming.fetchStart
        this.metrics.timeToInteractive = navTiming.domInteractive - navTiming.fetchStart
      }
    })

    // Web Vitals
    try {
      // FCP
      const paintEntries = performance.getEntriesByType('paint')
      const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint')
      if (fcp) {
        this.metrics.firstContentfulPaint = fcp.startTime
      }

      // LCP (Largest Contentful Paint)
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          const lastEntry = entries[entries.length - 1]
          this.metrics.largestContentfulPaint = lastEntry.startTime
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // CLS (Cumulative Layout Shift)
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if ((entry as any).hadRecentInput) continue
            this.metrics.cumulativeLayoutShift += (entry as any).value
          }
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
      }

      // Memory usage (if available)
      if ((performance as any).memory) {
        this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize
      }
    } catch (e) {
      console.error('Failed to capture performance metrics', e)
    }
  }

  /**
   * Setup interaction tracking
   */
  private setupInteractionTracking() {
    if (typeof window === 'undefined') return

    // Track clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      this.recordInteraction({
        timestamp: new Date().toISOString(),
        type: 'click',
        target: target.id || target.className || target.tagName,
      })
    }, { passive: true })

    // Track scrolls (throttled)
    let scrollTimeout: NodeJS.Timeout
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        this.recordInteraction({
          timestamp: new Date().toISOString(),
          type: 'scroll',
          value: window.scrollY,
        })
      }, 1000)
    }, { passive: true })

    // Track input
    document.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement
      this.recordInteraction({
        timestamp: new Date().toISOString(),
        type: 'input',
        target: target.id || target.name || target.className,
      })
    }, { passive: true })
  }

  /**
   * Record user interaction
   */
  private recordInteraction(interaction: UserInteraction) {
    this.interactions.push(interaction)
    // Keep only last 100 interactions
    if (this.interactions.length > 100) {
      this.interactions.shift()
    }
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get interactions
   */
  public getInteractions(): UserInteraction[] {
    return [...this.interactions]
  }

  /**
   * Get page view data
   */
  public getPageViewData(): PageViewData {
    return {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      sessionDuration: Date.now() - this.pageStartTime,
      interactions: this.interactions.length,
      pageLoadTime: this.metrics.pageLoadTime,
    }
  }
}

// Create global singleton
export const performanceMonitor = typeof window !== 'undefined' ? new PerformanceMonitor() : null
