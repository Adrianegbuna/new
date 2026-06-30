import Head from 'next/head'
import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/apiConfig'
import styles from '@/styles/installers.module.css'

interface Installer {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  certifications: string
  yearsOfExperience: number
  serviceAreas: string
  country?: string
  city?: string
  bio?: string
  profilePhoto?: string
  rating?: number
  completedProjects?: number
  completedJobs?: number
  verified?: boolean
  profileImage?: string
  companyName?: string
}

export default function AllInstallersPage() {
  const [installers, setInstallers] = useState<Installer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedCountry, setSelectedCountry] = useState('Nigeria')
  const [sortFilter, setSortFilter] = useState('all')

  useEffect(() => {
    const savedLocation = typeof window !== 'undefined' ? localStorage.getItem('renewablezmart_location') : null
    if (savedLocation) {
      const { country } = JSON.parse(savedLocation)
      setSelectedCountry(country)
    }

    const fetchInstallers = async () => {
      try {
        const apiBase = getApiBaseUrl()
        const response = await fetch(`${apiBase}/installers`)
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            setInstallers(data)
          } else {
            setInstallers([])
          }
        } else {
          setInstallers([])
        }
      } catch (error) {
        setError('Failed to load installers. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchInstallers()
  }, [])

  const filteredInstallers = installers.filter(installer => {
    const matchesSearch = !searchQuery || 
      (installer.firstName && installer.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (installer.lastName && installer.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (installer.certifications && installer.certifications.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (installer.serviceAreas && installer.serviceAreas.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesLocation = selectedLocation === 'all' || 
      (installer.serviceAreas && installer.serviceAreas.toLowerCase().includes(selectedLocation.toLowerCase()))
    return matchesSearch && matchesLocation
  })

  let sortedInstallers = [...filteredInstallers]
  if (sortFilter === 'verified') {
    sortedInstallers = sortedInstallers.filter((i) => i.verified === true)
  } else if (sortFilter === 'experienced') {
    sortedInstallers.sort((a, b) => b.yearsOfExperience - a.yearsOfExperience)
  }

  const countryInstallers = installers.filter(i => i.country === selectedCountry)
  const serviceAreasSet = new Set<string>()
  countryInstallers.forEach(installer => {
    installer.serviceAreas.split(',').forEach(area => {
      serviceAreasSet.add(area.trim())
    })
  })
  const uniqueServiceAreas = Array.from(serviceAreasSet).sort()

  return (
    <div className={styles.installersContainer}>
      <Head>
        <title>All Installers - RenewableZmart</title>
        <meta name="description" content="Browse all RenewableZmart installers" />
      </Head>
      <Header />

      <main>
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold mb-3">👷 All Installers</h1>
            <p className="text-xl text-white/90">Browse the full installer network</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name, certification, or location..."
                  className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600 text-black font-bold placeholder:text-gray-900"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className="px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option value="all">All Locations</option>
                {uniqueServiceAreas.map(area => (
                  <option key={area} value={area.toLowerCase()}>{area}</option>
                ))}
              </select>
              <select 
                className="px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold"
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value)}
              >
                <option value="all">All Installers</option>
                <option value="verified">Verified Only</option>
                <option value="experienced">Most Experienced</option>
              </select>
              <Link href="/installers" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center justify-center">
                Back to installers
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
                <div className="text-gray-900 font-bold">Loading installers...</div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Installers</h3>
              <p className="text-gray-900 font-bold mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                Try Again
              </button>
            </div>
          ) : installers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No installers in database</h3>
              <p className="text-gray-900 font-bold mb-6">There are currently no registered installers. Please check back later.</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                Refresh
              </button>
            </div>
          ) : sortedInstallers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No installers found</h3>
              <p className="text-gray-900 font-bold mb-6">
                {searchQuery ? `No installers match "${searchQuery}"` : 'No installers available for the selected criteria.'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedLocation('all')
                  setSortFilter('all')
                }}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
                {sortedInstallers.map((installer) => (
                  <Link href={`/installer/${installer.id}`} key={installer.id}>
                    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden group">
                      <div className="h-12 bg-gradient-to-br from-emerald-500 to-teal-500 relative flex items-center justify-start pl-2">
                        <div 
                          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center overflow-hidden"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          {installer.profilePhoto || installer.profileImage ? (
                            <img 
                              src={installer.profilePhoto || installer.profileImage}
                              alt={installer.firstName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <span className="text-lg">👷</span>
                          )}
                        </div>
                      </div>

                      <div className="px-2 py-2">
                        <h3 className="text-xs sm:text-sm font-bold text-blue-950 mb-1 group-hover:text-blue-950 transition line-clamp-1" style={{ color: '#172554', fontWeight: 700 }}>
                          {installer.firstName} {installer.lastName}
                        </h3>
                        {installer.companyName && (
                          <p className="text-[8px] sm:text-xs text-emerald-600 font-semibold mb-1 line-clamp-1">{installer.companyName}</p>
                        )}

                        <div className="text-[9px] sm:text-xs text-black font-bold mb-0.5">
                          <div>🛠️ {installer.completedProjects || installer.completedJobs || 0}</div>
                          <div>📍 {installer.city || installer.country || 'Nigeria'}</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
