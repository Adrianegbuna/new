import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import { useState, useEffect, MouseEvent, useRef } from 'react'
import { africanCountries } from '@/data/locations'
import { getCountryCurrency } from '@/lib/currency'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { useRouter } from 'next/router'
import NotificationBell from '@/components/ui/NotificationBell'
import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/lib/api-client'
import { uploadImageToS3 } from '@/lib/s3ImageUploader'
import { getCleanS3Url } from '@/lib/previewUtils'
import { ensureWishlistSync, fetchWishlistCount } from '@/lib/wishlist-api'
import { openLiveChatPopup, OPEN_LIVE_CHAT_EVENT } from '@/lib/liveChat'
import { io, Socket } from 'socket.io-client'

const ADMIN_CHAT_SEEN_EVENT = 'rz_admin_chat_seen'

// Header component - All Categories menu removed
interface CurrentUser {
  firstName?: string
  lastName?: string
  email: string
  accountType?: 'vendor' | 'customer' | string
  role?: 'VENDOR' | 'CUSTOMER' | string
}

interface HeaderProps {
  onCategoryChange?: (category: string) => void
}

type Country = {
  name: string
  flag?: string
  states?: string[]
  cities?: string[]
}

// Derive ISO country code from flag emoji (works cross-platform)
const emojiToCountryCode = (emoji?: string): string => {
  if (!emoji) return 'UN'
  const codePoints = Array.from(emoji)
    .map((c) => c.codePointAt(0) ?? 0)
    .filter((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff)
  if (codePoints.length < 2) return 'UN'
  const letters = codePoints
    .map((cp) => String.fromCharCode(cp - 0x1f1e6 + 65))
    .join('')
  return letters || 'UN'
}

// Comprehensive country name to ISO code mapping
const getCountryISOCode = (countryName: string): string => {
  const countryMap: Record<string, string> = {
    'Nigeria': 'NG',
    'Algeria': 'DZ',
    'Angola': 'AO',
    'Benin': 'BJ',
    'Botswana': 'BW',
    'Burkina Faso': 'BF',
    'Burundi': 'BI',
    'Cameroon': 'CM',
    'Cape Verde': 'CV',
    'Central African Republic': 'CF',
    'Chad': 'TD',
    'Comoros': 'KM',
    'Congo (Brazzaville)': 'CG',
    'Congo (Kinshasa)': 'CD',
    'Djibouti': 'DJ',
    'Egypt': 'EG',
    'Equatorial Guinea': 'GQ',
    'Eritrea': 'ER',
    'Eswatini': 'SZ',
    'Ethiopia': 'ET',
    'Gabon': 'GA',
    'Gambia': 'GM',
    'Ghana': 'GH',
    'Guinea': 'GN',
    'Guinea-Bissau': 'GW',
    'Ivory Coast': 'CI',
    'Kenya': 'KE',
    'Lesotho': 'LS',
    'Liberia': 'LR',
    'Libya': 'LY',
    'Madagascar': 'MG',
    'Malawi': 'MW',
    'Mali': 'ML',
    'Mauritania': 'MR',
    'Mauritius': 'MU',
    'Morocco': 'MA',
    'Mozambique': 'MZ',
    'Namibia': 'NA',
    'Niger': 'NE',
    'Rwanda': 'RW',
    'S\u00E3o Tom\u00E9 and Pr\u00EDncipe': 'ST',
    'Senegal': 'SN',
    'Seychelles': 'SC',
    'Sierra Leone': 'SL',
    'Somalia': 'SO',
    'South Africa': 'ZA',
    'South Sudan': 'SS',
    'Sudan': 'SD',
    'Tanzania': 'TZ',
    'Togo': 'TG',
    'Tunisia': 'TN',
    'Uganda': 'UG',
    'Zambia': 'ZM',
    'Zimbabwe': 'ZW'
  }
  return countryMap[countryName] || countryName.substring(0, 2).toUpperCase()
}

interface Category {
  id: string
  name: string
  icon?: string
  displayOrder?: number
  subcategories?: Array<{ id: string; name: string }>
}

export default function Header({ onCategoryChange }: HeaderProps = {}) {
  const { cart } = useCart()
  const { currency, setCurrency, availableCurrencies } = useCurrency()
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuthStore()
  const count = cart.reduce((s: number, p: { qty: number }) => s + (p.qty || 0), 0)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false)
  const [selectedCountry, setSelectedCountry] = useState<string>('Nigeria')
  const [selectedCity, setSelectedCity] = useState<string>('Lagos')
  const [searchLocation, setSearchLocation] = useState<string>('')
  const [mounted, setMounted] = useState<boolean>(false)
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false)
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false)
  const [showHelpMenu, setShowHelpMenu] = useState<boolean>(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesOpen, setCategoriesOpen] = useState<boolean>(false)
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [apiCountries, setApiCountries] = useState<any[]>([])
  const [apiCities, setApiCities] = useState<any[]>([])
  const [loadingCountries, setLoadingCountries] = useState<boolean>(false)
  const [loadingCities, setLoadingCities] = useState<boolean>(false)
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false)
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [wishlistCount, setWishlistCount] = useState<number>(0)
  const [chatSessionId, setChatSessionId] = useState<string>('')
  const [liveChatUnreadCount, setLiveChatUnreadCount] = useState<number>(0)
  const [adminChatUnreadCount, setAdminChatUnreadCount] = useState<number>(0)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const touchStartTargetRef = useRef<EventTarget | null>(null)
  const adminChatLatestSignatureRef = useRef<Record<string, string>>({})

  // Refs for click-outside detection
  const userMenuRef = useRef<HTMLDivElement>(null)
  const helpMenuRef = useRef<HTMLDivElement>(null)
  const categoriesWrapperRef = useRef<HTMLDivElement>(null)
  const categoriesCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const getLiveChatSeenKey = () => {
    const identity = user?.id ? `user:${user.id}` : chatSessionId ? `guest:${chatSessionId}` : 'guest:anon'
    return `rz_live_chat_last_seen_${identity}`
  }

  const markLiveChatAsSeen = () => {
    if (typeof window === 'undefined') return
    localStorage.setItem(getLiveChatSeenKey(), new Date().toISOString())
    setLiveChatUnreadCount(0)
  }

  const refreshLiveChatUnreadCount = async () => {
    if (typeof window === 'undefined') return
    try {
      const apiBase = getApiBaseUrl()
      const storageKey = getLiveChatSeenKey()
      const lastSeenRaw = localStorage.getItem(storageKey)
      const lastSeenMs = lastSeenRaw ? new Date(lastSeenRaw).getTime() : 0

      let response: Response | null = null
      if (token && user?.id) {
        response = await fetch(`${apiBase}/chat/history?limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else if (chatSessionId) {
        response = await fetch(`${apiBase}/chat/guest-history?limit=50&sessionId=${encodeURIComponent(chatSessionId)}`)
      }

      if (!response?.ok) return
      const payload = await response.json()
      const messages = Array.isArray(payload?.messages) ? payload.messages : []

      const unread = messages.filter((msg: any) => {
        const role = String(msg?.role || '').toLowerCase()
        if (role !== 'human') return false
        const createdAtMs = msg?.createdAt ? new Date(msg.createdAt).getTime() : 0
        return createdAtMs > lastSeenMs
      }).length

      setLiveChatUnreadCount(unread > 99 ? 99 : unread)
    } catch (error) {
      console.error('Failed to refresh live chat unread count:', error)
    }
  }

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Check if click is outside user menu
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false)
      }
      
      // Check if click is outside help menu
      if (helpMenuRef.current && !helpMenuRef.current.contains(target)) {
        setShowHelpMenu(false)
      }
    }

    if (showUserMenu || showHelpMenu) {
      document.addEventListener('mousedown', handleClickOutside as any)
      return () => document.removeEventListener('mousedown', handleClickOutside as any)
    }
  }, [showUserMenu, showHelpMenu])

  // Cleanup categories close timeout on unmount
  useEffect(() => {
    return () => {
      if (categoriesCloseTimeoutRef.current) {
        clearTimeout(categoriesCloseTimeoutRef.current)
      }
    }
  }, [])

  const handleCategoriesMouseLeave = () => {
    console.log('[HEADER] Closing categories dropdown (with delay)')
    categoriesCloseTimeoutRef.current = setTimeout(() => {
      setCategoriesOpen(false)
      setActiveCategory(null)
    }, 200)
  }

  const handleCategoriesMouseEnter = () => {
    console.log('[HEADER] Opening categories dropdown')
    if (categoriesCloseTimeoutRef.current) {
      clearTimeout(categoriesCloseTimeoutRef.current)
    }
    setCategoriesOpen(true)
  }

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    // Navigate to marketplace-style search results page
    router.push({
      pathname: '/stores',
      query: searchQuery.trim() ? { q: searchQuery.trim() } : {}
    })
  }

  const handleLogoNavigation = () => {
    setSearchQuery('')
    setShowMobileMenu(false)
    setShowUserMenu(false)
    setShowHelpMenu(false)

    if (typeof window !== 'undefined' && router.pathname === '/') {
      window.location.assign('/')
      return
    }
    router.push('/')
  }

  useEffect(() => {
    setMounted(true)
    if (typeof window === 'undefined') return

    const existingChatSessionId = localStorage.getItem('chat_session_id') || ''
    setChatSessionId(existingChatSessionId)

    // Load and set location from localStorage
    const saved = localStorage.getItem('renewablezmart_location')
    if (saved) {
      try {
        const { country, city } = JSON.parse(saved)
        setSelectedCountry(country)
        setSelectedCity(city)
        // Set currency based on saved location
        const countryCurrency = getCountryCurrency(country)
        setCurrency(countryCurrency)
      } catch (e) {
        console.error('Error loading location:', e)
      }
    } else {
      // Initialize with Nigeria (default) and set NGN currency
      setSelectedCountry('Nigeria')
      setSelectedCity('Lagos')
      setCurrency('NGN')
      localStorage.setItem('renewablezmart_location', JSON.stringify({ country: 'Nigeria', city: 'Lagos' }))
    }

    // Keep cart/wishlist across refresh for guests and logged-in users.
    // Clearing is handled explicitly on logout or successful checkout.

    // Fetch countries and categories
    fetchCountries()
    fetchCategories()
  }, [user, token])

  useEffect(() => {
    if (!mounted) return

    refreshLiveChatUnreadCount()
    const interval = window.setInterval(refreshLiveChatUnreadCount, 12000)
    const handleWindowFocus = () => {
      refreshLiveChatUnreadCount()
    }
    const handleOpenLiveChat = () => {
      markLiveChatAsSeen()
    }

    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener(OPEN_LIVE_CHAT_EVENT, handleOpenLiveChat)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener(OPEN_LIVE_CHAT_EVENT, handleOpenLiveChat)
    }
  }, [mounted, token, user?.id, chatSessionId])

  useEffect(() => {
    if (!mounted || !token) return
    const normalizedRole = String(user?.role || '').toLowerCase()
    if (normalizedRole !== 'admin') {
      setAdminChatUnreadCount(0)
      return
    }

    let socket: Socket | null = null
    const seenStorageKey = `rz_admin_chat_seen_signatures_${String(user?.id || 'admin')}`

    const loadSeenMap = (): Record<string, string> => {
      if (typeof window === 'undefined') return {}
      try {
        const raw = localStorage.getItem(seenStorageKey)
        const parsed = raw ? JSON.parse(raw) : {}
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch {
        return {}
      }
    }

    const saveSeenMap = (map: Record<string, string>) => {
      if (typeof window === 'undefined') return
      localStorage.setItem(seenStorageKey, JSON.stringify(map))
    }

    const refreshAdminChatUnreadCount = async () => {
      try {
        const response = await apiClient.get('/admin/conversations')
        const conversations = Array.isArray(response?.data?.conversations) ? response.data.conversations : []

        const seenMap = loadSeenMap()
        const liveSignatures: Record<string, string> = {}
        for (const item of conversations) {
          const id = String(item?.id || '').trim()
          if (!id) continue
          liveSignatures[id] = `${String(item?.timestamp || '')}__${String(item?.lastMessage || '')}`
        }
        adminChatLatestSignatureRef.current = liveSignatures

        // Keep localStorage small and aligned with existing conversations.
        const prunedSeen = Object.fromEntries(
          Object.entries(seenMap).filter(([conversationId]) => Boolean(liveSignatures[conversationId]))
        )
        if (Object.keys(prunedSeen).length !== Object.keys(seenMap).length) {
          saveSeenMap(prunedSeen)
        }

        const pendingCount = conversations.filter((item: any) => {
          if (String(item?.lastMessageRole || '').toLowerCase() !== 'user') return false
          const id = String(item?.id || '').trim()
          if (!id) return false
          const currentSignature = liveSignatures[id] || ''
          const seenSignature = prunedSeen[id] || ''
          return currentSignature !== seenSignature
        }).length
        setAdminChatUnreadCount(pendingCount > 99 ? 99 : pendingCount)
      } catch {
        // Keep header stable when endpoint is temporarily unavailable.
      }
    }

    const handleAdminChatSeen = (event: Event) => {
      const customEvent = event as CustomEvent<{ conversationId?: string }>
      const conversationId = String(customEvent?.detail?.conversationId || '').trim()
      if (!conversationId) return
      const latestSignature = adminChatLatestSignatureRef.current[conversationId]
      if (!latestSignature) return
      const nextMap = loadSeenMap()
      nextMap[conversationId] = latestSignature
      saveSeenMap(nextMap)
      refreshAdminChatUnreadCount()
    }

    refreshAdminChatUnreadCount()
    const interval = window.setInterval(refreshAdminChatUnreadCount, 12000)

    socket = io(getApiBaseUrl(), { transports: ['websocket'] })
    socket.on('connect', () => {
      socket?.emit('join_admin')
    })
    socket.on('new_message', (payload: any) => {
      const role = String(payload?.role || '').toLowerCase()
      if (role === 'user') {
        refreshAdminChatUnreadCount()
      }
    })

    window.addEventListener(ADMIN_CHAT_SEEN_EVENT, handleAdminChatSeen as EventListener)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener(ADMIN_CHAT_SEEN_EVENT, handleAdminChatSeen as EventListener)
      socket?.disconnect()
    }
  }, [mounted, token, user?.id, user?.role])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const refreshWishlist = async () => {
      if (!token) {
        setWishlistCount(0)
        return
      }
      try {
        await ensureWishlistSync()
        const count = await fetchWishlistCount()
        setWishlistCount(count)
      } catch (error) {
        console.error('Failed to refresh wishlist count:', error)
      }
    }

    const handleWishlistUpdated = () => {
      refreshWishlist()
    }

    refreshWishlist()
    window.addEventListener('wishlistUpdated', handleWishlistUpdated)
    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdated)
    }
  }, [token])

  const fetchCountries = async () => {
    try {
      console.log('[FRONTEND] Fetching countries from API')
      const response = await apiClient.get('/locations/countries')
      const countries = response.data || []
      console.log(`[FRONTEND] Received ${countries.length} countries from API`)
      setApiCountries(countries)
      
      // If we have countries, fetch cities for the selected country
      if (countries.length > 0 && selectedCountry) {
        fetchCitiesForCountry(selectedCountry, countries)
      }
    } catch (error: any) {
      console.error('[FRONTEND] Error fetching countries:', error?.message || error)
      // Fall back to hardcoded data if API fails
      console.log('[FRONTEND] Falling back to hardcoded location data')
      setApiCountries(africanCountries as unknown as any[])
    }
  }

  const fetchCitiesForCountry = async (countryName: string, countries?: any[]) => {
    try {
      // Find the country from either apiCountries or hardcoded data
      const countriesData = countries || apiCountries || africanCountries
      const country = countriesData.find((c: any) => c.name === countryName)
      
      if (!country) {
        console.log(`[FRONTEND] Country "${countryName}" not found`)
        return
      }

      console.log(`[FRONTEND] Fetching cities for country: ${country.name} (ID: ${country.id})`)
      setLoadingCities(true)
      
      if (country.id) {
        // Fetch from API if we have the country ID
        const response = await apiClient.get(`/locations/countries/${country.id}/cities`)
        const cities = response.data || []
        console.log(`[FRONTEND] Received ${cities.length} cities for ${country.name}`)
        setApiCities(cities)
      } else {
        // Use hardcoded data if no ID (fallback)
        const cityData = country.states || country.cities || []
        console.log(`[FRONTEND] Using hardcoded cities (${cityData.length}) for ${country.name}`)
        setApiCities(cityData.map((name: string) => ({ name })))
      }
    } catch (error: any) {
      console.error('[FRONTEND] Error fetching cities:', error?.message || error)
      // Fall back to hardcoded cities
      const country = africanCountries.find((c: Country) => c.name === countryName) as Country
      if (country) {
        const cityData = country.states || country.cities || []
        console.log(`[FRONTEND] Using hardcoded cities (${cityData.length}) as fallback`)
        setApiCities(cityData.map((name: string) => ({ name })))
      }
    } finally {
      setLoadingCities(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const baseUrl = getApiBaseUrl()
      const endpoint = `${baseUrl}/categories`
      
      console.log('[HEADER] Fetching categories from:', endpoint)
      const response = await fetch(endpoint)
      console.log('[HEADER] Categories response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[HEADER] Categories data received:', data)
        const cats = Array.isArray(data) ? data : data.data || []
        console.log('[HEADER] Categories count:', cats.length)
        const getCategoryRank = (name: string) => {
          const normalized = name.trim().toLowerCase()
          if (normalized === 'miscellaneous') return 2
          if (normalized === 'electric vehicles & parts') return 1
          return 0
        }
        const sortedCats = cats
          .map((cat: any) => ({
            ...cat,
            subcategories: Array.isArray(cat?.subcategories)
              ? [...cat.subcategories].sort((a: any, b: any) =>
                  String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })
                )
              : cat?.subcategories,
          }))
          .sort((a: any, b: any) => {
            const aName = String(a?.name || '')
            const bName = String(b?.name || '')
            const rankDiff = getCategoryRank(aName) - getCategoryRank(bName)
            if (rankDiff !== 0) return rankDiff
            return aName.localeCompare(bName, undefined, { sensitivity: 'base' })
          })
        setCategories(sortedCats)
      } else {
        console.error('[HEADER] Failed to fetch categories:', response.status)
      }
    } catch (err) {
      console.error('[HEADER] Error fetching categories:', err)
    }
  }

  const handleLogout = () => {
    const { logout } = useAuthStore.getState()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('renewablezmart_cart')
    }
    logout()
    if (router.pathname !== '/') {
      router.push('/')
    } else {
      router.reload()
    }
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size must be less than 5MB')
      return
    }

    // Show local preview
    const preview = URL.createObjectURL(file)
    setPhotoPreview(preview)

    // Upload to S3
    setUploadingPhoto(true)
    try {
      const s3Url = await uploadImageToS3(file, `profile-photos/${user?.id || 'unknown'}`)
      
      // Save to backend
      const apiBase = (await import('@/lib/apiConfig')).getApiBaseUrl()
      const response = await fetch(`${apiBase}/users/profile-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoUrl: s3Url })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update auth store with new photo
        const { updateUser } = useAuthStore.getState()
        updateUser({ profilePhotoUrl: s3Url })
        
        alert('Profile photo updated successfully!')
        setPhotoPreview('')
        setShowPhotoModal(false)
        
        // Refetch user to ensure latest data
        try {
          const userResponse = await fetch(`${apiBase}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (userResponse.ok) {
            const userData = await userResponse.json()
            const { setUser } = useAuthStore.getState()
            setUser(userData)
          }
        } catch (err) {
          console.warn('Failed to refetch user data')
        }
      } else {
        alert('Failed to update profile photo')
        setPhotoPreview('')
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert(`Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setPhotoPreview('')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const saveLocation = (country: string, city: string) => {
    setSelectedCountry(country)
    setSelectedCity(city)
    if (typeof window !== 'undefined') {
      localStorage.setItem('renewablezmart_location', JSON.stringify({ country, city }))
      // Dispatch custom event to notify other components of location change
      window.dispatchEvent(new Event('locationChanged'))
    }
    // Update currency based on selected country
    const countryCurrency = getCountryCurrency(country)
    setCurrency(countryCurrency)
    setSearchLocation('')
    setShowLocationModal(false)
  }

  // Use API countries if available, fallback to hardcoded data
  const displayCountries: Country[] = (apiCountries.length > 0 ? apiCountries : africanCountries) as unknown as Country[]
  const currentCountry: Country = displayCountries.find((c) => c.name === selectedCountry) || displayCountries[0]
  
  // Use API cities if available, fallback to hardcoded data
  const currentCities: string[] = apiCities.length > 0 
    ? apiCities.map((c: any) => c.name || c)
    : ((currentCountry?.states || currentCountry?.cities || []) as string[])
  
  const selectedFlagCode = getCountryISOCode(selectedCountry).toLowerCase()
  const selectedFlagEmoji =
    (currentCountry && (currentCountry as any).flag) ? (currentCountry as any).flag : (selectedCountry === 'Nigeria' ? 'NG' : 'GL')

  const filteredCountries = displayCountries.filter((c) => c.name.toLowerCase().includes(searchLocation.toLowerCase()))
  const filteredCities = currentCities.filter((city) => city.toLowerCase().includes(searchLocation.toLowerCase()))

  const mobileQuickTabs = [
    { key: 'stores', href: '/stores', icon: '\uD83C\uDFEA', label: 'R E Stores', colorClass: 'text-purple-700' },
    { key: 'deals', href: '/deals', icon: '\uD83D\uDD25', label: 'Flash Deals', colorClass: 'text-red-700' },
    { key: 'swap-sell', href: '/swap-sell', icon: '\u267B', label: 'Swaps', colorClass: 'text-indigo-700' },
    { key: 'installers', href: '/installers', icon: '\uD83D\uDEE0', label: 'Installers', colorClass: 'text-blue-700' },
    { key: 'service-requests', href: '/service-requests', icon: '\uD83E\uDDF0', label: 'Services', colorClass: 'text-orange-700' },
    { key: 'ev-stores', href: '/ev-stores', icon: '\uD83D\uDE97', label: 'E V Stores', colorClass: 'text-emerald-700' },
  ] as const
  type QuickTab = (typeof mobileQuickTabs)[number]

  const getActiveQuickTabIndex = (tabs: readonly QuickTab[] = mobileQuickTabs) => {
    const idx = tabs.findIndex((tab) => {
      return router.pathname === tab.href || router.pathname.startsWith(`${tab.href}/`)
    })
    return idx >= 0 ? idx : 0
  }
  const activeQuickTabIndex = getActiveQuickTabIndex()

  const goToQuickTabByOffset = (offset: -1 | 1, tabs: readonly QuickTab[] = mobileQuickTabs) => {
    const currentIdx = getActiveQuickTabIndex(tabs)
    const nextIdx = currentIdx + offset
    if (nextIdx < 0 || nextIdx >= tabs.length) return
    router.push(tabs[nextIdx].href)
  }

  const handleSwipeNavigation = (deltaX: number, deltaY: number, tabs: readonly QuickTab[] = mobileQuickTabs) => {
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return
    if (deltaX < 0) {
      goToQuickTabByOffset(1, tabs)
    } else {
      goToQuickTabByOffset(-1, tabs)
    }
  }

  const handleQuickTabsTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    touchStartXRef.current = touch.clientX
    touchStartYRef.current = touch.clientY
    touchStartTargetRef.current = e.target
  }

  const handleQuickTabsTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartXRef.current
    const deltaY = touch.clientY - touchStartYRef.current
    touchStartXRef.current = null
    touchStartYRef.current = null

    handleSwipeNavigation(deltaX, deltaY)
  }

  // Mobile full-page swipe navigation across quick sections.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isMobileViewport = () => window.matchMedia('(max-width: 767px)').matches
    const swipeTabs = mobileQuickTabs.filter((tab) =>
      ['stores', 'deals', 'swap-sell', 'installers', 'service-requests', 'ev-stores'].includes(tab.key)
    )
    const interactiveSelector =
      'input, textarea, select, button, a, label, [role="button"], [data-no-page-swipe="true"]'

    const onTouchStart = (event: TouchEvent) => {
      if (!isMobileViewport()) return
      const touch = event.touches[0]
      if (!touch) return
      touchStartXRef.current = touch.clientX
      touchStartYRef.current = touch.clientY
      touchStartTargetRef.current = event.target
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (!isMobileViewport()) return
      if (touchStartXRef.current === null || touchStartYRef.current === null) return

      const startedOn = touchStartTargetRef.current as HTMLElement | null
      const touch = event.changedTouches[0]
      const deltaX = touch.clientX - touchStartXRef.current
      const deltaY = touch.clientY - touchStartYRef.current

      touchStartXRef.current = null
      touchStartYRef.current = null
      touchStartTargetRef.current = null

      if (showMobileMenu || showLocationModal || showPhotoModal) return
      if (startedOn && startedOn.closest(interactiveSelector)) return

      handleSwipeNavigation(deltaX, deltaY, swipeTabs)
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [router.pathname, showMobileMenu, showLocationModal, showPhotoModal])

  return (
    <>
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowLocationModal(false)}>
          <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 dark:bg-gray-800 z-10">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Choose your location</h2>
                <button onClick={() => setShowLocationModal(false)} className="text-2xl hover:text-gray-900 dark:hover:text-gray-100 leading-none">x</button>
              </div>
              <p className="text-gray-900 font-semibold mb-2 text-sm">Select your delivery location</p>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block font-bold text-gray-900 dark:text-white mb-2 text-sm">Country</label>
                <select
                  className="w-full px-3 py-2 border-2 border-gray-400 dark:border-gray-600 rounded-lg focus:outline-none focus:border-teal-600 dark:focus:border-teal-400 text-sm text-gray-900 dark:text-white font-medium dark:bg-gray-700"
                  value={selectedCountry}
                  onChange={(e) => {
                    const countryName = e.target.value
                    setSelectedCountry(countryName)
                    fetchCitiesForCountry(countryName)
                    // Set first city as default
                    const country = displayCountries.find((c) => c.name === countryName)
                    const list = (country?.states || country?.cities || []) as string[]
                    setSelectedCity(list[0] || '')
                  }}
                >
                  {displayCountries.map((country) => (
                    <option key={country.name} value={country.name}>{country.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-900 mb-2 text-sm">{currentCountry?.states ? 'State' : 'City'}</label>
                <input
                  type="text"
                  placeholder={`Search ${currentCountry?.states ? 'state' : 'city'}...`}
                  className="w-full mb-2 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-600 text-sm text-gray-900 font-medium"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                />
                <select
                  className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-teal-600 text-sm text-gray-900 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={loadingCities}
                >
                  {filteredCities.length > 0 ? (
                    filteredCities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))
                  ) : (
                    <option value="">No matching {currentCountry?.states ? 'states' : 'cities'} found</option>
                  )}
                </select>
                {loadingCities && <p className="text-xs text-gray-900 font-bold mt-1">Loading cities...</p>}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-black dark:text-white font-bold flex items-center gap-2">
                  <span className="text-black dark:text-white font-bold">Selected:</span>
                  <span className="text-lg">{selectedCountry === 'Nigeria' ? 'NG' : 'GL'}</span>
                  <span className="font-bold text-gray-900">{selectedCity}, {selectedCountry}</span>
                </div>
                <button onClick={() => saveLocation(selectedCountry, selectedCity)} className="bg-slate-700 text-white px-5 py-2 rounded-lg font-bold hover:bg-slate-800 text-sm">
                  Confirm Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow-md dark:shadow-lg dark:shadow-black/50 sticky top-0 z-[9999] transition-colors pointer-events-auto overflow-visible">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 overflow-visible">
          <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-visible">
            <div className="flex items-center gap-1 sm:gap-3 min-w-0 mr-auto">
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden text-3xl p-1 hover:bg-gray-200 rounded-lg text-gray-800 dark:text-white hover:text-gray-900 transition font-bold"
              >
                {showMobileMenu ? '\u00D7' : '\u2630'}
              </button>

              {/* Mobile Location Selector - Between Hamburger & Logo */}
              <button onClick={() => setShowLocationModal(true)} className="md:hidden flex flex-col items-center gap-0.5 px-1 py-1 text-gray-800 dark:text-white hover:text-teal-600 transition">
                <span className="text-lg">{selectedFlagEmoji}</span>
                <span className="text-[10px] font-bold leading-none max-w-[56px] truncate">{selectedCity}</span>
              </button>

              <Link
                href="/"
                onClick={(e) => {
                  e.preventDefault()
                  handleLogoNavigation()
                }}
                className="flex items-center -ml-1 sm:-ml-3 mr-2 sm:mr-4"
              >
                <span className="flex items-center overflow-hidden max-w-[220px] sm:max-w-[360px] md:max-w-[460px]">
                  <img
                    src="/logo-main-transparent.png"
                    alt="RenewableZmart"
                    className="h-12 sm:hidden w-auto object-contain object-left"
                  />
                  <img
                    src="/logo-brand-v2.png"
                    alt="RenewableZmart"
                    className="hidden sm:block h-16 md:h-20 w-auto object-contain object-left"
                  />
                </span>
              </Link>
            </div>

            <button onClick={() => setShowLocationModal(true)} className="hidden sm:flex items-center gap-2 px-3 py-2 border-2 border-gray-400 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition cursor-pointer">
              <span className="text-lg">{selectedFlagEmoji}</span>
              <div className="text-left">
                <div className="text-xs text-gray-900 font-bold">Deliver to</div>
                <div className="font-bold text-sm text-gray-900">{selectedCity}</div>
              </div>
            </button>

            <div className="hidden md:flex flex-1 max-w-2xl">
              <form onSubmit={handleSearch} className="relative w-full">
                <input 
                  type="text" 
                  placeholder="Search for sustainable products..." 
                  className="w-full px-4 py-2 border-2 border-teal-600 rounded-lg focus:outline-none text-black font-medium placeholder:text-gray-800" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button 
                  type="submit"
                  className="absolute right-0 top-0 bg-slate-700 text-white px-4 sm:px-6 py-2 rounded-r-lg hover:bg-slate-800"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 flex-nowrap justify-end max-w-full overflow-visible relative z-[80] pointer-events-auto">
              {mounted && user ? (
                <div className="relative flex-shrink-0 z-[90] pointer-events-auto" ref={userMenuRef}>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowUserMenu((prev) => !prev)
                      setShowHelpMenu(false)
                    }}
                    className="flex items-center gap-2 hover:text-teal-600 peer text-gray-800 dark:text-white hover:text-teal-700 transition pointer-events-auto select-none"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {user.profilePhotoUrl ? (
                      <img 
                        src={`${getCleanS3Url(user.profilePhotoUrl)}?v=${Date.now()}`}
                        alt="Profile"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-300 hover:border-teal-600 transition"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="inline-flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-6 w-6 sm:h-8 sm:w-8 text-slate-600"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" />
                        </svg>
                      </span>
                    )}
                    <div className="text-left hidden md:block">
                      <div className="text-xs text-gray-900 font-bold">Welcome</div>
                      <div className="font-bold text-gray-900">{user.firstName}</div>
                    </div>
                  </button>
                  {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[99999] max-h-96 overflow-y-auto">
                    <div className="p-3 border-b bg-gray-50 sticky top-0 z-10">
                      <div className="flex items-center gap-3 mb-2">
                        {user.profilePhotoUrl ? (
                          <img 
                            src={`${getCleanS3Url(user.profilePhotoUrl)}?v=${Date.now()}`}
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xl">
                            U
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 dark:text-white">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-800 font-semibold">{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          setShowPhotoModal(true)
                        }}
                        className="w-full text-left px-3 py-2 bg-blue-50 text-blue-600 text-sm font-bold rounded hover:bg-blue-100 transition"
                      >
                        Change Photo
                      </button>
                    </div>
                    <Link href="/account" className="block px-4 py-2 hover:bg-gray-100 transition text-gray-900 font-semibold" onClick={() => setShowUserMenu(false)}>My Account</Link>
                    <Link href="/orders" className="block px-4 py-2 hover:bg-gray-100 transition text-gray-900 font-semibold" onClick={() => setShowUserMenu(false)}>My Orders</Link>
                    <button
                      type="button"
                      className="block w-full text-left px-4 py-2 hover:bg-emerald-50 transition text-emerald-700 font-semibold"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowUserMenu(false)
                        markLiveChatAsSeen()
                        openLiveChatPopup()
                      }}
                    >
                      <span className="flex items-center justify-between">
                        <span>Live Chat</span>
                        {liveChatUnreadCount > 0 && (
                          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                            {liveChatUnreadCount}
                          </span>
                        )}
                      </span>
                    </button>
                    <Link href="/calculator" className="block px-4 py-2 hover:bg-sky-50 transition text-sky-700 font-semibold" onClick={() => setShowUserMenu(false)}>
                      <span className="inline-flex items-center gap-2">
                        <img src="/calculator-icon.png" alt="Calculator" className="w-5 h-5 object-contain" />
                        <span>Load Calculator</span>
                      </span>
                    </Link>
                    <Link href="/referrals" className="block px-4 py-2 hover:bg-blue-50 transition text-blue-600 font-semibold" onClick={() => setShowUserMenu(false)}>My Referrals</Link>
                    <Link href="/payout-request" className="block px-4 py-2 hover:bg-green-50 transition text-green-600 font-semibold" onClick={() => setShowUserMenu(false)}>Request Payout</Link>
                    <Link href="/report-vendor" className="block px-4 py-2 hover:bg-red-50 transition text-red-600 font-semibold" onClick={() => setShowUserMenu(false)}>Report</Link>
                    {(user.role === 'vendor') && (
                      <Link href="/vendor-dashboard" className="block px-4 py-2 hover:bg-gray-100 transition bg-emerald-50 text-emerald-700 font-semibold" onClick={() => setShowUserMenu(false)}>Dealers Dashboard</Link>
                    )}
                    {(user.role === 'installer') && (
                      <Link href="/installer-dashboard" className="block px-4 py-2 hover:bg-gray-100 transition bg-blue-50 text-blue-700 font-semibold" onClick={() => setShowUserMenu(false)}>Installer Dashboard</Link>
                    )}
                    {(user.role === 'admin') && (
                      <>
                        <Link href="/admin" className="block px-4 py-2 hover:bg-gray-100 transition bg-red-50 text-red-700 font-semibold" onClick={() => setShowUserMenu(false)}>Admin Dashboard</Link>
                        <Link href="/admin/orders-management" className="block px-4 py-2 hover:bg-gray-100 transition bg-purple-50 text-purple-700 font-semibold" onClick={() => setShowUserMenu(false)}>Orders Management</Link>
                        <Link href="/admin/chat" className="block px-4 py-2 hover:bg-gray-100 transition bg-emerald-50 text-emerald-700 font-semibold" onClick={() => setShowUserMenu(false)}>
                          <span className="flex items-center justify-between">
                            <span>Chat Inbox</span>
                            {adminChatUnreadCount > 0 && (
                              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                                {adminChatUnreadCount}
                              </span>
                            )}
                          </span>
                        </Link>
                        <Link href="/admin/installation-requests" className="block px-4 py-2 hover:bg-gray-100 transition bg-blue-50 text-blue-700 font-semibold" onClick={() => setShowUserMenu(false)}>Installation Requests</Link>
                        <Link href="/admin/payout-requests" className="block px-4 py-2 hover:bg-gray-100 transition bg-green-50 text-green-700 font-semibold" onClick={() => setShowUserMenu(false)}>Payout Requests</Link>
                        <Link href="/admin/referrals" className="block px-4 py-2 hover:bg-gray-100 transition bg-green-50 text-green-700 font-semibold" onClick={() => setShowUserMenu(false)}>Referral Management</Link>
                        <Link href="/admin/product-approval" className="block px-4 py-2 hover:bg-gray-100 transition bg-yellow-50 text-yellow-700 font-semibold" onClick={() => setShowUserMenu(false)}>Product Approval</Link>
                        <Link href="/admin/installer-verification" className="block px-4 py-2 hover:bg-gray-100 transition bg-teal-50 text-teal-700 font-semibold" onClick={() => setShowUserMenu(false)}>Installer Verification</Link>
                        <Link href="/admin/swap-resell" className="block px-4 py-2 hover:bg-gray-100 transition bg-amber-50 text-amber-700 font-semibold" onClick={() => setShowUserMenu(false)}>Swap & Resell</Link>
                        <Link href="/admin/post-product" className="block px-4 py-2 hover:bg-gray-100 transition bg-rose-50 text-rose-700 font-semibold" onClick={() => setShowUserMenu(false)}>Add Product To Store</Link>
                        <Link href="/admin-coupons-management" className="block px-4 py-2 hover:bg-gray-100 transition bg-slate-900 text-orange-700 font-semibold" onClick={() => setShowUserMenu(false)}>Coupon Management</Link>
                        <Link href="/admin-returns-management" className="block px-4 py-2 hover:bg-gray-100 transition bg-blue-50 text-blue-700 font-semibold" onClick={() => setShowUserMenu(false)}>Returns Management</Link>
                        <Link href="/admin-inventory-management" className="block px-4 py-2 hover:bg-gray-100 transition bg-indigo-50 text-indigo-700 font-semibold" onClick={() => setShowUserMenu(false)}>Inventory Management</Link>
                        <Link href="/admin-customer-support" className="block px-4 py-2 hover:bg-gray-100 transition bg-cyan-50 text-cyan-700 font-semibold" onClick={() => setShowUserMenu(false)}>Customer Support</Link>
                        {/* Analytics & Reports - Disabled for now */}
                        {/* <Link href="/admin-analytics" className="block px-4 py-2 hover:bg-gray-100 transition bg-emerald-50 text-emerald-700 font-semibold" onClick={() => setShowUserMenu(false)}>Analytics & Reports</Link> */}
                      </>
                    )}
                    <button onClick={() => { handleLogout(); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition rounded-b-lg sticky bottom-0 bg-white dark:bg-gray-800 border-t">Logout</button>
                  </div>
                  )}
                </div>
              ) : (
                mounted && (
                  <Link href="/login" className="flex items-center gap-2 hover:text-teal-600 text-gray-800 dark:text-white hover:text-teal-700 transition">
                    <span className="inline-flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-6 w-6 sm:h-8 sm:w-8 text-slate-600"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" />
                      </svg>
                    </span>
                    <div className="text-left hidden md:block">
                      <div className="text-xs text-gray-900 font-bold">Account</div>
                      <div className="font-bold text-gray-900">Login</div>
                    </div>
                  </Link>
                )
              )}

              {/* Help Menu */}
              <div className="relative flex-shrink-0 z-[90] pointer-events-auto" ref={helpMenuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowHelpMenu((prev) => !prev)
                    setShowUserMenu(false)
                  }}
                  className="flex items-center gap-2 hover:text-teal-600 text-gray-800 dark:text-white hover:text-teal-700 transition pointer-events-auto select-none"
                  style={{ touchAction: 'manipulation' }}
                >
                  <span className="inline-flex items-center justify-center text-red-600">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M11 18h2v2h-2zm1-16a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 15a1.25 1.25 0 1 1 1.25-1.25A1.251 1.251 0 0 1 12 17Zm1.9-6.83-.84.86A2.84 2.84 0 0 0 12 13h-2v-.5a3.74 3.74 0 0 1 1.1-2.65l1.17-1.2a1.86 1.86 0 1 0-3.17-1.31H7.1a3.9 3.9 0 1 1 6.8 2.53Z" />
                    </svg>
                  </span>
                  <div className="text-left hidden md:block">
                    <div className="font-bold text-gray-900">Support</div>
                  </div>
                </button>

                {showHelpMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-xl min-w-[280px] z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-teal-50">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-950 to-emerald-600 text-white py-2 font-bold hover:from-blue-900 hover:to-emerald-500 transition shadow-sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowHelpMenu(false)
                            markLiveChatAsSeen()
                            openLiveChatPopup()
                          }}
                        >
                          <span>Live Chat</span>
                          {liveChatUnreadCount > 0 && (
                            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
                              {liveChatUnreadCount}
                            </span>
                          )}
                        </button>
                        <a
                          href="https://wa.me/2349022298109"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 rounded-lg border-2 border-green-500 text-green-600 bg-white py-2 font-bold hover:bg-green-50 transition"
                          onClick={() => setShowHelpMenu(false)}
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                    <Link href="/track-order" className="block px-4 py-2 hover:bg-emerald-100 transition font-bold text-emerald-700">Track Order</Link>
                    <Link href="/calculator" className="block px-4 py-2 hover:bg-sky-50 transition font-bold text-sky-700">
                      <span className="inline-flex items-center gap-2">
                        <img src="/calculator-icon.png" alt="Calculator" className="w-5 h-5 object-contain" />
                        <span>Load Calculator</span>
                      </span>
                    </Link>
                    <Link href="/help#place-order" className="block px-4 py-2 hover:bg-gray-100 transition font-bold text-gray-800 dark:text-white">Place an order</Link>
                    <Link href="/help#payment" className="block px-4 py-2 hover:bg-gray-100 transition font-bold text-gray-800 dark:text-white">Payment options</Link>
                    <Link href="/help#track" className="block px-4 py-2 hover:bg-gray-100 transition font-bold text-gray-800 dark:text-white">Track an order</Link>
                    <Link href="/help#cancel-order" className="block px-4 py-2 hover:bg-gray-100 transition font-bold text-gray-800 dark:text-white">Cancel an order</Link>
                    <Link href="/help#returns" className="block px-4 py-2 hover:bg-gray-100 transition font-bold text-gray-800 dark:text-white">Returns & Refunds</Link>
                    <Link href="/help#contact" className="block px-4 py-2 hover:bg-gray-100 transition font-bold text-gray-800 dark:text-white rounded-b-lg">Contact Support</Link>
                  </div>
                )}
              </div>

              {/* Notification Bell */}
              <div className="relative z-[90] pointer-events-auto px-1">
                <NotificationBell
                  externalUnreadCount={String(user?.role || '').toLowerCase() === 'admin' ? adminChatUnreadCount : 0}
                  externalLabel="Admin Chat Inbox"
                  externalActionUrl="/admin/chat"
                />
              </div>

              {/* Wishlist (logged-in users only) */}
              {mounted && isAuthenticated && token && (
                <Link
                  href="/wishlist"
                  className="relative flex items-center gap-2 text-gray-900 dark:text-white transition flex-shrink-0 pointer-events-auto px-1"
                  aria-label="Wishlist"
                >
                  <span className="inline-flex items-center">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      fill="currentColor"
                      aria-hidden="true"
                      style={{ color: mounted && wishlistCount > 0 ? '#047857' : '#9CA3AF' }}
                    >
                      <path d="M12 21s-6.716-4.45-9.33-7.064C.31 11.575.17 7.73 2.88 5.02c2.11-2.11 5.53-2.11 7.64 0L12 6.5l1.48-1.48c2.11-2.11 5.53-2.11 7.64 0 2.71 2.71 2.57 6.555.21 8.916C18.716 16.55 12 21 12 21z" />
                    </svg>
                  </span>
                  <div className="hidden md:block">
                    <div className="text-xs text-gray-900 font-bold">Wishlist</div>
                  </div>
                  {mounted && wishlistCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Admin Inbox Link - Removed */}

              <Link href="/cart" className="relative flex items-center gap-2 text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition flex-shrink-0 pointer-events-auto px-1">
                <span className="inline-flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 sm:h-8 sm:w-8 text-slate-500"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M7 18a2 2 0 1 0 2 2 2 2 0 0 0-2-2Zm10 0a2 2 0 1 0 2 2 2 2 0 0 0-2-2ZM7.17 14h9.94a2 2 0 0 0 1.96-1.61l1.17-6A1 1 0 0 0 19.26 5H6.21l-.3-1.6A1 1 0 0 0 4.93 2H3a1 1 0 0 0 0 2h1.1l1.68 8.95a2 2 0 0 0 1.95 1.65Z" />
                  </svg>
                </span>
                <div className="hidden md:block">
                  <div className="text-xs text-gray-900 font-bold">Cart</div>
                  <div className="font-bold text-gray-900 dark:text-white">{mounted ? count : 0} items</div>
                </div>
                {mounted && count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Search + Quick Tabs (always visible) */}
        <div className="md:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 py-2">
          <form onSubmit={handleSearch} className="relative w-full">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-4 py-2 pr-12 border-2 border-teal-600 rounded-lg focus:outline-none text-black font-medium text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              type="submit"
              className="absolute right-0 top-0 bg-slate-700 text-white px-3 py-2 rounded-r-lg hover:bg-slate-800 text-sm"
            >
                  Search
                </button>
          </form>

          <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
            <div
              className="overflow-x-auto quick-tabs-scroll"
              onTouchStart={handleQuickTabsTouchStart}
              onTouchEnd={handleQuickTabsTouchEnd}
            >
              <div className="flex items-start gap-4 min-w-max px-1">
                {mobileQuickTabs.map((tab, index) => {
                  const isActive = index === activeQuickTabIndex
                  return (
                    <Link href={tab.href} key={tab.key} className="flex flex-col items-center min-w-[64px]">
                      <span className="text-xl leading-none">{tab.icon}</span>
                      <span className="mt-1 text-xs font-bold whitespace-nowrap text-black">{tab.label}</span>
                      <span className={`mt-1 h-[2px] w-10 rounded-full transition-all ${isActive ? 'bg-emerald-500 opacity-100' : 'bg-transparent opacity-0'}`}></span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu Backdrop - Semi-transparent overlay */}
        {showMobileMenu && (
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-40 z-30 top-14"
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        {/* Mobile Menu - Navigation + Categories Drawer */}
        {showMobileMenu && (
          <div className="md:hidden fixed left-0 top-14 w-72 h-screen bg-white dark:bg-gray-800 border-r dark:border-gray-700 transition-colors overflow-y-auto z-40">
            <div className="px-0 py-0 space-y-0">
              {/* Categories List */}
              {categories.length > 0 ? (
                <div className="bg-white dark:bg-gray-900 py-0 space-y-0">
                  {categories.map((category: any) => (
                    <div key={category.id}>
                      {/* Category Button */}
                      <button
                        onClick={() => {
                          setActiveCategory(activeCategory === category.id ? null : category.id)
                        }}
                        className="w-full text-left px-3 py-3.5 font-medium text-base text-gray-900 dark:text-white hover:bg-yellow-50 dark:hover:bg-gray-700 transition border-b border-gray-150 dark:border-gray-700 flex items-center justify-between"
                      >
                        <span className="flex items-center flex-1 min-w-0">
                          <span className="text-lg mr-2 flex-shrink-0">{category.icon}</span>
                          <span className="truncate">{category.name}</span>
                        </span>
                        <span className="text-xs flex-shrink-0 ml-2">{activeCategory === category.id ? '-' : '+'}</span>
                      </button>

                      {/* Subcategories */}
                      {activeCategory === category.id && category.subcategories && category.subcategories.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 space-y-1 border-b border-gray-100 dark:border-gray-700">
                          {category.subcategories.map((subcategory: any) => (
                            <Link
                              key={subcategory.id}
                              href={`/products?category=${category.id}&subcategory=${subcategory.id}`}
                              className="block px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:text-yellow-600 dark:hover:text-yellow-400 transition"
                              onClick={() => {
                                setShowMobileMenu(false)
                              }}
                            >
                              {'\u2022'} {subcategory.name}
                            </Link>
                          ))}
                          <button
                            onClick={() => {
                              router.push(`/products?category=${category.id}`)
                              setShowMobileMenu(false)
                            }}
                            className="w-full text-left block px-3 py-2 text-xs font-semibold text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-gray-700 transition border-t pt-2 rounded-b-lg"
                          >
                            View All {category.name}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-4 text-center text-gray-700 dark:text-gray-300 text-sm">No categories found</div>
              )}
            </div>
          </div>
        )}

        <div className="hidden md:block bg-gray-50 border-t">
          <div className="w-full">
            <nav className="flex flex-wrap items-center justify-center gap-4 lg:gap-6 xl:gap-8 py-3 px-4 text-sm">
              {/* All Categories - PURE HOVER */}
              <div
                ref={categoriesWrapperRef}
                className="relative"
                onMouseEnter={handleCategoriesMouseEnter}
                onMouseLeave={handleCategoriesMouseLeave}
              >
                {/* Button - No onClick */}
                <button className="whitespace-nowrap text-gray-900 px-2 py-1 font-semibold hover:text-teal-700 hover:underline underline-offset-4 flex items-center gap-1 transition pointer-events-auto">
                  All Categories
                </button>
                
                {/* Dropdown - Appears only on hover */}
                {categoriesOpen && (
                  <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 min-w-[800px]" style={{ zIndex: 99999 }}>
                    <div className="grid grid-cols-5 gap-0">
                      {/* Left Sidebar - Categories List */}
                      <div className="col-span-1 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-l-lg overflow-y-auto max-h-96">
                        {categories.length > 0 ? (
                          categories.map((category: any) => (
                            <div
                              key={category.id}
                              className="relative px-4 py-3 cursor-pointer transition-colors border-l-4 border-transparent hover:bg-white dark:hover:bg-gray-800 hover:border-l-yellow-400 text-gray-900 font-semibold text-sm"
                              onMouseEnter={() => {
                                console.log('[HEADER] Hovering category:', category.name)
                                if (categoriesCloseTimeoutRef.current) {
                                  clearTimeout(categoriesCloseTimeoutRef.current)
                                }
                                setActiveCategory(category.id)
                              }}
                            >
                              <span className="text-lg mr-2">{category.icon}</span>
                              {category.name}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-800 font-semibold text-sm">No categories</div>
                        )}
                      </div>

                      {/* Right Side - Subcategories Grid */}
                      <div className="col-span-4 p-6 overflow-y-auto max-h-96">
                        {activeCategory ? (
                          (() => {
                            const selectedCategory = categories.find((c: any) => c.id === activeCategory)
                            return selectedCategory && selectedCategory.subcategories && selectedCategory.subcategories.length > 0 ? (
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 uppercase border-b pb-2">
                                  {selectedCategory.name}
                                </h3>
                                <div className="grid grid-cols-3 gap-6">
                                  {selectedCategory.subcategories.map((subcategory: any) => (
                                    <Link
                                      key={subcategory.id}
                                      href={`/products?category=${selectedCategory.id}&subcategory=${subcategory.id}`}
                                      className="text-gray-900 dark:text-gray-100 font-semibold hover:text-yellow-600 dark:hover:text-yellow-400 transition-all text-sm"
                                    >
                                      {subcategory.name}
                                    </Link>
                                  ))}
                                </div>
                                <button
                                  onClick={() => {
                                    router.push(`/products?category=${selectedCategory.id}`)
                                    setCategoriesOpen(false)
                                  }}
                                  className="w-full text-left block mt-6 pt-4 px-3 py-2 border-t text-yellow-600 dark:text-yellow-400 font-bold hover:text-yellow-700 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-gray-700 text-sm rounded-b-lg transition"
                                >
                                  View All {selectedCategory.name}
                                </button>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-600 dark:text-gray-300">
                                <p className="text-sm">No subcategories available</p>
                              </div>
                            )
                          })()
                        ) : (
                          <div className="text-center py-8 text-gray-600 dark:text-gray-300">
                            <p className="text-sm font-semibold">Hover on a category</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link href="/stores" className="text-gray-800 px-3 py-1.5 text-sm sm:text-base font-semibold hover:text-teal-700 hover:underline underline-offset-4 whitespace-nowrap">
                R E Stores
              </Link>
              <Link href="/deals" className="text-gray-800 px-3 py-1.5 text-sm sm:text-base font-semibold hover:text-teal-700 hover:underline underline-offset-4 whitespace-nowrap">
                Flash Deals
              </Link>
              <Link href="/swap-sell" className="text-gray-800 px-3 py-1.5 text-sm sm:text-base font-semibold hover:text-teal-700 hover:underline underline-offset-4 whitespace-nowrap">
                Swap
              </Link>
              <Link href="/installers" className="text-gray-800 px-3 py-1.5 text-sm sm:text-base font-semibold hover:text-teal-700 hover:underline underline-offset-4 whitespace-nowrap">
                Installer
              </Link>
              <Link href="/service-requests" className="text-gray-800 px-3 py-1.5 text-sm sm:text-base font-semibold hover:text-teal-700 hover:underline underline-offset-4 whitespace-nowrap">
                Services
              </Link>
              <Link href="/ev-stores" className="text-gray-800 px-3 py-1.5 text-sm sm:text-base font-semibold hover:text-teal-700 hover:underline underline-offset-4 whitespace-nowrap">
                E V Stores
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Profile Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => !uploadingPhoto && setShowPhotoModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-blue-600 text-white p-4 rounded-t-lg">
              <h2 className="text-xl font-bold">Change Profile Picture</h2>
            </div>
            <div className="p-6 space-y-4">
              {photoPreview ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-300">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-semibold">Preview</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-5xl mb-4">Photo</div>
                  <p className="text-gray-800 dark:text-gray-200 font-bold mb-4">Upload a new profile picture</p>
                </div>
              )}

              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
                <span className="block w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold text-center cursor-pointer disabled:opacity-50">
                  {uploadingPhoto ? 'Uploading...' : 'Choose Image'}
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPhotoModal(false)
                    setPhotoPreview('')
                  }}
                  disabled={uploadingPhoto}
                  className="flex-1 bg-gray-200 text-gray-900 py-2 rounded-lg hover:bg-gray-300 font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              <p className="text-xs text-gray-700 dark:text-gray-200 font-semibold text-center">
                Max file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


