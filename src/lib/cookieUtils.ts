import { serialize, parse, SerializeOptions } from 'cookie'

const COOKIE_OPTIONS: SerializeOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: '/',
}

/**
 * Set cookie on server-side (used in API routes)
 */
export function setCookie(name: string, value: string, options: SerializeOptions = {}) {
  return serialize(name, value, { ...COOKIE_OPTIONS, ...options })
}

/**
 * Get cookies from request headers (server-side)
 */
export function getCookies(req: any) {
  return parse(req.headers.cookie || '')
}

/**
 * Get single cookie value from request (server-side)
 */
export function getCookie(req: any, name: string) {
  const cookies = getCookies(req)
  return cookies[name]
}

/**
 * Set token cookies (httpOnly for security)
 */
export function getTokenCookies(accessToken: string, refreshToken: string) {
  const accessCookie = setCookie('accessToken', accessToken, {
    maxAge: 15 * 60, // 15 minutes
  })
  const refreshCookie = setCookie('refreshToken', refreshToken, {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
  return [accessCookie, refreshCookie]
}

/**
 * Clear token cookies
 */
export function getClearTokenCookies() {
  const accessCookie = setCookie('accessToken', '', { maxAge: 0 })
  const refreshCookie = setCookie('refreshToken', '', { maxAge: 0 })
  const userCookie = setCookie('user', '', { maxAge: 0 })
  return [accessCookie, refreshCookie, userCookie]
}

/**
 * Set user preference cookie (not httpOnly - can be read by JS for UX)
 */
export function setUserPreference(name: string, value: string) {
  const options: SerializeOptions = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60, // 1 year
    path: '/',
  }
  return serialize(name, value, options)
}

/**
 * Set user data cookie (not httpOnly - needed for client-side)
 */
export function setUserCookie(userData: any) {
  const options: SerializeOptions = {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  }
  return serialize('user', JSON.stringify(userData), options)
}
