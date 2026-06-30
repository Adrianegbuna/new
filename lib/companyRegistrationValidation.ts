/**
 * Company Registration Number Validation Utility
 * 
 * Validates business registration numbers for African countries
 * with country-specific formats and patterns.
 */

// Country-specific company registration patterns
export const companyRegistrationPatterns: Record<string, {
  patterns: RegExp[];
  format: string;
  example: string;
  description: string;
}> = {
  'Nigeria': {
    patterns: [
      /^RC[-\s]?\d{6,8}$/i,           // Limited Liability Company: RC-123456
      /^BN[-\s]?\d{6,8}$/i,           // Business Name: BN-123456
      /^IT[-\s]?\d{6,8}$/i,           // Incorporated Trustees: IT-123456
      /^\d{8}$/,                       // 8-digit format
    ],
    format: 'RC-XXXXXX, BN-XXXXXX, or IT-XXXXXX',
    example: 'RC-1234567 or BN-1234567',
    description: 'Nigeria CAC registration (RC for companies, BN for business names, IT for trustees)'
  },
  'Ghana': {
    patterns: [
      /^CS\d{9}$/i,                    // Company: CS123456789
      /^BN\d{9}$/i,                    // Business Name: BN123456789
      /^G-\d{9}$/i,                    // Alternative format: G-123456789
    ],
    format: 'CS#########, BN#########, or G-#########',
    example: 'CS123456789 or BN123456789',
    description: 'Ghana Registrar General\'s Department (RGD) registration'
  },
  'Kenya': {
    patterns: [
      /^PVT-[A-Z0-9]{6,10}$/i,         // Private Limited: PVT-ABC123
      /^CPR\/\d{4}\/\d{6}$/i,          // Company Registration: CPR/2020/123456
      /^BN\/\d{6,8}$/i,                // Business Name: BN/123456
    ],
    format: 'PVT-XXXXXX or CPR/YYYY/XXXXXX',
    example: 'PVT-ABC123 or CPR/2020/123456',
    description: 'Kenya Business Registration Service (BRS)'
  },
  'South Africa': {
    patterns: [
      /^\d{4}\/\d{6}\/\d{2}$/,         // Company: 2020/123456/07
      /^K\d{10}$/i,                    // Close Corporation: K1234567890
      /^\d{10}$/,                      // 10-digit format
    ],
    format: 'YYYY/XXXXXX/XX or K##########',
    example: '2020/123456/07 or K1234567890',
    description: 'South Africa CIPC registration (Companies or Close Corporations)'
  },
  'Uganda': {
    patterns: [
      /^\d{8}$/,                       // 8-digit: 12345678
      /^[A-Z]{2,3}\d{6,8}$/i,         // Prefix + digits: UG123456
    ],
    format: '########',
    example: '12345678',
    description: 'Uganda Registration Services Bureau (URSB)'
  },
  'Tanzania': {
    patterns: [
      /^\d{11}$/,                      // 11-digit TIN
      /^\d{9}$/,                       // 9-digit registration
      /^[A-Z]{2,3}[-\s]?\d{6,9}$/i,   // Prefix format
    ],
    format: '###########',
    example: '12345678901',
    description: 'Tanzania BRELA registration'
  },
  'Rwanda': {
    patterns: [
      /^\d{9}$/,                       // 9-digit TIN
      /^RW\d{9}$/i,                    // RW prefix: RW123456789
    ],
    format: '#########',
    example: '123456789',
    description: 'Rwanda RDB registration'
  },
  'Ethiopia': {
    patterns: [
      /^TIN[-\s]?\d{10}$/i,            // TIN-1234567890
      /^\d{10}$/,                      // 10-digit TIN
    ],
    format: 'TIN-##########',
    example: 'TIN-1234567890',
    description: 'Ethiopia TIN (Tax Identification Number)'
  },
  'Zambia': {
    patterns: [
      /^\d{9}$/,                       // 9-digit TPIN
      /^TPIN[-\s]?\d{9}$/i,           // TPIN-123456789
    ],
    format: 'TPIN-#########',
    example: 'TPIN-123456789',
    description: 'Zambia TPIN (Taxpayer Identification Number)'
  },
  'Zimbabwe': {
    patterns: [
      /^\d{9}$/,                       // 9-digit registration
      /^[A-Z]{2,3}[-\s]?\d{6,8}$/i,   // Prefix + digits
    ],
    format: '#########',
    example: '123456789',
    description: 'Zimbabwe Registrar of Companies'
  },
  'Egypt': {
    patterns: [
      /^\d{9}$/,                       // 9-digit TIN
      /^\d{15}$/,                      // 15-digit unified number
    ],
    format: '#########',
    example: '123456789',
    description: 'Egypt Tax Authority registration'
  },
  'Morocco': {
    patterns: [
      /^\d{8}$/,                       // 8-digit IF
      /^IF[-\s]?\d{8}$/i,             // IF-12345678
    ],
    format: 'IF-########',
    example: 'IF-12345678',
    description: 'Morocco Tax Identifier (IF)'
  },
  'Côte d\'Ivoire': {
    patterns: [
      /^CI[-\s]?\d{10}$/i,            // CI-1234567890
      /^\d{10}$/,                      // 10-digit
    ],
    format: 'CI-##########',
    example: 'CI-1234567890',
    description: 'Côte d\'Ivoire company registration'
  },
};

