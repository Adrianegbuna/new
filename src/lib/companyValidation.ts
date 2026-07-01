/**
 * Company Registration Number Validation
 * Validates business registration numbers for different African countries
 */

import { validateCACRegistrationNumber, normalizeCACNumber } from './cacValidation';

interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
  normalizedValue?: string;
}

// Country-specific registration number patterns
const countryRegPatterns: Record<string, {
  pattern: RegExp;
  format: string;
  example: string;
}> = {
  'Nigeria': {
    pattern: /^(RC|BN|IT|LLP)-?\d{6,7}$/i,
    format: 'RC-XXXXXX (Limited Company), BN-XXXXXX (Business Name), IT-XXXXXX (Incorporated Trustees), or LLP-XXXXXX (Limited Liability Partnership)',
    example: 'RC-123456 or BN-789012'
  },
  'Ghana': {
    pattern: /^(CS|BN)-?\d{7,}$/i,
    format: 'CS-XXXXXXX (Company) or BN-XXXXXXX (Business)',
    example: 'CS-1234567'
  },
  'Kenya': {
    pattern: /^(C|BN|PVT|LLP)-?\d{6,}$/i,
    format: 'C-XXXXXX, BN-XXXXXX, PVT-XXXXXX, or LLP-XXXXXX',
    example: 'C-123456 or PVT-654321'
  },
  'South Africa': {
    pattern: /^\d{4}\/\d{6}\/\d{2}$|^\d{10}$/,
    format: 'YYYY/NNNNNN/NN or 10-digit number',
    example: '2020/123456/07 or 1234567890'
  },
  'Tanzania': {
    pattern: /^\d{9}$/,
    format: '9-digit number',
    example: '123456789'
  },
  'Uganda': {
    pattern: /^\d{10}$/,
    format: '10-digit number',
    example: '1234567890'
  },
  'Rwanda': {
    pattern: /^\d{9}$/,
    format: '9-digit number',
    example: '123456789'
  },
  'Ethiopia': {
    pattern: /^TIN-?\d{10}$/i,
    format: 'TIN-XXXXXXXXXX',
    example: 'TIN-1234567890'
  },
  'Egypt': {
    pattern: /^\d{9}$/,
    format: '9-digit Tax Registration Number',
    example: '123456789'
  },
  'Morocco': {
    pattern: /^(RC|IF)-?\d{6,}$/i,
    format: 'RC-XXXXXX (Commercial Register) or IF-XXXXXX (Tax ID)',
    example: 'RC-123456'
  },
  'Côte d\'Ivoire': {
    pattern: /^CI-[A-Z]{3}-\d{4}-[A-Z]$/i,
    format: 'CI-XXX-YYYY-X',
    example: 'CI-ABJ-2020-M'
  },
  'Senegal': {
    pattern: /^SN-?\d{13}$/i,
    format: 'SN-XXXXXXXXXXXXX (13 digits)',
    example: 'SN-1234567890123'
  },
  'Cameroon': {
    pattern: /^M\d{9}[A-Z]?$/i,
    format: 'M followed by 9 digits',
    example: 'M123456789'
  },
  'Zimbabwe': {
    pattern: /^\d{2}-\d{6}[A-Z]\d{2}$/i,
    format: 'XX-XXXXXXXYY',
    example: '12-345678A90'
  },
  'Zambia': {
    pattern: /^\d{10}$/,
    format: '10-digit PACRA number',
    example: '1234567890'
  },
  'Botswana': {
    pattern: /^BW\d{10}$/i,
    format: 'BW followed by 10 digits',
    example: 'BW1234567890'
  },
  'Namibia': {
    pattern: /^\d{10}$/,
    format: '10-digit number',
    example: '1234567890'
  }
};

// Default pattern for countries not specifically listed
const defaultPattern = {
  pattern: /^[A-Z0-9\-\/]{5,20}$/i,
  format: 'Alphanumeric with hyphens or slashes (5-20 characters)',
  example: 'REG-123456'
};

/**
 * Normalize registration number format
 */
function normalizeRegNumber(regNumber: string, country: string): string {
  let normalized = regNumber.trim().toUpperCase();
  
  // Add hyphen after prefix if missing (for most African countries)
  if (country === 'Nigeria') {
    normalized = normalized.replace(/^(RC|BN|IT|LLP)(\d)/i, '$1-$2');
  } else if (country === 'Ghana') {
    normalized = normalized.replace(/^(CS|BN)(\d)/i, '$1-$2');
  } else if (country === 'Kenya') {
    normalized = normalized.replace(/^(C|BN|PVT|LLP)(\d)/i, '$1-$2');
  } else if (country === 'Ethiopia') {
    normalized = normalized.replace(/^TIN(\d)/i, 'TIN-$1');
  } else if (country === 'Morocco') {
    normalized = normalized.replace(/^(RC|IF)(\d)/i, '$1-$2');
  }
  
  return normalized;
}

/**
 * Validate company registration number
 */
export function validateCompanyRegistration(regNumber: string, country: string = 'Nigeria'): ValidationResult {
  if (!regNumber || !regNumber.trim()) {
    return {
      isValid: false,
      error: 'Business registration number is required for vendor accounts'
    };
  }

  // Use enhanced CAC validation for Nigeria
  if (country === 'Nigeria') {
    const cacResult = validateCACRegistrationNumber(regNumber);
    return {
      isValid: cacResult.isValid,
      error: cacResult.error,
      suggestion: cacResult.suggestion,
      normalizedValue: cacResult.normalizedValue
    };
  }

  const trimmedRegNumber = regNumber.trim();
  
  // Check minimum length
  if (trimmedRegNumber.length < 5) {
    return {
      isValid: false,
      error: 'Business registration number is too short'
    };
  }

  // Check maximum length
  if (trimmedRegNumber.length > 20) {
    return {
      isValid: false,
      error: 'Business registration number is too long'
    };
  }

  // Get country-specific pattern
  const countryPattern = countryRegPatterns[country] || defaultPattern;
  const normalizedValue = normalizeRegNumber(trimmedRegNumber, country);

  // Test against pattern
  if (!countryPattern.pattern.test(normalizedValue)) {
    return {
      isValid: false,
      error: `Invalid business registration number format for ${country}`,
      suggestion: `Expected format: ${countryPattern.format}. Example: ${countryPattern.example}`
    };
  }

  return {
    isValid: true,
    normalizedValue
  };
}

/**
 * Get registration number format information for a country
 */
export function getRegNumberInfo(country: string): { format: string; example: string } {
  const pattern = countryRegPatterns[country] || defaultPattern;
  return {
    format: pattern.format,
    example: pattern.example
  };
}
