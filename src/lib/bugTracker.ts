/**
 * Bug and Error Tracking System
 * Tracks errors, crashes, and performance issues for debugging
 * Professional monitoring with session tracking and error logging
 */

export interface ErrorLog {
  id: string
  timestamp: string
  type: 'error' | 'warning' | 'info' | 'crash'
  message: string
  stack?: string
  url: string
  userAgent: string
  userId?: string
  sessionId: string
  context?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface SessionInfo {
  sessionId: string
  startTime: string
  userId?: string
  userEmail?: string
  userRole?: string
  deviceInfo: {
    userAgent: string
    screenWidth: number
    screenHeight: number
    language: string
    timezone: string
  }
  errors: number
  warnings: number
  lastActivity: string
}

class BugTracker {
  private sessionId: string
  private errorLogs: ErrorLog[] = []
  private sessionInfo: SessionInfo
  private maxLogsInMemory = 100
  private batchSendInterval = 5 * 60 * 1000 // 5 minutes
  private apiEndpoint: string

  constructor() {
    this.sessionId = this.generateSessionId()
    this.sessionInfo = this.initializeSession()
    this.apiEndpoint = this.getApiEndpoint()
    this.setupErrorHandlers()
    this.setupPeriodicBatch()
  }

  /**
   * Get the correct API endpoint URL with proper base
   */
  private getApiEndpoint(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:4000/api/debug/track-error'
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                   window.location.origin.includes('localhost') ? 'http://localhost:4000/api' :
                   window.location.origin.includes('vercel') ? 'https://renewablezmart-backend.onrender.com/api' :
                   `${window.location.protocol}//${window.location.hostname}:4000/api`
    
    return `${baseUrl}/debug/track-error`
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    if (typeof window === 'undefined') return 'server-session'
    const existing = sessionStorage.getItem('bugTracker_sessionId')
    if (existing) return existing
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('bugTracker_sessionId', id)
    return id
  }

  /**
   * Initialize session with device info
   */
  private initializeSession(): SessionInfo {
    if (typeof window === 'undefined') {
      return {
        sessionId: this.sessionId,
        startTime: new Date().toISOString(),
        deviceInfo: {
          userAgent: 'server',
          screenWidth: 0,
          screenHeight: 0,
          language: 'unknown',
          timezone: 'unknown',
        },
        errors: 0,
        warnings: 0,
        lastActivity: new Date().toISOString(),
      }
    }

    // Safely get timezone with fallback
    let timezone = 'unknown'
    try {
      const resolvedOptions = Intl.DateTimeFormat()?.resolvedOptions?.()
      timezone = resolvedOptions?.timeZone || 'unknown'
    } catch (e) {
      console.warn('[BugTracker] Failed to get timezone:', e)
      timezone = 'unknown'
    }

    // Safely get language with fallback
    const language = navigator?.language || 'unknown'

    return {
      sessionId: this.sessionId,
      startTime: new Date().toISOString(),
      deviceInfo: {
        userAgent: navigator?.userAgent || 'unknown',
        screenWidth: window?.innerWidth || 0,
        screenHeight: window?.innerHeight || 0,
        language: language,
        timezone: timezone,
      },
      errors: 0,
      warnings: 0,
      lastActivity: new Date().toISOString(),
    }
  }