// Fake/invalid patterns to detect suspicious registrations
const fakeRegistrationPatterns = [
  /^(RC|BN|IT|CS|PVT)-?0{6,}$/i,                    // All zeros
  /^(RC|BN|IT|CS|PVT)-?1{6,}$/i,                    // All ones
  /^(RC|BN|IT|CS|PVT)-?(123456|1234567|12345678)$/i, // Sequential
  /^(RC|BN|IT|CS|PVT)-?(987654|9876543|98765432)$/i, // Reverse sequential
  /^(RC|BN|IT|CS|PVT)-?(111111|222222|333333|444444|555555|666666|777777|888888|999999)$/i, // Repeated
  /^(test|demo|example|sample|fake)/i,              // Test words
];

// Common typos in registration prefixes
const commonPrefixTypos: Record<string, string> = {
  'CR': 'RC',
  'RN': 'BN',
  'NC': 'BN',
  'RD': 'RC',
};

export interface CompanyRegistrationValidation {
  isValid: boolean;
  error?: string;
  suggestion?: string;
  normalizedValue?: string;
  country?: string;
}

/**
 * Validates a company registration number
 * @param registrationNumber - The registration number to validate
 * @param country - The country for validation (defaults to Nigeria)
 * @returns Validation result with error messages and suggestions
 */
export function validateCompanyRegistration(
  registrationNumber: string,
  country: string = 'Nigeria'
): CompanyRegistrationValidation {
  // Basic validation
  if (!registrationNumber || typeof registrationNumber !== 'string') {
    return {
      isValid: false,
      error: 'Registration number is required'
    };
  }

  const trimmed = registrationNumber.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Registration number cannot be empty'
    };
  }

  if (trimmed.length < 6) {
    return {
      isValid: false,
      error: 'Registration number is too short (minimum 6 characters)'
    };
  }

  if (trimmed.length > 20) {
    return {
      isValid: false,
      error: 'Registration number is too long (maximum 20 characters)'
    };
  }

  // Check for fake patterns
  for (const pattern of fakeRegistrationPatterns) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: 'This registration number appears to be invalid. Please provide a valid business registration number.'
      };
    }
  }

  // Check for common prefix typos
  const upperTrimmed = trimmed.toUpperCase();
  for (const [typo, correct] of Object.entries(commonPrefixTypos)) {
    if (upperTrimmed.startsWith(typo)) {
      return {
        isValid: false,
        error: `Did you mean ${correct} instead of ${typo}?`,
        suggestion: upperTrimmed.replace(typo, correct)
      };
    }
  }

  // Get country-specific patterns
  const countryPatterns = companyRegistrationPatterns[country];
  
  if (!countryPatterns) {
    // Generic validation for countries without specific patterns
    const genericPattern = /^[A-Z0-9\-\/\s]{6,20}$/i;
    if (!genericPattern.test(trimmed)) {
      return {
        isValid: false,
        error: 'Invalid registration number format. Use only letters, numbers, hyphens, and forward slashes.'
      };
    }
    
    return {
      isValid: true,
      normalizedValue: trimmed.toUpperCase().replace(/\s+/g, '-'),
      country
    };
  }

  // Validate against country-specific patterns
  const isValidFormat = countryPatterns.patterns.some(pattern => pattern.test(trimmed));

  if (!isValidFormat) {
    return {
      isValid: false,
      error: `Invalid ${country} registration format. Expected: ${countryPatterns.format}`,
      suggestion: `Example: ${countryPatterns.example}`
    };
  }

  // Normalize the registration number
  let normalized = trimmed.toUpperCase();
  
  // Add hyphen after prefix if missing (for RC, BN, IT formats)
  if (/^(RC|BN|IT)\d/.test(normalized)) {
    normalized = normalized.replace(/^(RC|BN|IT)(\d)/, '$1-$2');
  }

  return {
    isValid: true,
    normalizedValue: normalized,
    country
  };
}

/**
 * Check if a registration number looks suspicious or fake
 */
export function isSuspiciousRegistration(registrationNumber: string): boolean {
  if (!registrationNumber) return true;
  
  const cleaned = registrationNumber.replace(/[^0-9]/g, '');
  
  // Check for patterns that indicate fake numbers
  if (cleaned.length >= 6) {
    // All same digit
    if (/^(\d)\1+$/.test(cleaned)) return true;
    
    // Sequential ascending
    if (cleaned === '123456' || cleaned === '1234567' || cleaned === '12345678') return true;
    
    // Sequential descending
    if (cleaned === '987654' || cleaned === '9876543' || cleaned === '98765432') return true;
  }
  
  return false;
}

/**
 * Get registration format information for a country
 */
export function getRegistrationFormatInfo(country: string): {
  format: string;
  example: string;
  description: string;
} | null {
  const patterns = companyRegistrationPatterns[country];
  if (!patterns) return null;
  
  return {
    format: patterns.format,
    example: patterns.example,
    description: patterns.description
  };
}
