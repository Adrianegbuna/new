/**
 * Nigeria CAC (Corporate Affairs Commission) Registration Validation (Frontend)
 * Official validation for Nigerian business registration numbers
 */

export interface CACValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
  normalizedValue?: string;
  registrationType?: string;
  details?: {
    prefix: string;
    number: string;
    type: string;
    description: string;
  };
}

/**
 * CAC Registration Types with Official Formats
 */
export enum CACRegistrationType {
  RC = 'RC',   // Limited Company (Company Limited by Shares)
  BN = 'BN',   // Business Name (Sole Proprietorship/Partnership)
  IT = 'IT',   // Incorporated Trustees (Non-Profit Organizations)
  LLP = 'LLP', // Limited Liability Partnership
}

const CAC_REGISTRATION_INFO = {
  RC: {
    description: 'Limited Company (Company Limited by Shares)',
    minDigits: 6,
    maxDigits: 7,
    format: 'RC-XXXXXX',
    example: 'RC-123456',
    notes: 'For private and public limited companies registered with CAC'
  },
  BN: {
    description: 'Business Name (Sole Proprietorship or Partnership)',
    minDigits: 6,
    maxDigits: 7,
    format: 'BN-XXXXXX',
    example: 'BN-789012',
    notes: 'For individuals or partnerships trading under a business name'
  },
  IT: {
    description: 'Incorporated Trustees (Non-Profit)',
    minDigits: 6,
    maxDigits: 7,
    format: 'IT-XXXXXX',
    example: 'IT-345678',
    notes: 'For NGOs, religious organizations, clubs, and associations'
  },
  LLP: {
    description: 'Limited Liability Partnership',
    minDigits: 6,
    maxDigits: 7,
    format: 'LLP-XXXXXX',
    example: 'LLP-456789',
    notes: 'For professional partnerships with limited liability'
  }
};

/**
 * Normalize CAC registration number to standard format
 */
export function normalizeCACNumber(regNumber: string): string {
  // Remove all spaces and convert to uppercase
  let normalized = regNumber.trim().toUpperCase().replace(/\s+/g, '');
  
  // Ensure hyphen after prefix
  normalized = normalized.replace(/^(RC|BN|IT|LLP)(\d)/i, '$1-$2');
  
  return normalized;
}

/**
 * Parse CAC registration number components
 */
function parseCACNumber(normalized: string): { prefix: string; number: string } | null {
  const match = normalized.match(/^(RC|BN|IT|LLP)-(\d+)$/i);
  if (!match) return null;
  
  return {
    prefix: match[1].toUpperCase(),
    number: match[2]
  };
}

/**
 * Validate CAC registration number format
 */
export function validateCACRegistrationNumber(regNumber: string): CACValidationResult {
  if (!regNumber || !regNumber.trim()) {
    return {
      isValid: false,
      error: 'CAC registration number is required for Nigerian vendors'
    };
  }

  // Normalize the input
  const normalized = normalizeCACNumber(regNumber);
  
  // Parse components
  const parsed = parseCACNumber(normalized);
  
  if (!parsed) {
    return {
      isValid: false,
      error: 'Invalid CAC registration number format',
      suggestion: 'Must start with RC, BN, IT, or LLP followed by 6-7 digits. Example: RC-123456, BN-789012'
    };
  }

  const { prefix, number } = parsed;
  const info = CAC_REGISTRATION_INFO[prefix as keyof typeof CAC_REGISTRATION_INFO];

  if (!info) {
    return {
      isValid: false,
      error: `Unknown registration type: ${prefix}`,
      suggestion: 'Valid types are: RC (Company), BN (Business Name), IT (NGO/Trustees), LLP (Partnership)'
    };
  }

  // Validate number length
  const numLength = number.length;
  if (numLength < info.minDigits) {
    return {
      isValid: false,
      error: `${prefix} registration number is too short`,
      suggestion: `${prefix} numbers must be at least ${info.minDigits} digits. Example: ${info.example}`
    };
  }

  if (numLength > info.maxDigits) {
    return {
      isValid: false,
      error: `${prefix} registration number is too long`,
      suggestion: `${prefix} numbers must be at most ${info.maxDigits} digits. Example: ${info.example}`
    };
  }

  // Check for obviously fake numbers
  if (/^(\d)\1+$/.test(number)) {
    return {
      isValid: false,
      error: 'Registration number appears to be invalid',
      suggestion: 'Please enter your actual CAC registration number (repeated digits are not valid)'
    };
  }

  if (number === '123456' || number === '1234567' || number === '000000') {
    return {
      isValid: false,
      error: 'This appears to be a test or placeholder number',
      suggestion: 'Please enter your actual CAC registration number'
    };
  }

  // Valid format
  return {
    isValid: true,
    normalizedValue: normalized,
    registrationType: prefix,
    details: {
      prefix,
      number,
      type: info.description,
      description: info.notes
    }
  };
}

/**
 * Get CAC registration type information
 */
export function getCACTypeInfo(type: string): typeof CAC_REGISTRATION_INFO[keyof typeof CAC_REGISTRATION_INFO] | null {
  const upperType = type.toUpperCase();
  return CAC_REGISTRATION_INFO[upperType as keyof typeof CAC_REGISTRATION_INFO] || null;
}

/**
 * Get all supported CAC registration types
 */
export function getSupportedCACTypes(): Array<{
  code: string;
  description: string;
  format: string;
  example: string;
}> {
  return Object.entries(CAC_REGISTRATION_INFO).map(([code, info]) => ({
    code,
    description: info.description,
    format: info.format,
    example: info.example
  }));
}
