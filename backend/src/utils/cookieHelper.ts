/**
 * Cookie utility for backend
 * Avoids TypeScript issues with cookie module
 */

export interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  maxAge?: number
  path?: string
}

/**
 * Serialize cookie string without importing cookie module
 */
export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const {
    httpOnly = false,
    secure = false,
    sameSite = 'lax',
    maxAge,
    path = '/',
  } = options

  let cookie = `${name}=${encodeURIComponent(value)}`

  if (path) cookie += `; Path=${path}`
  if (sameSite) cookie += `; SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`
  if (secure) cookie += '; Secure'
  if (httpOnly) cookie += '; HttpOnly'
  if (maxAge) cookie += `; Max-Age=${maxAge}`

  return cookie
}

/**
 * Set multiple cookies on response
 */
export function setResponseCookies(res: any, cookies: string[]): void {
  const existingHeaders = res.getHeader('Set-Cookie') || []
  const allCookies = Array.isArray(existingHeaders) ? [...existingHeaders, ...cookies] : [existingHeaders, ...cookies]
  res.setHeader('Set-Cookie', allCookies)
}
