// Phone validation utility for backend
// Validates phone numbers based on country-specific formats

interface PhonePattern {
  regex: RegExp;
  format: string;
  minLength: number;
  maxLength: number;
}

const countryPhonePatterns: Record<string, PhonePattern> = {
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
  }
};

// List of common fake/test phone numbers to block
const blacklistedPatterns = [
  /^(0{10,}|1{10,}|2{10,}|3{10,}|4{10,}|5{10,}|6{10,}|7{10,}|8{10,}|9{10,})$/,
  /^(123456789|987654321|111111111|000000000)$/,
  /^(555.*|000.*|999.*)$/,
];

export function validatePhoneNumber(phoneNumber: string, country: string): { isValid: boolean; error?: string } {
  const cleanedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

  if (!cleanedPhone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Check for blacklisted patterns
  for (const pattern of blacklistedPatterns) {
    if (pattern.test(cleanedPhone)) {
      return { isValid: false, error: 'This appears to be a fake or test number. Please enter a valid phone number.' };
    }
  }

  const pattern = countryPhonePatterns[country];
  
  if (!pattern) {
    const basicRegex = /^\+?[1-9][0-9]{7,14}$/;
    if (!basicRegex.test(cleanedPhone)) {
      return { isValid: false, error: 'Please enter a valid phone number' };
    }
    return { isValid: true };
  }

  if (cleanedPhone.length < pattern.minLength || cleanedPhone.length > pattern.maxLength) {
    return { 
      isValid: false, 
      error: `Phone number must be between ${pattern.minLength} and ${pattern.maxLength} digits for ${country}` 
    };
  }

  if (!pattern.regex.test(cleanedPhone)) {
    return { 
      isValid: false, 
      error: `Invalid phone number format for ${country}. Expected format: ${pattern.format}` 
    };
  }

  return { isValid: true };
}

export function formatPhoneNumber(phoneNumber: string, country: string): string {
  const cleanedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  if (country === 'Nigeria') {
    if (cleanedPhone.startsWith('0')) {
      return '+234' + cleanedPhone.substring(1);
    } else if (!cleanedPhone.startsWith('+') && !cleanedPhone.startsWith('234')) {
      return '+234' + cleanedPhone;
    }
  }

  return cleanedPhone.startsWith('+') ? cleanedPhone : '+' + cleanedPhone;
}
