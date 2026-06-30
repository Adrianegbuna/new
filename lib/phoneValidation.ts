// Phone validation utility for African countries
// Validates phone numbers based on country-specific formats

interface PhonePattern {
  regex: RegExp
  format: string
  minLength: number
  maxLength: number
}

export const countryPhonePatterns: Record<string, PhonePattern> = {
  'Nigeria': {
    regex: /^(\+234|234|0)(70|80|81|90|91|70[0-9]|80[0-9]|81[0-9]|90[0-9]|91[0-9])[0-9]{8}$/,
    format: '+234 XXX XXX XXXX',
    minLength: 11,
    maxLength: 14
  },
  'South Africa': {
    regex: /^(\+27|27|0)[1-8][0-9]{8}$/,
    format: '+27 XX XXX XXXX',
    minLength: 10,
    maxLength: 12
  },
  'Kenya': {
    regex: /^(\+254|254|0)[17][0-9]{8}$/,
    format: '+254 XXX XXX XXX',
    minLength: 10,
    maxLength: 13
  },
  'Ghana': {
    regex: /^(\+233|233|0)[2-5][0-9]{8}$/,
    format: '+233 XXX XXX XXX',
    minLength: 10,
    maxLength: 13
  },
  'Egypt': {
    regex: /^(\+20|20|0)[1][0-9]{9}$/,
    format: '+20 XXX XXX XXXX',
    minLength: 10,
    maxLength: 13
  },
  'Morocco': {
    regex: /^(\+212|212|0)[5-7][0-9]{8}$/,
    format: '+212 XXX XXX XXX',
    minLength: 10,
    maxLength: 13
  },
  'Algeria': {
    regex: /^(\+213|213|0)[5-7][0-9]{8}$/,
    format: '+213 XXX XXX XXX',
    minLength: 10,
    maxLength: 13
  },
  'Tunisia': {
    regex: /^(\+216|216)[2-9][0-9]{7}$/,
    format: '+216 XX XXX XXX',
    minLength: 11,
    maxLength: 12
  },
  'Uganda': {
    regex: /^(\+256|256|0)[37][0-9]{8}$/,
    format: '+256 XXX XXX XXX',
    minLength: 10,
    maxLength: 13
  },
  'Tanzania': {
    regex: /^(\+255|255|0)[67][0-9]{8}$/,
    format: '+255 XXX XXX XXX',
    minLength: 10,
    maxLength: 13
  },
  'Ethiopia': {
    regex: /^(\+251|251|0)[9][0-9]{8}$/,
    format: '+251 XX XXX XXXX',
    minLength: 10,
    maxLength: 13
  },
  'Cameroon': {
    regex: /^(\+237|237)[26][0-9]{8}$/,
    format: '+237 X XX XX XX XX',
    minLength: 12,
    maxLength: 12
  },
  'Ivory Coast': {
    regex: /^(\+225|225)[0-9]{10}$/,
    format: '+225 XX XX XX XX XX',
    minLength: 13,
    maxLength: 13
  },
  'Senegal': {
    regex: /^(\+221|221)[37][0-9]{8}$/,
    format: '+221 XX XXX XX XX',
    minLength: 12,
    maxLength: 12
  },
  'Zimbabwe': {
    regex: /^(\+263|263|0)[7][0-9]{8}$/,
    format: '+263 XX XXX XXXX',
    minLength: 10,
    maxLength: 13
  },
  'Rwanda': {
    regex: /^(\+250|250|0)[7][0-9]{8}$/,
    format: '+250 XXX XXX XXX',
    minLength: 10,
    maxLength: 13
  },
  'Zambia': {
    regex: /^(\+260|260|0)[79][0-9]{8}$/,
    format: '+260 XX XXX XXXX',
    minLength: 10,
    maxLength: 13
  },
  'Mozambique': {
    regex: /^(\+258|258|0)[8][0-9]{8}$/,
    format: '+258 XX XXX XXXX',
    minLength: 10,
    maxLength: 13
  },
  'Namibia': {
    regex: /^(\+264|264|0)[68][0-9]{7}$/,
    format: '+264 XX XXX XXXX',
    minLength: 9,
    maxLength: 12
  },
  'Botswana': {
    regex: /^(\+267|267|0)[7][0-9]{7}$/,
    format: '+267 XX XXX XXX',
    minLength: 8,
    maxLength: 11
  },
  'Angola': {
    regex: /^(\+244|244)[9][0-9]{8}$/,
    format: '+244 XXX XXX XXX',
    minLength: 12,
    maxLength: 12
  },
  'Benin': {
    regex: /^(\+229|229)[0-9]{8}$/,
    format: '+229 XX XX XX XX',
    minLength: 11,
    maxLength: 11
  },
  'Burkina Faso': {
    regex: /^(\+226|226)[0-9]{8}$/,
    format: '+226 XX XX XX XX',
    minLength: 11,
    maxLength: 11
  },
  'Burundi': {
    regex: /^(\+257|257)[67][0-9]{7}$/,
    format: '+257 XX XX XX XX',
    minLength: 11,
    maxLength: 11
  },
  'Chad': {
    regex: /^(\+235|235)[679][0-9]{7}$/,
    format: '+235 XX XX XX XX',
    minLength: 11,
    maxLength: 11
  },
  'Congo': {
    regex: /^(\+242|242)[0-9]{9}$/,
    format: '+242 XX XXX XXXX',
    minLength: 12,
    maxLength: 12
  },
  'DR Congo': {
    regex: /^(\+243|243)[0-9]{9}$/,
    format: '+243 XXX XXX XXX',
    minLength: 12,
    maxLength: 12
  },
  'Gabon': {
    regex: /^(\+241|241)[0-9]{7,8}$/,
    format: '+241 X XX XX XX',
    minLength: 10,
    maxLength: 11
  },
  'Gambia': {
    regex: /^(\+220|220)[0-9]{7}$/,
    format: '+220 XXX XXXX',
    minLength: 10,
    maxLength: 10
  },
  'Guinea': {
    regex: /^(\+224|224)[0-9]{9}$/,
    format: '+224 XXX XX XX XX',
    minLength: 12,
    maxLength: 12
  },
  'Liberia': {
    regex: /^(\+231|231)[0-9]{7,8}$/,
    format: '+231 XX XXX XXX',
    minLength: 10,
    maxLength: 11
  },
  'Libya': {
    regex: /^(\+218|218)[0-9]{9,10}$/,
    format: '+218 XX XXX XXXX',
    minLength: 12,
    maxLength: 13
  },
  'Madagascar': {
    regex: /^(\+261|261)[0-9]{9}$/,
    format: '+261 XX XX XXX XX',
    minLength: 12,
    maxLength: 12
  },
  'Malawi': {
    regex: /^(\+265|265)[0-9]{7,9}$/,
    format: '+265 X XX XX XX',
    minLength: 10,
    maxLength: 12
  },
  'Mali': {
    regex: /^(\+223|223)[0-9]{8}$/,
    format: '+223 XX XX XX XX',
    minLength: 11,
    maxLength: 11
  },
  'Mauritania': {
    regex: /^(\+222|222)[0-9]{8}$/,
    format: '+222 XX XX XX XX',
    minLength: 11,
    maxLength: 11
  },
  'Mauritius': {
    regex: /^(\+230|230)[0-9]{8}$/,
    format: '+230 XXXX XXXX',
    minLength: 11,
    maxLength: 11
  },
  'Niger': {
    regex: /^(\+227|227)[0-9]{8}$/,
    format: '+227 XX XX XX XX',
    minLength: 11,
    maxLength: 11
  },
  'Sierra Leone': {
    regex: /^(\+232|232)[0-9]{8}$/,
    format: '+232 XX XXX XXX',
    minLength: 11,
    maxLength: 11
  },
  'Somalia': {
    regex: /^(\+252|252)[0-9]{7,9}$/,
    format: '+252 XX XXX XXX',
    minLength: 10,
    maxLength: 12
  },
  'Sudan': {
    regex: /^(\+249|249)[0-9]{9}$/,
    format: '+249 XX XXX XXXX',
    minLength: 12,
    maxLength: 12
  },
  'Togo': {
    regex: /^(\+228|228)[0-9]{8}$/,
    format: '+228 XX XX XX XX',
    minLength: 11,
    maxLength: 11
  }
}