  /**
   * Setup global error handlers
   */
  private setupErrorHandlers() {
    if (typeof window === 'undefined') return

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'error',
        message: event.message,
        stack: event.error?.stack,
        severity: 'high',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'crash',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        severity: 'critical',
        context: {
          reason: event.reason,
        },
      })
    })

    // Handle page visibility changes for session tracking
    document.addEventListener('visibilitychange', () => {
      this.sessionInfo.lastActivity = new Date().toISOString()
    })
  }

  /**
   * Setup periodic batch sending of error logs
   */
  private setupPeriodicBatch() {
    if (typeof window === 'undefined') return

    setInterval(() => {
      if (this.errorLogs.length > 0) {
        this.sendBatchLogs()
      }
    }, this.batchSendInterval)

    // Send remaining logs on page unload
    window.addEventListener('beforeunload', () => {
      if (this.errorLogs.length > 0) {
        this.sendBatchLogs(true)
      }
    })
  }

  /**
   * Log an error
   */
  public logError(errorData: Partial<ErrorLog>) {
    if (typeof window === 'undefined') return

    const errorLog: ErrorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: errorData.type || 'error',
      message: errorData.message || 'Unknown error',
      stack: errorData.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      context: errorData.context,
      severity: errorData.severity || 'medium',
    }

    // Track user if available
    try {
      const userCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('user='))
      if (userCookie) {
        const user = JSON.parse(decodeURIComponent(userCookie.split('=')[1]))
        errorLog.userId = user.id
      }
    } catch (e) {
      // User cookie not available
    }

    this.errorLogs.push(errorLog)
    this.updateSessionStats(errorLog.type)

    // Store in localStorage for offline access
    this.persistErrorLog(errorLog)

    // Send immediately if critical
    if (errorLog.severity === 'critical') {
      this.sendBatchLogs()
    } else if (this.errorLogs.length >= this.maxLogsInMemory) {
      this.sendBatchLogs()
    }

    console.error('[BugTracker]', errorLog)
  }

  /**
   * Log a warning
   */
  public logWarning(message: string, context?: Record<string, any>) {
    this.logError({
      type: 'warning',
      message,
      severity: 'low',
      context,
    })
  }

  /**
   * Log info message
   */
  public logInfo(message: string, context?: Record<string, any>) {
    this.logError({
      type: 'info',
      message,
      severity: 'low',
      context,
    })
  }

  /**
   * Update session statistics
   */
  private updateSessionStats(type: string) {
    if (type === 'error') {
      this.sessionInfo.errors++
    } else if (type === 'warning') {
      this.sessionInfo.warnings++
    }
    this.sessionInfo.lastActivity = new Date().toISOString()
  }

  /**
   * Persist error log to localStorage
   */
  private persistErrorLog(errorLog: ErrorLog) {
    try {
      const key = 'bugTracker_logs'
      const existing = localStorage.getItem(key)
      let logs: ErrorLog[] = existing ? JSON.parse(existing) : []
      logs.push(errorLog)
      // Keep only last 200 logs
      logs = logs.slice(-200)
      localStorage.setItem(key, JSON.stringify(logs))
    } catch (e) {
      console.error('Failed to persist error log', e)
    }
  }

  /**
   * Send batch logs to backend
   */
  private sendBatchLogs(useBeacon: boolean = false) {
    if (this.errorLogs.length === 0) return

    const payload = {
      session: this.sessionInfo,
      logs: this.errorLogs,
      timestamp: new Date().toISOString(),
    }

    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        // Use sendBeacon for page unload to ensure delivery
        // sendBeacon expects string or ArrayBuffer, not JSON stringified
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
        navigator.sendBeacon(this.apiEndpoint, blob)
      } catch (e) {
        console.warn('[BugTracker] sendBeacon failed:', e)
      }
    } else {
      try {
        // Use fetch for normal batching
        fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch((e) => {
          console.warn('[BugTracker] Failed to send error logs:', e)
        })
      } catch (e) {
        console.warn('[BugTracker] Error sending batch logs:', e)
      }
    }

    this.errorLogs = []
  }

  /**
   * Get session info
   */
  public getSessionInfo(): SessionInfo {
    return this.sessionInfo
  }

  /**
   * Get stored error logs
   */
  public getStoredLogs(): ErrorLog[] {
    try {
      const existing = localStorage.getItem('bugTracker_logs')
      return existing ? JSON.parse(existing) : []
    } catch {
      return []
    }
  }

  /**
   * Clear stored logs
   */
  public clearLogs() {
    localStorage.removeItem('bugTracker_logs')
    this.errorLogs = []
  }

  /**
   * Set user info
   */
  public setUser(userId: string, email: string, role?: string) {
    this.sessionInfo.userId = userId
    this.sessionInfo.userEmail = email
    this.sessionInfo.userRole = role
  }
}

// Create global singleton instance
export const bugTracker = typeof window !== 'undefined' ? new BugTracker() : null
