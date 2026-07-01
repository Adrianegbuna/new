/**
 * LocationDropdowns - Reusable component for country/city selection
 * - Fetches all countries from API on mount
 * - Dynamically fetches cities when country changes
 * - Falls back to hardcoded data if API unavailable
 * - Full debug logging with [FRONTEND] prefix
 */

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { africanCountries } from '@/data/locations'

interface Country {
  id: string
  name: string
  code: string
  flag?: string
  createdAt?: string
  updatedAt?: string
}

interface City {
  id: string
  name: string
  state?: string
  countryId?: string
  createdAt?: string
  updatedAt?: string
}

export interface LocationDropdownsProps {
  selectedCountry: string
  selectedCity: string
  onCountryChange: (country: string) => void
  onCityChange: (city: string) => void
  showLabel?: boolean
}

export const useLocationData = () => {
  const [countries, setCountries] = useState<Country[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loadingCountries, setLoadingCountries] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all countries on mount
  useEffect(() => {
    fetchCountries()
  }, [])

  const fetchCountries = async () => {
    try {
      setLoadingCountries(true)
      console.log('[FRONTEND] Fetching all countries from API')

      const response = await apiClient.get('/locations/countries')
      const fetchedCountries = response.data || []

      console.log(`[FRONTEND] Received ${fetchedCountries.length} countries from API`)
      setCountries(fetchedCountries)
      setError(null)
    } catch (err: any) {
      console.error('[FRONTEND ERROR] Failed to fetch countries:', err?.message)
      console.log('[FRONTEND] Falling back to hardcoded location data')

      // Fallback to hardcoded data
      const hardcodedCountries = africanCountries.map((c: any, idx: number) => ({
        id: `hardcoded-${idx}`,
        name: c.name,
        code: c.code || c.name.substring(0, 2).toUpperCase(),
        flag: c.flag,
      }))

      setCountries(hardcodedCountries)
      setError(err?.message || 'Failed to fetch countries')
    } finally {
      setLoadingCountries(false)
    }
  }

  const fetchCitiesForCountry = async (countryId: string, countryName?: string) => {
    if (!countryId) {
      setCities([])
      return
    }

    try {
      setLoadingCities(true)
      console.log(`[FRONTEND] Fetching cities for country ID: ${countryId}`)

      const response = await apiClient.get(`/locations/countries/${countryId}/cities`)
      const fetchedCities = response.data || []

      console.log(`[FRONTEND] Received ${fetchedCities.length} cities for ${countryName || countryId}`)
      setCities(fetchedCities)
      setError(null)
    } catch (err: any) {
      console.error(`[FRONTEND ERROR] Failed to fetch cities for ${countryId}:`, err?.message)
      console.log('[FRONTEND] Using hardcoded cities as fallback')

      // Fallback to hardcoded data
      const country = africanCountries.find((c: any) => c.name === countryName)
      if (country) {
        const fallbackCities = (country.states || country.cities || []).map((name: string, idx: number) => ({
          id: `fallback-${idx}`,
          name,
          state: name,
        }))
        setCities(fallbackCities)
      }

      setError(err?.message || 'Failed to fetch cities')
    } finally {
      setLoadingCities(false)
    }
  }

  return {
    countries,
    cities,
    loadingCountries,
    loadingCities,
    error,
    fetchCountries,
    fetchCitiesForCountry,
  }
}

export default function LocationDropdowns({
  selectedCountry,
  selectedCity,
  onCountryChange,
  onCityChange,
  showLabel = true,
}: LocationDropdownsProps) {
  const { countries, cities, loadingCountries, loadingCities, fetchCitiesForCountry } = useLocationData()

  const handleCountryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryName = e.target.value
    console.log(`[FRONTEND] Country changed to: ${countryName}`)

    onCountryChange(countryName)

    // Find country by name to get ID
    const country = countries.find(c => c.name === countryName)
    if (country?.id) {
      await fetchCitiesForCountry(country.id, countryName)
    } else {
      // If no ID found, try with hardcoded as fallback
      await fetchCitiesForCountry(countryName, countryName)
    }

    // Reset city selection when country changes
    onCityChange('')
  }

  return (
    <>
      <div>
        {showLabel && <label className="block font-bold text-black mb-2 text-sm">Country</label>}
        <select
          className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-teal-600 text-sm text-black font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
          value={selectedCountry}
          onChange={handleCountryChange}
          disabled={loadingCountries || countries.length === 0}
        >
          <option value="">Select Country</option>
          {countries.map(country => (
            <option key={country.id} value={country.name}>
              {country.flag ? `${country.flag} ` : ''}{country.name}
            </option>
          ))}
        </select>
        {loadingCountries && <p className="text-xs text-black dark:text-white font-bold mt-1">Loading countries...</p>}
      </div>

      <div>
        {showLabel && <label className="block font-bold text-black mb-2 text-sm">City / State</label>}
        <select
          className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-teal-600 text-sm text-black font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
          value={selectedCity}
          onChange={e => {
            console.log(`[FRONTEND] City changed to: ${e.target.value}`)
            onCityChange(e.target.value)
          }}
          disabled={loadingCities || !selectedCountry || cities.length === 0}
        >
          <option value="">Select City</option>
          {cities.map(city => (
            <option key={city.id} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>
        {loadingCities && <p className="text-xs text-black dark:text-white font-bold mt-1">Loading cities...</p>}
        {!selectedCountry && <p className="text-xs text-black dark:text-white font-bold mt-1">Select country first</p>}
        {selectedCountry && cities.length === 0 && !loadingCities && (
          <p className="text-xs text-orange-600 mt-1">No cities available for this country</p>
        )}
      </div>
    </>
  )
}