// List of common fake/test phone numbers to block
const blacklistedPatterns = [
  /^(0{10,}|1{10,}|2{10,}|3{10,}|4{10,}|5{10,}|6{10,}|7{10,}|8{10,}|9{10,})$/,  // Repeated digits
  /^(123456789|987654321|111111111|000000000)$/,  // Sequential numbers
  /^(555.*|000.*|999.*)$/,  // Common test prefixes
]

/**
 * Validates a phone number for a specific country
 * @param phoneNumber - The phone number to validate
 * @param country - The country name
 * @returns Object with isValid boolean and error message
 */
export function validatePhoneNumber(phoneNumber: string, country: string): { isValid: boolean; error?: string } {
  // Remove all spaces, dashes, and parentheses
  const cleanedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '')

  // Check if phone number is empty
  if (!cleanedPhone) {
    return { isValid: false, error: 'Phone number is required' }
  }

  // Check for blacklisted patterns (fake numbers)
  for (const pattern of blacklistedPatterns) {
    if (pattern.test(cleanedPhone)) {
      return { isValid: false, error: 'This appears to be a fake or test number. Please enter a valid phone number.' }
    }
  }

  // Get pattern for the country
  const pattern = countryPhonePatterns[country]
  
  if (!pattern) {
    // If country pattern not found, do basic validation
    const basicRegex = /^\+?[1-9][0-9]{7,14}$/
    if (!basicRegex.test(cleanedPhone)) {
      return { isValid: false, error: 'Please enter a valid phone number' }
    }
    return { isValid: true }
  }

  // Check length
  if (cleanedPhone.length < pattern.minLength || cleanedPhone.length > pattern.maxLength) {
    return { 
      isValid: false, 
      error: `Phone number must be between ${pattern.minLength} and ${pattern.maxLength} digits for ${country}` 
    }
  }

  // Check pattern
  if (!pattern.regex.test(cleanedPhone)) {
    return { 
      isValid: false, 
      error: `Invalid phone number format for ${country}. Expected format: ${pattern.format}` 
    }
  }

  return { isValid: true }
}

/**
 * Formats a phone number according to country standards
 * @param phoneNumber - The phone number to format
 * @param country - The country name
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string, country: string): string {
  const cleanedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '')
  const pattern = countryPhonePatterns[country]
  
  if (!pattern) return phoneNumber

  // Add country code if missing
  if (country === 'Nigeria') {
    if (cleanedPhone.startsWith('0')) {
      return '+234' + cleanedPhone.substring(1)
    } else if (!cleanedPhone.startsWith('+') && !cleanedPhone.startsWith('234')) {
      return '+234' + cleanedPhone
    }
  }

  return cleanedPhone.startsWith('+') ? cleanedPhone : '+' + cleanedPhone
}

/**
 * Get phone validation info for a country
 * @param country - The country name
 * @returns Phone pattern info or null
 */
export function getPhoneInfo(country: string): PhonePattern | null {
  return countryPhonePatterns[country] || null
}
