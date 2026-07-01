// Currency configuration for multi-currency support
export interface CurrencyConfig {
  code: string
  symbol: string
  rate: number // Conversion rate from NGN (Naira)
  locale: string
  format: (amount: number) => string
  priceMultiplier?: number // Optional: Adjust display prices for market
}

export const currencies: Record<string, CurrencyConfig> = {
  NGN: {
    code: 'NGN',
    symbol: '₦',
    rate: 1,
    locale: 'en-NG',
    format: (amount: number) => `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  USD: {
    code: 'USD',
    symbol: '$',
    rate: 0.00063, // 1 NGN = ~0.00063 USD
    locale: 'en-US',
    format: (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    rate: 0.00049, // 1 NGN = ~0.00049 GBP
    locale: 'en-GB',
    format: (amount: number) => `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    rate: 0.00058, // 1 NGN = ~0.00058 EUR
    locale: 'de-DE',
    format: (amount: number) => `€${amount.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  GHS: {
    code: 'GHS',
    symbol: '₵',
    rate: 0.0095, // 1 NGN = ~0.0095 GHS (Ghana Cedi)
    locale: 'en-GH',
    format: (amount: number) => `₵${amount.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    rate: 0.011, // 1 NGN = ~0.011 ZAR (South African Rand)
    locale: 'en-ZA',
    format: (amount: number) => `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  KES: {
    code: 'KES',
    symbol: 'KSh',
    rate: 0.081, // 1 NGN = ~0.081 KES (Kenyan Shilling)
    locale: 'en-KE',
    format: (amount: number) => `KSh${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  EGP: {
    code: 'EGP',
    symbol: 'E£',
    rate: 0.031, // 1 NGN = ~0.031 EGP (Egyptian Pound)
    locale: 'ar-EG',
    format: (amount: number) => `E£${amount.toLocaleString('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  MAD: {
    code: 'MAD',
    symbol: 'MAD',
    rate: 0.0062, // 1 NGN = ~0.0062 MAD (Moroccan Dirham)
    locale: 'ar-MA',
    format: (amount: number) => `${amount.toLocaleString('en-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MAD`
  },
  DZD: {
    code: 'DZD',
    symbol: 'DZD',
    rate: 0.084, // 1 NGN = ~0.084 DZD (Algerian Dinar)
    locale: 'ar-DZ',
    format: (amount: number) => `${amount.toLocaleString('en-DZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} DZD`
  },
  TND: {
    code: 'TND',
    symbol: 'TND',
    rate: 0.0019, // 1 NGN = ~0.0019 TND (Tunisian Dinar)
    locale: 'ar-TN',
    format: (amount: number) => `${amount.toLocaleString('en-TN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} TND`
  },
  ETB: {
    code: 'ETB',
    symbol: 'Br',
    rate: 0.073, // 1 NGN = ~0.073 ETB (Ethiopian Birr)
    locale: 'am-ET',
    format: (amount: number) => `Br${amount.toLocaleString('en-ET', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  TZS: {
    code: 'TZS',
    symbol: 'TSh',
    rate: 1.62, // 1 NGN = ~1.62 TZS (Tanzanian Shilling)
    locale: 'sw-TZ',
    format: (amount: number) => `TSh${amount.toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  UGX: {
    code: 'UGX',
    symbol: 'USh',
    rate: 2.32, // 1 NGN = ~2.32 UGX (Ugandan Shilling)
    locale: 'en-UG',
    format: (amount: number) => `USh${amount.toLocaleString('en-UG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  RWF: {
    code: 'RWF',
    symbol: 'FRw',
    rate: 0.84, // 1 NGN = ~0.84 RWF (Rwandan Franc)
    locale: 'rw-RW',
    format: (amount: number) => `FRw${amount.toLocaleString('en-RW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  XOF: {
    code: 'XOF',
    symbol: 'CFA',
    rate: 0.38, // 1 NGN = ~0.38 XOF (West African CFA Franc)
    locale: 'fr-SN',
    format: (amount: number) => `${amount.toLocaleString('fr-SN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CFA`
  },
  XAF: {
    code: 'XAF',
    symbol: 'FCFA',
    rate: 0.38, // 1 NGN = ~0.38 XAF (Central African CFA Franc)
    locale: 'fr-CM',
    format: (amount: number) => `${amount.toLocaleString('fr-CM', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA`
  },
  AOA: {
    code: 'AOA',
    symbol: 'Kz',
    rate: 0.53, // Angolan Kwanza
    locale: 'pt-AO',
    format: (amount: number) => `Kz${amount.toLocaleString('pt-AO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  BWP: {
    code: 'BWP',
    symbol: 'P',
    rate: 0.0085, // Botswana Pula
    locale: 'en-BW',
    format: (amount: number) => `P${amount.toLocaleString('en-BW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  BIF: {
    code: 'BIF',
    symbol: 'FBu',
    rate: 1.83, // Burundian Franc
    locale: 'fr-BI',
    format: (amount: number) => `FBu${amount.toLocaleString('fr-BI', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  CVE: {
    code: 'CVE',
    symbol: 'Esc',
    rate: 0.064, // Cape Verdean Escudo
    locale: 'pt-CV',
    format: (amount: number) => `${amount.toLocaleString('pt-CV', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Esc`
  },
  KMF: {
    code: 'KMF',
    symbol: 'CF',
    rate: 0.28, // Comorian Franc
    locale: 'fr-KM',
    format: (amount: number) => `${amount.toLocaleString('fr-KM', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CF`
  },
  CDF: {
    code: 'CDF',
    symbol: 'FC',
    rate: 1.58, // Congolese Franc
    locale: 'fr-CD',
    format: (amount: number) => `${amount.toLocaleString('fr-CD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FC`
  },
  DJF: {
    code: 'DJF',
    symbol: 'Fdj',
    rate: 0.112, // Djiboutian Franc
    locale: 'fr-DJ',
    format: (amount: number) => `${amount.toLocaleString('fr-DJ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Fdj`
  },
  ERN: {
    code: 'ERN',
    symbol: 'Nfk',
    rate: 0.0094, // Eritrean Nakfa
    locale: 'en-ER',
    format: (amount: number) => `Nfk${amount.toLocaleString('en-ER', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  SZL: {
    code: 'SZL',
    symbol: 'E',
    rate: 0.011, // Swazi Lilangeni
    locale: 'en-SZ',
    format: (amount: number) => `E${amount.toLocaleString('en-SZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  GMD: {
    code: 'GMD',
    symbol: 'D',
    rate: 0.042, // Gambian Dalasi
    locale: 'en-GM',
    format: (amount: number) => `D${amount.toLocaleString('en-GM', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  GNF: {
    code: 'GNF',
    symbol: 'FG',
    rate: 5.42, // Guinean Franc
    locale: 'fr-GN',
    format: (amount: number) => `${amount.toLocaleString('fr-GN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FG`
  },
  LSL: {
    code: 'LSL',
    symbol: 'L',
    rate: 0.011, // Lesotho Loti
    locale: 'en-LS',
    format: (amount: number) => `L${amount.toLocaleString('en-LS', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  LRD: {
    code: 'LRD',
    symbol: 'L$',
    rate: 0.12, // Liberian Dollar
    locale: 'en-LR',
    format: (amount: number) => `L$${amount.toLocaleString('en-LR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  LYD: {
    code: 'LYD',
    symbol: 'LD',
    rate: 0.003, // Libyan Dinar
    locale: 'ar-LY',
    format: (amount: number) => `${amount.toLocaleString('en-LY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} LD`
  },
  MGA: {
    code: 'MGA',
    symbol: 'Ar',
    rate: 2.85, // Malagasy Ariary
    locale: 'fr-MG',
    format: (amount: number) => `${amount.toLocaleString('fr-MG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Ar`
  },
  MWK: {
    code: 'MWK',
    symbol: 'MK',
    rate: 1.09, // Malawian Kwacha
    locale: 'en-MW',
    format: (amount: number) => `MK${amount.toLocaleString('en-MW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  MRU: {
    code: 'MRU',
    symbol: 'UM',
    rate: 0.025, // Mauritanian Ouguiya
    locale: 'ar-MR',
    format: (amount: number) => `${amount.toLocaleString('en-MR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} UM`
  },
  MUR: {
    code: 'MUR',
    symbol: '₨',
    rate: 0.029, // Mauritian Rupee
    locale: 'en-MU',
    format: (amount: number) => `₨${amount.toLocaleString('en-MU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  MZN: {
    code: 'MZN',
    symbol: 'MT',
    rate: 0.04, // Mozambican Metical
    locale: 'pt-MZ',
    format: (amount: number) => `MT${amount.toLocaleString('pt-MZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  NAD: {
    code: 'NAD',
    symbol: 'N$',
    rate: 0.011, // Namibian Dollar
    locale: 'en-NA',
    format: (amount: number) => `N$${amount.toLocaleString('en-NA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  STN: {
    code: 'STN',
    symbol: 'Db',
    rate: 0.014, // São Tomé and Príncipe Dobra
    locale: 'pt-ST',
    format: (amount: number) => `Db${amount.toLocaleString('pt-ST', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  SCR: {
    code: 'SCR',
    symbol: '₨',
    rate: 0.0086, // Seychellois Rupee
    locale: 'en-SC',
    format: (amount: number) => `₨${amount.toLocaleString('en-SC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  SLL: {
    code: 'SLL',
    symbol: 'Le',
    rate: 13.2, // Sierra Leonean Leone
    locale: 'en-SL',
    format: (amount: number) => `Le${amount.toLocaleString('en-SL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  SOS: {
    code: 'SOS',
    symbol: 'Sh',
    rate: 0.36, // Somali Shilling
    locale: 'so-SO',
    format: (amount: number) => `Sh${amount.toLocaleString('en-SO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  SSP: {
    code: 'SSP',
    symbol: '£',
    rate: 0.82, // South Sudanese Pound
    locale: 'en-SS',
    format: (amount: number) => `£${amount.toLocaleString('en-SS', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  SDG: {
    code: 'SDG',
    symbol: 'SDG',
    rate: 0.38, // Sudanese Pound
    locale: 'ar-SD',
    format: (amount: number) => `${amount.toLocaleString('en-SD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} SDG`
  },
  ZMW: {
    code: 'ZMW',
    symbol: 'ZK',
    rate: 0.017, // Zambian Kwacha
    locale: 'en-ZM',
    format: (amount: number) => `ZK${amount.toLocaleString('en-ZM', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  },
  ZWL: {
    code: 'ZWL',
    symbol: 'Z$',
    rate: 0.2, // Zimbabwean Dollar
    locale: 'en-ZW',
    format: (amount: number) => `Z$${amount.toLocaleString('en-ZW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }
}

// Detect user's preferred currency based on browser language/location
export const detectUserCurrency = (): string => {
  if (typeof window === 'undefined') return 'NGN'
  
  const locale = navigator.language
  const countryCode = locale.split('-')[1]?.toUpperCase()
  
  // Map country codes to currencies
  const countryToCurrency: Record<string, string> = {
    'NG': 'NGN',
    'US': 'USD',
    'GB': 'GBP',
    'DE': 'EUR',
    'FR': 'EUR',
    'ES': 'EUR',
    'IT': 'EUR',
    'GH': 'GHS',
    'ZA': 'ZAR',
    'KE': 'KES'
  }
  
  return countryToCurrency[countryCode] || 'NGN'
}

// Map country names to currency codes
export const getCountryCurrency = (countryName: string): string => {
  const currencyMap: Record<string, string> = {
    // Major African currencies with full support
    'Nigeria': 'NGN',
    'Ghana': 'GHS',
    'South Africa': 'ZAR',
    'Kenya': 'KES',
    'Egypt': 'EGP',
    'Morocco': 'MAD',
    'Algeria': 'DZD',
    'Tunisia': 'TND',
    'Ethiopia': 'ETB',
    'Tanzania': 'TZS',
    'Uganda': 'UGX',
    'Rwanda': 'RWF',
    // West African CFA Franc (XOF) countries
    'Benin': 'XOF',
    'Burkina Faso': 'XOF',
    'Ivory Coast': 'XOF',
    'Guinea-Bissau': 'XOF',
    'Mali': 'XOF',
    'Niger': 'XOF',
    'Senegal': 'XOF',
    'Togo': 'XOF',
    // Central African CFA Franc (XAF) countries
    'Cameroon': 'XAF',
    'Central African Republic': 'XAF',
    'Chad': 'XAF',
    'Congo (Brazzaville)': 'XAF',
    'Equatorial Guinea': 'XAF',
    'Gabon': 'XAF',
    // Other African currencies
    'Angola': 'AOA',
    'Botswana': 'BWP',
    'Burundi': 'BIF',
    'Cape Verde': 'CVE',
    'Comoros': 'KMF',
    'Congo (Kinshasa)': 'CDF',
    'Djibouti': 'DJF',
    'Eritrea': 'ERN',
    'Eswatini': 'SZL',
    'Gambia': 'GMD',
    'Guinea': 'GNF',
    'Lesotho': 'LSL',
    'Liberia': 'LRD',
    'Libya': 'LYD',
    'Madagascar': 'MGA',
    'Malawi': 'MWK',
    'Mauritania': 'MRU',
    'Mauritius': 'MUR',
    'Mozambique': 'MZN',
    'Namibia': 'NAD',
    'São Tomé and Príncipe': 'STN',
    'Seychelles': 'SCR',
    'Sierra Leone': 'SLL',
    'Somalia': 'SOS',
    'South Sudan': 'SSP',
    'Sudan': 'SDG',
    'Zambia': 'ZMW',
    'Zimbabwe': 'ZWL',
    // International
    'United States': 'USD',
    'United Kingdom': 'GBP',
    'Germany': 'EUR',
    'France': 'EUR',
    'Spain': 'EUR',
    'Italy': 'EUR',
  }
  return currencyMap[countryName] || 'NGN'
}

// Convert price from NGN to target currency
export const convertPrice = (priceInNGN: number, targetCurrency: string): number => {
  const currency = currencies[targetCurrency] || currencies.NGN
  return priceInNGN * currency.rate
}

// Format price in the specified currency
export const formatPrice = (priceInNGN: number, targetCurrency: string): string => {
  const currency = currencies[targetCurrency] || currencies.NGN
  const convertedAmount = convertPrice(priceInNGN, targetCurrency)
  return currency.format(convertedAmount)
}

// Get currency symbol
export const getCurrencySymbol = (currencyCode: string): string => {
  return currencies[currencyCode]?.symbol || '₦'
}
