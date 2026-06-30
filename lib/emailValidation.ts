// Email validation utility
// Validates email addresses and blocks fake/disposable email providers

// List of disposable/temporary email domains to block
const disposableEmailDomains = [
  // Common disposable email services
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'temp-mail.org',
  'throwaway.email', 'fakeinbox.com', 'maildrop.cc', 'tempmail.com',
  'getnada.com', 'trashmail.com', 'yopmail.com', 'mintemail.com',
  'sharklasers.com', 'spam4.me', 'grr.la', 'discard.email',
  'mohmal.com', 'emailondeck.com', 'tempinbox.com', 'temp-mail.io',
  'disposablemail.com', 'throwawaymail.com', 'burnermail.io'
]

// Common email provider typos (suggest corrections)
const commonEmailTypos: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'iclod.com': 'icloud.com',
  'iclud.com': 'icloud.com'
}

// Reputable email providers (whitelist for extra validation)
const reputableProviders = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'protonmail.com', 'aol.com', 'mail.com', 'zoho.com', 'yandex.com',
  'live.com', 'msn.com', 'me.com', 'mac.com'
]

interface EmailValidation {
  isValid: boolean
  error?: string
  suggestion?: string
  warning?: string
}

/**
 * Validates an email address
 * @param email - The email address to validate
 * @returns Object with validation results
 */
export function validateEmail(email: string): EmailValidation {
  // Basic checks
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email address is required' }
  }

  const trimmedEmail = email.trim().toLowerCase()

  // Check for obvious fake patterns
  if (isFakeEmail(trimmedEmail)) {
    return { isValid: false, error: 'This appears to be a fake email address. Please use a real email.' }
  }

  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Invalid email format. Please enter a valid email address.' }
  }

  // Extract domain
  const domain = trimmedEmail.split('@')[1]
  
  if (!domain) {
    return { isValid: false, error: 'Email must contain a domain (e.g., @gmail.com)' }
  }

  // Check for common typos
  if (commonEmailTypos[domain]) {
    return {
      isValid: false,
      error: `Invalid email domain. Did you mean ${commonEmailTypos[domain]}?`,
      suggestion: trimmedEmail.replace(domain, commonEmailTypos[domain])
    }
  }

  // Check for disposable email domains
  if (disposableEmailDomains.includes(domain)) {
    return {
      isValid: false,
      error: 'Disposable/temporary email addresses are not allowed. Please use a permanent email address.'
    }
  }

  // Check for suspicious patterns
  const suspiciousPattern = /^(test|fake|dummy|temp|trash|spam|noreply|no-reply)@/i
  if (suspiciousPattern.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'This appears to be a test or fake email address. Please use your real email.'
    }
  }

  // Check for consecutive dots or other suspicious patterns
  if (trimmedEmail.includes('..') || trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
    return { isValid: false, error: 'Invalid email format. Email cannot contain consecutive dots.' }
  }

  // Warning for non-reputable providers (but still allow)
  if (!reputableProviders.includes(domain) && !domain.includes('.')) {
    return {
      isValid: true,
      warning: 'Please double-check your email address. Use a common provider like Gmail, Yahoo, or Outlook for better deliverability.'
    }
  }

  return { isValid: true }
}

/**
 * Checks if an email appears to be fake based on common patterns
 */
function isFakeEmail(email: string): boolean {
  const fakePatterns = [
    /^(test|fake|dummy|example|sample)\d*@/i, // Only obvious fake prefixes
    /^(admin|info|contact|support|noreply)@test\./i, // test.* domain
    /^(\w)\1{10,}@/i, // Many repeated characters (e.g., aaaaaaaaaaaa@)
    /^(000|111|222|333|444|555|666|777|888|999){2,}@/i, // Repeated number blocks
    /@(localhost|127\.0\.0\.1|0\.0\.0\.0)/i // Local addresses
  ]

  return fakePatterns.some(pattern => pattern.test(email))
}

/**
 * Checks if email domain is disposable
 * @param email - Email address to check
 * @returns true if email uses disposable domain
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1]
  return disposableEmailDomains.includes(domain)
}

/**
 * Suggests correction if email has common typo
 * @param email - Email address to check
 * @returns Suggested correction or null
 */
export function suggestEmailCorrection(email: string): string | null {
  const domain = email.toLowerCase().split('@')[1]
  if (commonEmailTypos[domain]) {
    return email.replace(domain, commonEmailTypos[domain])
  }
  return null
}

/**
 * Formats email to lowercase and trims whitespace
 * @param email - Email address to format
 * @returns Formatted email
 */
export function formatEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Validates email and returns a clean formatted version
 * @param email - Email to validate and format
 * @returns Object with validation result and formatted email
 */
export function validateAndFormatEmail(email: string): { isValid: boolean; email: string; error?: string; suggestion?: string } {
  const validation = validateEmail(email)
  return {
    ...validation,
    email: formatEmail(email)
  }
}
