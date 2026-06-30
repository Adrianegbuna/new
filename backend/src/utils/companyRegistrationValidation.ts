/**
 * Company Registration Number Validation Utility (Backend)
 * 
 * Server-side validation for business registration numbers
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
      /^RC[-\s]?\d{6,8}$/i,
      /^BN[-\s]?\d{6,8}$/i,
      /^IT[-\s]?\d{6,8}$/i,
      /^\d{8}$/,
    ],
    format: 'RC-XXXXXX, BN-XXXXXX, or IT-XXXXXX',
    example: 'RC-1234567 or BN-1234567',
    description: 'Nigeria CAC registration'
  },
  'Ghana': {
    patterns: [
      /^CS\d{9}$/i,
      /^BN\d{9}$/i,
      /^G-\d{9}$/i,
    ],
    format: 'CS#########, BN#########, or G-#########',
    example: 'CS123456789',
    description: 'Ghana RGD registration'
  },
  'Kenya': {
    patterns: [
      /^PVT-[A-Z0-9]{6,10}$/i,
      /^CPR\/\d{4}\/\d{6}$/i,
      /^BN\/\d{6,8}$/i,
    ],
    format: 'PVT-XXXXXX or CPR/YYYY/XXXXXX',
    example: 'PVT-ABC123',
    description: 'Kenya BRS registration'
  },
  'South Africa': {
    patterns: [
      /^\d{4}\/\d{6}\/\d{2}$/,
      /^K\d{10}$/i,
      /^\d{10}$/,
    ],
    format: 'YYYY/XXXXXX/XX or K##########',
    example: '2020/123456/07',
    description: 'South Africa CIPC registration'
  },
  'Uganda': {
    patterns: [
      /^\d{8}$/,
      /^[A-Z]{2,3}\d{6,8}$/i,
    ],
    format: '########',
    example: '12345678',
    description: 'Uganda URSB registration'
  },
  'Tanzania': {
    patterns: [
      /^\d{11}$/,
      /^\d{9}$/,
      /^[A-Z]{2,3}[-\s]?\d{6,9}$/i,
    ],
    format: '###########',
    example: '12345678901',
    description: 'Tanzania BRELA registration'
  },
  'Rwanda': {
    patterns: [
      /^\d{9}$/,
      /^RW\d{9}$/i,
    ],
    format: '#########',
    example: '123456789',
    description: 'Rwanda RDB registration'
  },
  'Ethiopia': {
    patterns: [
      /^TIN[-\s]?\d{10}$/i,
      /^\d{10}$/,
    ],
    format: 'TIN-##########',
    example: 'TIN-1234567890',
    description: 'Ethiopia TIN'
  },
  'Zambia': {
    patterns: [
      /^\d{9}$/,
      /^TPIN[-\s]?\d{9}$/i,
    ],
    format: 'TPIN-#########',
    example: 'TPIN-123456789',
    description: 'Zambia TPIN'
  },
  'Zimbabwe': {
    patterns: [
      /^\d{9}$/,
      /^[A-Z]{2,3}[-\s]?\d{6,8}$/i,
    ],
    format: '#########',
    example: '123456789',
    description: 'Zimbabwe registration'
  },
  'Egypt': {
    patterns: [
      /^\d{9}$/,
      /^\d{15}$/,
    ],
    format: '#########',
    example: '123456789',
    description: 'Egypt Tax Authority'
  },
  'Morocco': {
    patterns: [
      /^\d{8}$/,
      /^IF[-\s]?\d{8}$/i,
    ],
    format: 'IF-########',
    example: 'IF-12345678',
    description: 'Morocco Tax Identifier'
  },
  'Côte d\'Ivoire': {
    patterns: [
      /^CI[-\s]?\d{10}$/i,
      /^\d{10}$/,
    ],
    format: 'CI-##########',
    example: 'CI-1234567890',
    description: 'Côte d\'Ivoire registration'
  },
};

const fakeRegistrationPatterns = [
  /^(RC|BN|IT|CS|PVT)-?0{6,}$/i,
  /^(RC|BN|IT|CS|PVT)-?1{6,}$/i,
  /^(RC|BN|IT|CS|PVT)-?(123456|1234567|12345678)$/i,
  /^(RC|BN|IT|CS|PVT)-?(987654|9876543|98765432)$/i,
  /^(RC|BN|IT|CS|PVT)-?(111111|222222|333333|444444|555555|666666|777777|888888|999999)$/i,
  /^(test|demo|example|sample|fake)/i,
];

export interface CompanyRegistrationValidation {
  isValid: boolean;
  error?: string;
  suggestion?: string;
  normalizedValue?: string;
  country?: string;
}

export function validateCompanyRegistration(
  registrationNumber: string,
  country: string = 'Nigeria'
): CompanyRegistrationValidation {
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

  const countryPatterns = companyRegistrationPatterns[country];
  
  if (!countryPatterns) {
    const genericPattern = /^[A-Z0-9\-\/\s]{6,20}$/i;
    if (!genericPattern.test(trimmed)) {
      return {
        isValid: false,
        error: 'Invalid registration number format'
      };
    }
    
    return {
      isValid: true,
      normalizedValue: trimmed.toUpperCase().replace(/\s+/g, '-'),
      country
    };
  }

  const isValidFormat = countryPatterns.patterns.some(pattern => pattern.test(trimmed));

  if (!isValidFormat) {
    return {
      isValid: false,
      error: `Invalid ${country} registration format. Expected: ${countryPatterns.format}`,
      suggestion: `Example: ${countryPatterns.example}`
    };
  }

  let normalized = trimmed.toUpperCase();
  
  if (/^(RC|BN|IT)\d/.test(normalized)) {
    normalized = normalized.replace(/^(RC|BN|IT)(\d)/, '$1-$2');
  }

  return {
    isValid: true,
    normalizedValue: normalized,
    country
  };
}

export function isSuspiciousRegistration(registrationNumber: string): boolean {
  if (!registrationNumber) return true;
  
  const cleaned = registrationNumber.replace(/[^0-9]/g, '');
  
  if (cleaned.length >= 6) {
    if (/^(\d)\1+$/.test(cleaned)) return true;
    if (cleaned === '123456' || cleaned === '1234567' || cleaned === '12345678') return true;
    if (cleaned === '987654' || cleaned === '9876543' || cleaned === '98765432') return true;
  }
  
  return false;
}
