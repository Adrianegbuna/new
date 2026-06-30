import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { detectUserCurrency, formatPrice, currencies } from '@/lib/currency'

interface CurrencyContextType {
  currency: string
  setCurrency: (currency: string) => void
  formatPrice: (priceInNGN: number) => string
  availableCurrencies: string[]
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Initialize with Nigeria as default since the site is targeting Nigeria
  const [currency, setCurrencyState] = useState<string>('NGN')

  // Map country names to currency codes
  const countryToCurrency: { [key: string]: string } = {
    'Nigeria': 'NGN',
    'Kenya': 'KES',
    'Ghana': 'GHS',
    'South Africa': 'ZAR',
    'Egypt': 'EGP',
    'Morocco': 'MAD',
    'Algeria': 'DZD',
    'Tunisia': 'TND',
    'Ethiopia': 'ETB',
    'Tanzania': 'TZS',
    'Uganda': 'UGX',
    'Rwanda': 'RWF',
    'Cameroon': 'XAF',
    'Ivory Coast': 'XOF',
    'Senegal': 'XOF',
    'Mali': 'XOF',
    'Benin': 'XOF',
    'Burkina Faso': 'XOF',
    'Guinea': 'GNF',
    'Botswana': 'BWP',
    'Namibia': 'NAD',
    'Zambia': 'ZMW',
    'Zimbabwe': 'ZWL',
    'Mauritius': 'MUR',
    'Seychelles': 'SCR'
  }

  const updateCurrencyFromLocation = () => {
    if (typeof window === 'undefined') return null
    
    const location = localStorage.getItem('renewablezmart_location')
    if (location) {
      try {
        const { country } = JSON.parse(location)
        const locationCurrency = countryToCurrency[country] || 'NGN'
        setCurrencyState(locationCurrency)
        return locationCurrency
      } catch (e) {
        console.error('Error parsing location:', e)
      }
    }
    return null
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    // First, try to get currency from stored location
    const locationCurrency = updateCurrencyFromLocation()
    
    if (!locationCurrency) {
      // Fallback to saved preference
      const savedCurrency = localStorage.getItem('preferredCurrency')
      if (savedCurrency && currencies[savedCurrency]) {
        setCurrencyState(savedCurrency)
      } else {
        // Default to NGN (Nigeria) for this site
        setCurrencyState('NGN')
      }
    }

    // Listen for storage changes (when location is updated in another component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'renewablezmart_location') {
        updateCurrencyFromLocation()
      }
    }

    // Listen for custom location change event
    const handleLocationChanged = () => {
      updateCurrencyFromLocation()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('locationChanged', handleLocationChanged)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('locationChanged', handleLocationChanged)
    }
  }, [])

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency)
    localStorage.setItem('preferredCurrency', newCurrency)
  }

  const formatPriceInCurrency = (priceInNGN: number): string => {
    return formatPrice(priceInNGN, currency)
  }

  const availableCurrencies = Object.keys(currencies)

  return (
    <CurrencyContext.Provider 
      value={{ 
        currency, 
        setCurrency, 
        formatPrice: formatPriceInCurrency,
        availableCurrencies
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
