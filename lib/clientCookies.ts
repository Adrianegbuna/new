/**
 * Client-side cookie utilities for Next.js
 * Cookies set by the backend (like accessToken) are httpOnly and cannot be accessed from JavaScript
 * But we can manage preference cookies and read user data from cookies
 */

export interface CookieOptions {
  maxAge?: number
  expires?: Date
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

/**
 * Get a specific cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  const nameEQ = name + '='
  const cookies = document.cookie.split(';')
  
  for (let cookie of cookies) {
    cookie = cookie.trim()
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length))
    }
  }
  return null
}

/**
 * Set a cookie (cannot set httpOnly from JavaScript)
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}) {
  if (typeof document === 'undefined') return

  let cookieString = `${name}=${encodeURIComponent(value)}`

  if (options.maxAge) {
    cookieString += `; max-age=${options.maxAge}`
  }
  if (options.expires) {
    cookieString += `; expires=${options.expires.toUTCString()}`
  }
  if (options.path) {
    cookieString += `; path=${options.path}`
  }
  if (options.domain) {
    cookieString += `; domain=${options.domain}`
  }
  if (options.secure) {
    cookieString += '; secure'
  }
  if (options.sameSite) {
    cookieString += `; samesite=${options.sameSite}`
  }

  document.cookie = cookieString
}

/**
 * Delete a cookie by setting maxAge to 0
 */
export function deleteCookie(name: string, path: string = '/') {
  setCookie(name, '', { maxAge: 0, path })
}

/**
 * Get user data from cookie
 */
export function getUserFromCookie() {
  const userCookie = getCookie('user')
  if (!userCookie) return null
  
  try {
    return JSON.parse(userCookie)
  } catch {
    return null
  }
}

/**
 * Clear all auth cookies (user should also be cleared on backend)
 */
export function clearAuthCookies() {
  deleteCookie('user')
  // Note: accessToken and refreshToken are httpOnly and cannot be deleted from JavaScript
  // The backend must clear them via logout endpoint
}

/**
 * Set preference cookie (for theme, language, etc.)
 */
export function setPreference(key: string, value: string) {
  const maxAge = 365 * 24 * 60 * 60 // 1 year
  setCookie(`pref_${key}`, value, {
    maxAge,
    path: '/',
    sameSite: 'lax',
  })
}

/**
 * Get preference cookie
 */
export function getPreference(key: string): string | null {
  return getCookie(`pref_${key}`)
}

/**
 * Delete preference cookie
 */
export function deletePreference(key: string) {
  deleteCookie(`pref_${key}`, '/')
}
