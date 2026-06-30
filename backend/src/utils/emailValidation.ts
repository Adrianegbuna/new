// Email validation utility for backend
// Validates email addresses and blocks fake/disposable email providers

const disposableEmailDomains = [
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'temp-mail.org',
  'throwaway.email', 'fakeinbox.com', 'maildrop.cc', 'tempmail.com',
  'getnada.com', 'trashmail.com', 'yopmail.com', 'mintemail.com',
  'sharklasers.com', 'spam4.me', 'grr.la', 'discard.email',
  'mohmal.com', 'emailondeck.com', 'tempinbox.com', 'temp-mail.io',
  'disposablemail.com', 'throwawaymail.com', 'burnermail.io'
];

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
};

interface EmailValidation {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

export function validateEmail(email: string): EmailValidation {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email address is required' };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Check for fake patterns
  if (isFakeEmail(trimmedEmail)) {
    return { isValid: false, error: 'This appears to be a fake email address. Please use a real email.' };
  }

  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Invalid email format. Please enter a valid email address.' };
  }

  const domain = trimmedEmail.split('@')[1];
  
  if (!domain) {
    return { isValid: false, error: 'Email must contain a domain (e.g., @gmail.com)' };
  }

  // Check for typos
  if (commonEmailTypos[domain]) {
    return {
      isValid: false,
      error: `Invalid email domain. Did you mean ${commonEmailTypos[domain]}?`,
      suggestion: trimmedEmail.replace(domain, commonEmailTypos[domain])
    };
  }

  // Check for disposable emails
  if (disposableEmailDomains.includes(domain)) {
    return {
      isValid: false,
      error: 'Disposable/temporary email addresses are not allowed. Please use a permanent email address.'
    };
  }

  // Check for suspicious patterns
  const suspiciousPattern = /^(test|fake|dummy|temp|trash|spam|noreply|no-reply)@/i;
  if (suspiciousPattern.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'This appears to be a test or fake email address. Please use your real email.'
    };
  }

  // Check for invalid patterns
  if (trimmedEmail.includes('..') || trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
    return { isValid: false, error: 'Invalid email format. Email cannot contain consecutive dots.' };
  }

  return { isValid: true };
}

function isFakeEmail(email: string): boolean {
  const fakePatterns = [
    /^(test|fake|dummy|example|sample)\d*@/i, // Only obvious fake prefixes
    /^(admin|info|contact|support|noreply)@test\./i, // test.* domain
    /^(\w)\1{10,}@/i, // Many repeated characters (e.g., aaaaaaaaaaaa@)
    /^(000|111|222|333|444|555|666|777|888|999){2,}@/i, // Repeated number blocks
    /@(localhost|127\.0\.0\.1|0\.0\.0\.0)/i // Local addresses
  ];

  return fakePatterns.some(pattern => pattern.test(email));
}

export function formatEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  return disposableEmailDomains.includes(domain);
}
