﻿/* eslint-disable @next/next/no-page-custom-font */
﻿import Head from 'next/head'
import { useState, useEffect } from 'react'
import Header from "@/components/layout/Header";
import DashboardLayout from '@/components/layout/DashboardLayout'
import DashboardHeaderActions from '@/components/layout/DashboardHeaderActions'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCurrency } from '@/context/CurrencyContext'
import { africanCountries, getPhoneInfo } from '@/data/locations'
import { validatePhoneNumber } from '@/lib/phoneValidation'
import { validateEmail } from '@/lib/emailValidation'
import { getApiBaseUrl, getBackendBaseUrl } from '@/lib/apiConfig'
import { getImageUrl, getSmallFallbackImage } from '@/lib/imageUtils'
import { useAuthStore } from '@/store/authStore'
import { S3ImageUploader } from '@/components/uploaders/S3ImageUploader'
import { apiClient } from '@/lib/api-client'
import ResaleForm from '@/components/forms/ResaleForm'
import TradeInForm from '@/components/forms/TradeInForm'

interface Product {
  id: number
  name: string
  price: number
  stock: number
  category: string
  subcategory: string
  image: string
  images?: string[]
  description?: string
  status: string
  views: number
  sales: number
}

interface Analytics {
  totalViews: number
  totalSales: number
  totalRevenue: number
  todayViews: number
  todaySales: number
  weekViews: number
  weekSales: number
  topProducts: {
    id: number
    name: string
    views: number
    sales: number
    revenue: number
  }[]
}

interface user {
  id: number
  firstName: string
  lastName: string
  email: string
  accountType: string
  token: string
}

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  image: string
}

interface VendorOrder {
  id: string
  items: OrderItem[]
  total: number
  status: string
  paymentStatus: string
  createdAt: string
  user: {
    firstName: string
    lastName: string
    email: string
  }
}

interface VendorInstallmentItem {
  productId: string
  productName: string
  quantity: number
  price: number
  image: string
}

interface VendorInstallmentApplication {
  id: string
  user?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
  fullName?: string
  email?: string
  phone?: string
  address?: string
  totalAmount?: number
  firstPayment?: number
  monthlyPayment?: number
  months?: number
  status?: string
  paymentStatus?: string
  firstPaymentDate?: string
  deliveryStatus?: string
  installationStatus?: string
  approvedAt?: string
  createdAt?: string
  vendorItems?: VendorInstallmentItem[]
  vendorTotal?: number
}

export default function VendorDashboard() {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const { user, token, isHydrated, updateUser } = useAuthStore()
  const isEvVendor = String(user?.accountType || '').toLowerCase() === 'ev_vendor'
  const evCategoryName = 'Electric Vehicles & Parts'
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [installmentOrders, setInstallmentOrders] = useState<VendorInstallmentApplication[]>([])
  const [installmentOrdersLoading, setInstallmentOrdersLoading] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')
  const [installmentSearch, setInstallmentSearch] = useState('')
  const [flashSearch, setFlashSearch] = useState('')
  const [flashSoldSearch, setFlashSoldSearch] = useState('')
  const [resaleSearch, setResaleSearch] = useState('')
  const [resaleSoldSearch, setResaleSoldSearch] = useState('')
  const [tradeSearch, setTradeSearch] = useState('')
  const [tradeSoldSearch, setTradeSoldSearch] = useState('')
  const [analytics, setAnalytics] = useState<Analytics>({
    totalViews: 0,
    totalSales: 0,
    totalRevenue: 0,
    todayViews: 0,
    todaySales: 0,
    weekViews: 0,
    weekSales: 0,
    topProducts: []
  })
  const [loading, setLoading] = useState(true)
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false)
  const [productsLoaded, setProductsLoaded] = useState(false)
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showFlashDealsModal, setShowFlashDealsModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState('')
  const [packageFormData, setPackageFormData] = useState({
    selectedPackageName: '',
    batteryType: 'lithium',
    inverterType: 'standard',
    powers: '',
    warranty: '',
    price: '',
    quantity: '',
    images: [] as string[]
  })
  const [evFlashDealForm, setEvFlashDealForm] = useState({
    productId: '',
    price: '',
    quantity: '',
    description: '',
    images: [] as string[]
  })
  const [uploadingPackageImages, setUploadingPackageImages] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isEditingProduct, setIsEditingProduct] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockUpdate, setStockUpdate] = useState({ productId: 0, newStock: 0, productName: '' })
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [priceUpdate, setPriceUpdate] = useState({ productId: '', newPrice: '', productName: '' })
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'installments' | 'profile' | 'flash-deals' | 'resale' | 'earnings'>('products')
  const [swapFormType, setSwapFormType] = useState<'resale' | 'tradein'>('resale')
  const [imageUrls, setImageUrls] = useState<string[]>([])  // S3 direct upload URLs
  // Earnings state
  const [totalStoreRevenue, setTotalStoreRevenue] = useState(0)
  const [commissionRate, setCommissionRate] = useState(0.1) // 10% default
  const [platformFee, setPlatformFee] = useState(0) // Calculated from revenue * commissionRate
  const [vendorEarnings, setVendorEarnings] = useState(0) // Revenue - fees
  const [referralEarnings, setReferralEarnings] = useState(0)
  const [pendingPayouts, setPendingPayouts] = useState(0)
  const [completedPayouts, setCompletedPayouts] = useState(0)
  const [availableBalance, setAvailableBalance] = useState(0)
  const [payoutHistory, setPayoutHistory] = useState<any[]>([])
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [loadingEarnings, setLoadingEarnings] = useState(false)
  const [selectedStat, setSelectedStat] = useState<'views' | 'sales' | 'revenue' | null>(null)
  const [vendorFlashDeals, setVendorFlashDeals] = useState<any[]>([])
  const [loadingFlashDeals, setLoadingFlashDeals] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [subcategories, setSubcategories] = useState<any[]>([])

  const resolveCategoryLabel = (value?: string) => {
    const raw = String(value || '').trim()
    if (!raw) return '—'
    const match = categories.find(
      (cat: any) =>
        String(cat?.id || '') === raw ||
        String(cat?.name || '').toLowerCase() === raw.toLowerCase()
    )
    return match?.name || raw
  }
  const normalizeCategory = (value?: string) => {
    if (!value) return ''
    return value
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
  const getProductCategoryName = (product: any) => {
    const raw = String(product?.category || '')
    if (!raw) return ''
    const match = categories.find((cat: any) => String(cat?.id || '') === raw)
    return match?.name || raw
  }
  const resolveCategoryId = (value?: string) => {
    const raw = String(value || '').trim()
    if (!raw) return ''
    const directMatch = categories.find((cat: any) => String(cat?.id || '') === raw)
    if (directMatch) return String(directMatch.id || '')
    const nameMatch = categories.find((cat: any) => String(cat?.name || '').toLowerCase() === raw.toLowerCase())
    return nameMatch ? String(nameMatch.id || '') : raw
  }
  const normalizeImagePath = (value?: string) =>
    String(value || '')
      .trim()
      .replace(/^"+|"+$/g, '')
      .replace(/^'+|'+$/g, '')
      .replace(/\\/g, '/')
  const toImageString = (value: any): string => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object') {
      return (
        value.url ||
        value.secure_url ||
        value.image ||
        value.path ||
        value.location ||
        value.key ||
        value.file ||
        ''
      )
    }
    return String(value)
  }
  const parseImageList = (value: any): string[] => {
    if (!value) return []
    if (Array.isArray(value)) {
      return value.map((v) => toImageString(v)).filter(Boolean)
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return []
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed)) {
            return parsed.map((v) => toImageString(v)).filter(Boolean)
          }
          if (parsed && typeof parsed === 'object') {
            const single = toImageString(parsed)
            return single ? [single] : []
          }
        } catch {
          return []
        }
      }
      if (trimmed.includes(',')) {
        return trimmed.split(',').map((v) => v.trim()).filter(Boolean)
      }
      return [trimmed]
    }
    if (typeof value === 'object') {
      const single = toImageString(value)
      return single ? [single] : []
    }
    return []
  }
  const resolveProductImage = (product: any) => {
    let images: any[] = []
    images = parseImageList(product?.images)
    if (images.length === 0) {
      images = parseImageList(product?.imageUrls || product?.image_urls || product?.imagesUrl)
    }
    let candidate: any =
      images[0] ||
      product?.image ||
      product?.image_url ||
      product?.imageUrl ||
      product?.imageURL ||
      product?.productImage ||
      product?.photo ||
      product?.thumbnail ||
      product?.photoUrl ||
      ''
    if (typeof candidate === 'string' && (candidate.trim().startsWith('[') || candidate.trim().startsWith('{'))) {
      const parsed = parseImageList(candidate)
      candidate = parsed[0] || ''
    }
    if (candidate && typeof candidate === 'object') {
      candidate = candidate.url || candidate.secure_url || candidate.image || candidate.path || ''
    }
    const cleaned = normalizeImagePath(candidate)
    if (!cleaned) return ''
    if (cleaned.startsWith('data:image')) return cleaned
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) return cleaned
    if (cleaned.startsWith('//')) return `https:${cleaned}`
    if (cleaned.startsWith('www.')) return `https://${cleaned}`
    if (cleaned.includes('cloudinary.com') || cleaned.includes('amazonaws.com') || cleaned.includes('digitaloceanspaces.com')) {
      return `https://${cleaned}`
    }
    return getImageUrl(cleaned)
  }
  const resolveDisplayImage = (product: any) =>
    resolveProductImage(product) || getSmallFallbackImage('No Image')
  const resolveOrderItemImage = (item: any) => {
    const raw =
      item?.image ||
      item?.imageUrl ||
      item?.image_url ||
      item?.thumbnail ||
      item?.images?.[0] ||
      ''
    if (!raw) return getSmallFallbackImage('No Image')
    const cleaned = normalizeImagePath(String(raw))
    if (!cleaned) return getSmallFallbackImage('No Image')
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('data:image')) {
      return cleaned
    }
    if (cleaned.startsWith('//')) return `https:${cleaned}`
    return getImageUrl(cleaned)
  }
  const evCategoryNormalized = normalizeCategory(evCategoryName)
  const flashDealProducts = products.filter((product: any) => {
    if (!isEvVendor) return true
    const categoryName = getProductCategoryName(product)
    return normalizeCategory(categoryName) === evCategoryNormalized
  })
  const [editingFlashDealId, setEditingFlashDealId] = useState<string | null>(null)
  const [editFlashDealForm, setEditFlashDealForm] = useState<any>(null)
  const [savingFlashDeal, setSavingFlashDeal] = useState(false)
  const [resaleListings, setResaleListings] = useState<any[]>([])
  const [tradeInListings, setTradeInListings] = useState<any[]>([])
  const [loadingListings, setLoadingListings] = useState(false)
  const [editingListing, setEditingListing] = useState<any | null>(null)
  const [editingListingType, setEditingListingType] = useState<'resale' | 'tradein' | null>(null)
  const [editListingForm, setEditListingForm] = useState<any>({
    productName: '',
    description: '',
    interestedInProduct: '',
    productCondition: 'Good',
    price: '',
    estimatedPrice: '',
    quantity: '',
    inspectionFee: '',
    deliveryOption: 'both',
    images: [] as string[]
  })
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmType, setDeleteConfirmType] = useState<'resale' | 'tradein' | null>(null)
  const [hasJoinedPaySmallSmall, setHasJoinedPaySmallSmall] = useState(false)
  const [storeProfile, setStoreProfile] = useState({
    name: '',
    description: '',
    logo: '',
    logoUrl: '',
    logoKey: '',
    banner: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankCode: '',
    bankCountry: ''
  })
  const [storeLogoFile, setStoreLogoFile] = useState<File | null>(null)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [availableStoreCities, setAvailableStoreCities] = useState<string[]>([])
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    subcategory: '',
    image: '',
    country: '',
    city: '',
    enablePaySmallSmall: false
  })

  useEffect(() => {
    // Wait for store to hydrate from localStorage
    if (!isHydrated) {
      return
    }

    if (!user || !token) {
      router.push('/login')
      return
    }
    
    // Check if user is a vendor
    if (user.role !== 'vendor' && !isEvVendor) {
      router.push('/')
      return
    }
    
    fetchCategories()
    fetchProducts(token!)
    fetchStore(token)
    fetchVendorOrders(token)

    // Auto-refresh vendor products and orders every 5 seconds to catch stock changes
    const interval = setInterval(() => {
      fetchProducts(token!)
      fetchVendorOrders(token)
    }, 5000)

    // Get location
    const location = localStorage.getItem('renewablezmart_location')
    if (location) {
      const { country, city } = JSON.parse(location)
      setFormData(prev => ({ ...prev, country, city }))
    }

    return () => clearInterval(interval)
  }, [isHydrated, user, token, router])

  // Watch for when both products and orders have loaded
  useEffect(() => {
    const ready = productsLoaded && ordersLoaded
    setAnalyticsLoaded(ready)
    if (ready) {
      // Both data sources loaded, UI will show real metrics
      console.log('[VENDOR DASHBOARD] Both products and orders loaded - metrics are ready')
    }
  }, [productsLoaded, ordersLoaded])

  useEffect(() => {
    if (storeId) {
      fetchVendorFlashDeals()
    }
  }, [storeId])

  useEffect(() => {
    if (activeTab === 'resale' && token) {
      fetchResaleListings()
    }
  }, [activeTab, token])

  useEffect(() => {
    if (!token || !hasJoinedPaySmallSmall) return
    fetchVendorInstallmentOrders(token)
  }, [token, hasJoinedPaySmallSmall])

  useEffect(() => {
    setHasJoinedPaySmallSmall(Boolean(user?.interestedInPaySmallSmall))
  }, [user?.interestedInPaySmallSmall])

  useEffect(() => {
    if (!token) return
    const fetchPaySmallSmallStatus = async () => {
      try {
        const apiBase = getApiBaseUrl()
        const response = await fetch(`${apiBase}/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) return
        const profile = await response.json()
        const joined = Boolean(profile?.interestedInPaySmallSmall)
        setHasJoinedPaySmallSmall(joined)
        updateUser({ interestedInPaySmallSmall: joined })
      } catch (error) {
        console.error('Failed to fetch Pay Small Small status:', error)
      }
    }
    fetchPaySmallSmallStatus()
  }, [token, updateUser])

  const fetchProducts = async (token: string) => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/products/vendor/my-products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
        // Don't calculate analytics from products alone - wait for orders
        // Log stock updates for monitoring
        const totalStock = data.reduce((sum: number, p: Product) => sum + (p.stock || 0), 0)
        console.log(`[VENDOR PRODUCTS AUTO-REFRESH ${new Date().toLocaleTimeString()}] Total Products: ${data.length} | Total Stock: ${totalStock}`)
        setProductsLoaded(true)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      setProductsLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/categories`)
      if (response.ok) {
        const data = await response.json()
        const list = Array.isArray(data) ? data : data?.data || []
        if (isEvVendor) {
          const evCategory = list.find((cat: any) => String(cat?.name || '').toLowerCase() === evCategoryName.toLowerCase())
          if (evCategory) {
            setCategories([evCategory])
            setFormData((prev) => ({
              ...prev,
              category: String(evCategory.id || ''),
              subcategory: ''
            }))
            if (evCategory?.id) {
              fetchSubcategoriesForCategory(evCategory.id)
            }
          } else {
            setCategories([])
            setSubcategories([])
          }
          return
        }
        setCategories(list)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchSubcategoriesForCategory = async (categoryId: string) => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/categories/${categoryId}/subcategories`)
      if (response.ok) {
        const data = await response.json()
        setSubcategories(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch subcategories:', error)
      setSubcategories([])
    }
  }

  const fetchStore = async (token: string) => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/stores/my-store`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setStoreId(data.id)
        setStoreProfile({
          name: data.name || '',
          description: data.description || '',
          logo: data.logo || '',
          logoUrl: data.logoUrl || '',
          logoKey: data.logoKey || '',
          banner: data.banner || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'Nigeria',
          bankAccountName: data.bankAccountName || '',
          bankAccountNumber: data.bankAccountNumber || '',
          bankName: data.bankName || '',
          bankCode: data.bankCode || '',
          bankCountry: data.bankCountry || ''
        })
        // Set available cities for the store's country
        const selectedCountry = africanCountries.find(c => c.name === (data.country || 'Nigeria'))
        setAvailableStoreCities(selectedCountry?.states || selectedCountry?.cities || [])
      }
    } catch (error) {
      console.error('Failed to fetch store:', error)
    }
  }

  const getOrderStatus = (order: any) =>
    String(order?.orderStatus || order?.status || 'pending').toLowerCase()

  const getPaymentStatus = (order: any) =>
    String(order?.paymentStatus || 'pending').toLowerCase()

  const getOrderCustomerName = (order: any) => {
    const buyer = order?.buyer || {}
    const buyerDetails = order?.buyerDetails || {}
    const user = order?.user || {}
    return (
      buyer.fullName ||
      buyerDetails.name ||
      `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      'Customer'
    )
  }

  const getOrderCustomerAddress = (order: any) => {
    const buyer = order?.buyer || {}
    const shipping = order?.shippingAddress || {}
    const user = order?.user || {}
    const parts = [
      buyer.address || shipping.street || user.address,
      buyer.city || shipping.city || user.city,
      buyer.state || shipping.state || user.state,
      buyer.postalCode || shipping.postalCode
    ].filter(Boolean)
    return parts.join(', ') || 'N/A'
  }

  const getVendorOrderTotal = (order: any) =>
    Array.isArray(order?.items)
      ? order.items.reduce((sum: number, item: any) => sum + (Number(item?.price || 0) * Number(item?.quantity || 0)), 0)
      : 0

  const formatCompactNumber = (value: number) =>
    new Intl.NumberFormat('en-NG', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0)

  const soldFlashItems = orders
    .flatMap((order) =>
      (Array.isArray(order.items) ? order.items : [])
        .filter((item: any) => item?.isFlashDeal || item?.packageType)
        .map((item: any) => ({ order, item }))
    )
    .sort((a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime())

  const soldResaleItems = orders
    .flatMap((order) =>
      (Array.isArray(order.items) ? order.items : [])
        .filter((item: any) => item?.swapItemType === 'resale' || String(item?.productId || '').startsWith('resale-'))
        .map((item: any) => ({ order, item }))
    )
    .sort((a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime())

  const soldTradeInItems = orders
    .flatMap((order) =>
      (Array.isArray(order.items) ? order.items : [])
        .filter((item: any) => item?.swapItemType === 'tradein' || String(item?.productId || '').startsWith('tradein-'))
        .map((item: any) => ({ order, item }))
    )
    .sort((a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime())

  const fetchVendorOrders = async (token: string) => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/orders/vendor/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.status === 401) {
        console.error('Unauthorized - refreshing page')
        setOrdersLoaded(true)
        if (products.length > 0) {
          calculateAnalytics(products)
        }
        router.push('/login')
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
        // Update analytics based on orders - this is called after orders arrive
        calculateAnalyticsFromOrders(data)
        setOrdersLoaded(true)
        
        // Log vendor metrics
        const totalRevenue = data.reduce((sum: number, order: any) => {
          const orderStatus = getOrderStatus(order)
          const paymentStatus = getPaymentStatus(order)
          if (orderStatus !== 'cancelled' && paymentStatus === 'paid') {
            return sum + getVendorOrderTotal(order)
          }
          return sum
        }, 0)
        const paidOrders = data.filter((o: any) => {
          const paymentStatus = getPaymentStatus(o)
          return paymentStatus === 'paid' || paymentStatus === 'completed'
        }).length
        const pendingOrders = data.filter((o: any) => getPaymentStatus(o) === 'pending').length
        
        console.log(`[VENDOR DASHBOARD] Orders updated - Total: ${data.length} | Revenue: ${totalRevenue.toFixed(2)} | Paid: ${paidOrders} | Pending: ${pendingOrders}`)
      } else {
        console.error('Failed to fetch vendor orders:', response.status)
        setOrdersLoaded(true)
        if (products.length > 0) {
          calculateAnalytics(products)
        }
      }
    } catch (error) {
      console.error('Failed to fetch vendor orders:', error)
      setOrdersLoaded(true)
      if (products.length > 0) {
        calculateAnalytics(products)
      }
    }
  }

  // Fetch vendor's posted flash deals
  const fetchVendorFlashDeals = async () => {
    if (!storeId) return
    setLoadingFlashDeals(true)
    try {
      const response = await apiClient.get(`/packages?featured=true&storeId=${storeId}`)
      const rawDeals = Array.isArray(response.data) ? response.data : (response.data?.data || [])
      const deals = rawDeals.filter((deal: any) => String(deal.storeId || '') === String(storeId))
      setVendorFlashDeals(deals)
      console.log('[VENDOR DASHBOARD] Flash deals loaded:', deals.length)
    } catch (error: any) {
      console.error('Failed to fetch vendor flash deals:', error)
      setVendorFlashDeals([])
    } finally {
      setLoadingFlashDeals(false)
    }
  }

  // Handle posting a new flash deal
  const handlePostFlashDeal = async () => {
    if (!storeId) {
      alert('Store not found')
      return
    }

    if (!packageFormData.selectedPackageName || !packageFormData.price) {
      alert('Please fill in package type and price')
      return
    }
    if (!packageFormData.quantity) {
      alert('Please enter quantity for this flash deal')
      return
    }

    try {
      const payload = {
        selectedPackageName: packageFormData.selectedPackageName,
        batteryType: packageFormData.batteryType,
        maxBatteryLithium: packageFormData.batteryType === 'lithium' ? 10 : 0,
        maxBatteryTubular: packageFormData.batteryType === 'tubular' ? 10 : 0,
        inverterType: packageFormData.inverterType,
        powers: packageFormData.powers,
        warranty: packageFormData.warranty,
        price: parseFloat(packageFormData.price),
        quantity: parseInt(packageFormData.quantity || '0', 10),
        storeId,
        images: packageFormData.images
      }

      console.log('[VENDOR DASHBOARD] Posting flash deal:', payload)
      await apiClient.post('/packages/admin/flash-deals', payload)
      
      alert(' Flash deal posted successfully!')
      setShowFlashDealsModal(false)
      setPackageFormData({
        selectedPackageName: '',
        batteryType: 'lithium',
        inverterType: 'standard',
        powers: '',
        warranty: '',
        price: '',
        quantity: '',
        images: []
      })
      await fetchVendorFlashDeals()
    } catch (error: any) {
      console.error('Error posting flash deal:', error)
      alert(error.response.data.message || 'Failed to post flash deal')
    }
  }

  const handlePostEvFlashDeal = async () => {
    if (!storeId) {
      alert('Store not found')
      return
    }

    const selectedProduct = flashDealProducts.find((product: any) => String(product.id) === String(evFlashDealForm.productId))
    if (!selectedProduct) {
      alert('Please select an EV product for this flash deal')
      return
    }
    if (!evFlashDealForm.price) {
      alert('Please enter a flash deal price')
      return
    }
    if (!evFlashDealForm.quantity) {
      alert('Please enter quantity for this flash deal')
      return
    }
    const originalPrice = Number(selectedProduct.price || (selectedProduct as any).originalPrice || 0)
    const discountedPrice = Number(evFlashDealForm.price)
    if (Number.isFinite(originalPrice) && originalPrice > 0 && discountedPrice >= originalPrice) {
      alert('Flash deal price must be lower than the original product price')
      return
    }

    try {
      const payload = {
        selectedPackageName: selectedProduct.name,
        batteryType: evCategoryName,
        price: parseFloat(evFlashDealForm.price),
        quantity: parseInt(evFlashDealForm.quantity || '0', 10),
        description:
          evFlashDealForm.description ||
          String(
            selectedProduct.description ||
              (selectedProduct as any).productDescription ||
              (selectedProduct as any).details ||
              (selectedProduct as any).summary ||
              (selectedProduct as any).shortDescription ||
              ''
          ).trim() ||
          undefined,
        storeId,
        images: evFlashDealForm.images
      }

      console.log('[VENDOR DASHBOARD] Posting EV flash deal:', payload)
      await apiClient.post('/packages/admin/flash-deals', payload)

      alert(' Flash deal posted successfully!')
      setShowFlashDealsModal(false)
      setEvFlashDealForm({
        productId: '',
        price: '',
        quantity: '',
        description: '',
        images: []
      })
      await fetchVendorFlashDeals()
    } catch (error: any) {
      console.error('Error posting flash deal:', error)
      alert(error.response?.data?.message || 'Failed to post flash deal')
    }
  }

  // Handle editing a flash deal
  const handleEditFlashDeal = (deal: any) => {
    setEditingFlashDealId(deal.id)
    setEditFlashDealForm({
      id: deal.id,
      selectedPackageName: deal.name,
      batteryType: deal.category || 'lithium',
      inverterType: deal.inverterType || 'standard',
      powers: deal.powers || '',
      warranty: deal.warranty || '',
      description: deal.description || '',
      price: deal.vendorPrice ? (deal.vendorPrice / 1.10).toString() : '0',
      quantity: String(deal.quantity ?? ''),
      storeId,
      images: deal.images || []
    })
  }

  // Handle saving edited flash deal
  const handleSaveVendorFlashDeal = async () => {
    if (!editFlashDealForm.selectedPackageName || !editFlashDealForm.price) {
      alert('Please fill in all required fields')
      return
    }
    if (editFlashDealForm.quantity === '' || editFlashDealForm.quantity === null || editFlashDealForm.quantity === undefined) {
      alert('Please enter quantity for this flash deal')
      return
    }

    setSavingFlashDeal(true)
    try {
      await apiClient.put(`/packages/admin/flash-deals/${editFlashDealForm.id}`, {
        selectedPackageName: editFlashDealForm.selectedPackageName,
        batteryType: editFlashDealForm.batteryType,
        maxBatteryLithium: editFlashDealForm.batteryType === 'lithium' ? 10 : 0,
        maxBatteryTubular: editFlashDealForm.batteryType === 'tubular' ? 10 : 0,
        inverterType: editFlashDealForm.inverterType,
        powers: editFlashDealForm.powers,
        warranty: editFlashDealForm.warranty,
        description: editFlashDealForm.description,
        price: parseFloat(editFlashDealForm.price),
        quantity: parseInt(String(editFlashDealForm.quantity || '0'), 10),
        storeId: editFlashDealForm.storeId,
        images: editFlashDealForm.images
      })

      alert(' Flash deal updated successfully!')
      setEditingFlashDealId(null)
      setEditFlashDealForm(null)
      await fetchVendorFlashDeals()
    } catch (error: any) {
      console.error('Error saving flash deal:', error)
      alert(error.response.data.message || 'Failed to save flash deal')
    } finally {
      setSavingFlashDeal(false)
    }
  }

  // Handle deleting a flash deal
  const handleDeleteVendorFlashDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this flash deal')) return

    try {
      await apiClient.delete(`/packages/admin/flash-deals/${dealId}`)
      alert(' Flash deal deleted successfully!')
      await fetchVendorFlashDeals()
    } catch (error: any) {
      console.error('Error deleting flash deal:', error)
      alert(error.response.data.message || 'Failed to delete flash deal')
    }
  }

  // Fetch resale and trade-in listings
  const fetchResaleListings = async () => {
    setLoadingListings(true)
    try {
      const [resaleRes, tradeInRes] = await Promise.all([
        apiClient.get('/resales/my-listings'),
        apiClient.get('/trade-ins/my-listings')
      ])
      const resaleData = resaleRes.data.data || []
      const tradeInData = tradeInRes.data.data || []
      const currentUserId = user?.id
      setResaleListings(currentUserId ? resaleData.filter((r: any) => r.userId === currentUserId) : resaleData)
      setTradeInListings(currentUserId ? tradeInData.filter((t: any) => t.userId === currentUserId) : tradeInData)
    } catch (error) {
      console.error('Failed to fetch listings:', error)
    } finally {
      setLoadingListings(false)
    }
  }

  // Edit listing (full edit)
  const handleSaveListingEdit = async () => {
    if (!editingListing || !editingListingType) return
    try {
      const endpoint = editingListingType === 'resale' ? 'resales' : 'trade-ins'
      const priceField = editingListingType === 'resale' ? 'price' : 'estimatedPrice'
      const basePrice = parseFloat(editListingForm[priceField])

      if (!Number.isFinite(basePrice) || basePrice < 0) {
        alert('Please enter a valid price')
        return
      }

      const payload: any = {
        productName: editListingForm.productName,
        description: editListingForm.description,
        productCondition: editListingForm.productCondition,
        quantity: parseInt(editListingForm.quantity || '0', 10),
        inspectionFee: editListingForm.inspectionFee ? parseFloat(editListingForm.inspectionFee) : undefined,
        deliveryOption: editListingForm.deliveryOption
      }

      if (Array.isArray(editListingForm.images) && editListingForm.images.length > 0) {
        payload.images = editListingForm.images.slice(0, 1)
      }

      if (editingListingType === 'tradein') {
        payload.interestedInProduct = editListingForm.interestedInProduct
      }

      payload[priceField] = basePrice

      const response = await apiClient.put(`/${endpoint}/${editingListing.id}`, payload)

      if (response.data && response.data.data) {
        if (editingListingType === 'resale') {
          setResaleListings(prev => prev.map(r => r.id === editingListing.id ? response.data.data : r))
        } else {
          setTradeInListings(prev => prev.map(t => t.id === editingListing.id ? response.data.data : t))
        }
        setEditingListing(null)
        setEditingListingType(null)
        setEditListingForm({
          productName: '',
          description: '',
          interestedInProduct: '',
          productCondition: 'Good',
          price: '',
          estimatedPrice: '',
          quantity: '',
          inspectionFee: '',
          deliveryOption: 'both',
          images: [] as string[]
        })
        alert(' Listing updated successfully!')
      }
    } catch (error: any) {
      console.error('Failed to edit listing:', error)
      alert(error.response?.data?.message || 'Error updating listing')
    }
  }

  const fetchVendorInstallmentOrders = async (token: string) => {
    setInstallmentOrdersLoading(true)
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/installments/vendor/applications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const payload = await response.json()
        const data = Array.isArray(payload?.data) ? payload.data : []
        setInstallmentOrders(data)
      } else {
        setInstallmentOrders([])
      }
    } catch (error) {
      console.error('Failed to fetch vendor installment orders:', error)
      setInstallmentOrders([])
    } finally {
      setInstallmentOrdersLoading(false)
    }
  }

  const openEditListing = (listing: any, type: 'resale' | 'tradein') => {
    const basePrice = type === 'resale'
      ? Number(listing?.price || 0) / 1.1
      : Number(listing?.estimatedPrice || 0) / 1.1
    setEditingListing(listing)
    setEditingListingType(type)
    const listingImages = parseImageList(listing?.images)
    setEditListingForm({
      productName: listing?.productName || '',
      description: listing?.description || '',
      interestedInProduct: listing?.interestedInProduct || '',
      productCondition: listing?.productCondition || 'Good',
      price: type === 'resale' ? (basePrice ? basePrice.toString() : '') : '',
      estimatedPrice: type === 'tradein' ? (basePrice ? basePrice.toString() : '') : '',
      quantity: String(listing?.quantity ?? ''),
      inspectionFee: listing?.inspectionFee ? String(listing.inspectionFee) : '',
      deliveryOption: listing?.deliveryOption || 'both',
      images: listingImages.slice(0, 1)
    })
  }

  // Delete listing
  const handleDeleteListing = async (id: string, type: 'resale' | 'tradein') => {
    try {
      const endpoint = type === 'resale' ? 'resales' : 'trade-ins'
      
      const response = await apiClient.delete(`/${endpoint}/${id}`)
      
      if (response.data && response.data.message) {
        if (type === 'resale') {
          setResaleListings(prev => prev.filter(r => r.id !== id))
        } else {
          setTradeInListings(prev => prev.filter(t => t.id !== id))
        }
        setDeleteConfirmId(null)
        setDeleteConfirmType(null)
        alert(' Listing deleted successfully!')
      }
    } catch (error: any) {
      console.error('Failed to delete listing:', error)
      alert(error.response.data.message || 'Error deleting listing')
    }
  }

  const handleStoreUpdate = async () => {
    if (!user || !storeId) {
      alert('Store not found')
      return
    }

    // Validate phone number
    if (storeProfile.phone) {
      const phoneValidation = validatePhoneNumber(storeProfile.phone, storeProfile.country)
      if (!phoneValidation.isValid) {
        alert(phoneValidation.error || 'Invalid phone number')
        return
      }
    }

    // Validate email
    if (storeProfile.email) {
      const emailValidation = validateEmail(storeProfile.email)
      if (!emailValidation.isValid) {
        alert(emailValidation.error || 'Invalid email address')
        return
      }
    }

    try {
      const updateData: Record<string, any> = {}
      Object.keys(storeProfile).forEach((key) => {
        if (key !== 'logo' && key !== 'banner') {
          updateData[key] = storeProfile[key as keyof typeof storeProfile]
        }
      })

      if (storeLogoFile) {
        const { uploadImageToS3 } = await import('@/lib/s3ImageUploader')
        const s3Url = await uploadImageToS3(storeLogoFile, `store-logos/${storeId}`)
        updateData.logoUrl = s3Url
        updateData.logo = s3Url
      }

      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/stores/${storeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const updatedStore = await response.json()
        // Immediately update store display with response data (no extra fetch needed)
        setStoreProfile(updatedStore)
        // Clear file input
        setStoreLogoFile(null)
        alert('Store profile updated successfully!')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to update store profile')
      }
    } catch (error) {
      console.error('Failed to update store:', error)
      alert('Failed to update store profile')
    }
  }

  const calculateAnalytics = (productsList: Product[]) => {
    // Fallback to zeroed metrics when order-based analytics are unavailable
    const totalViews = 0
    const totalSales = 0
    const totalRevenue = 0
    const topProducts: any[] = []

    setAnalytics({
      totalViews,
      totalSales,
      totalRevenue,
      todayViews: Math.floor(totalViews * 0.1),
      todaySales: Math.floor(totalSales * 0.1),
      weekViews: Math.floor(totalViews * 0.3),
      weekSales: Math.floor(totalSales * 0.3),
      topProducts
    })
  }

  const calculateAnalyticsFromOrders = (vendorOrders: VendorOrder[]) => {
    // Calculate analytics from actual orders
    let totalSales = 0
    let totalRevenue = 0
    const productSalesMap: { [key: string]: { name: string; sales: number; revenue: number } } = {}

    // Get today's date for today's sales calculation
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let todaySales = 0
    let todayRevenue = 0

    vendorOrders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      orderDate.setHours(0, 0, 0, 0)

      // Only count completed/paid orders
      const orderStatus = getOrderStatus(order)
      const paymentStatus = getPaymentStatus(order)
      if (orderStatus !== 'cancelled' && paymentStatus === 'paid') {
        order.items.forEach(item => {
          totalSales += item.quantity
          totalRevenue += item.quantity * item.price

          // Track by product
          if (!productSalesMap[item.productName]) {
            productSalesMap[item.productName] = {
              name: item.productName,
              sales: 0,
              revenue: 0
            }
          }
          productSalesMap[item.productName].sales += item.quantity
          productSalesMap[item.productName].revenue += item.quantity * item.price

          // Count today's sales
          if (orderDate.getTime() === today.getTime()) {
            todaySales += item.quantity
            todayRevenue += item.quantity * item.price
          }
        })
      }
    })

    // Calculate week sales (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)

    let weekSales = 0
    vendorOrders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      const orderStatus = getOrderStatus(order)
      const paymentStatus = getPaymentStatus(order)
      if (orderDate >= weekAgo && orderStatus !== 'cancelled' && paymentStatus === 'paid') {
        order.items.forEach(item => {
          weekSales += item.quantity
        })
      }
    })

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p, idx) => ({
        id: idx,
        name: p.name,
        views: 0,
        sales: p.sales,
        revenue: p.revenue
      }))

    setAnalytics({
      totalViews: 0,
      totalSales,
      totalRevenue,
      todayViews: 0,
      todaySales,
      weekViews: 0,
      weekSales,
      topProducts
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    
    // If category changed, fetch its subcategories
    if (name === 'category' && value) {
      fetchSubcategoriesForCategory(value)
      // Reset subcategory when category changes
      setFormData(prev => ({
        ...prev,
        subcategory: ''
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate that images were uploaded to S3
    if (imageUrls.length === 0) {
      alert('Please upload at least one product image')
      return
    }

    try {
      console.log(`[VENDOR DASHBOARD] Creating product with ${imageUrls.length} images:`, {
        name: formData.name,
        category: formData.category,
        imageUrls: imageUrls.map(u => u.substring(0, 80) + '...'),
      });

      // Create FormData with form data + imageUrls
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('price', formData.price)
      formDataToSend.append('stock', formData.stock)
      formDataToSend.append('category', formData.category)
      if (formData.subcategory) {
        formDataToSend.append('subcategory', formData.subcategory)
      }
      formDataToSend.append('country', formData.country)
      formDataToSend.append('city', formData.city)
      formDataToSend.append('enablePaySmallSmall', formData.enablePaySmallSmall.toString())
      
      //  CRITICAL: Pass imageUrls array instead of files
      formDataToSend.append('imageUrls', JSON.stringify(imageUrls))

      // Log final payload before sending
      console.log(`[VENDOR DASHBOARD] Final payload:`, {
        name: formData.name,
        description: formData.description.substring(0, 50) + '...',
        price: formData.price,
        stock: formData.stock,
        category: formData.category,
        imageUrls: imageUrls,
        imageCount: imageUrls.length,
      });

      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      })

      if (response.status === 401) {
        alert('Your session has expired. Please log in again.')
        localStorage.removeItem('renewablezmart_current_user')
        localStorage.removeItem('accessToken')
        router.push('/login')
        return
      }

      if (response.ok) {
        console.log(`[VENDOR DASHBOARD]  Product created successfully`);
        alert('Product added successfully! It will appear on the landing page after admin approval.')
        setShowAddProduct(false)
        setFormData({
          name: '',
          description: '',
          price: '',
          stock: '',
          category: '',
          subcategory: '',
          image: '',
          country: formData.country,
          city: formData.city,
          enablePaySmallSmall: false
        })
        setImageUrls([])  // Clear S3 URLs
        fetchProducts(token!)
      } else {
        const error = await response.json()
        console.error(`[VENDOR DASHBOARD]  Product creation failed:`, error);
        const errorMessage = error.details.code ? `${error.message} (${error.details.code}: ${error.details.error})` : error.message || 'Unknown error'
        alert(`Failed to add product: ${errorMessage}`)
      }
    } catch (error) {
      console.error('[VENDOR DASHBOARD] Error adding product:', error)
      alert(`Failed to add product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDelete = async (productId: number) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this product')) return

    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Product deleted successfully!')
        fetchProducts(token!)
      } else {
        alert('Failed to delete product')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  const deleteAccount = async () => {
    if (!user) return
    
    const confirmText = prompt('This will permanently delete your account, all products, and store data. Type "DELETE" to confirm:')
    if (confirmText !== 'DELETE') {
      alert('Account deletion cancelled')
      return
    }

    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/users/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Account deleted successfully')
        localStorage.removeItem('renewablezmart_current_user')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        router.push('/')
      } else {
        const data = await response.json()
        alert(`Failed to delete account: ${data.message}`)
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account')
    }
  }

  const openStockModal = (product: Product) => {
    setStockUpdate({
      productId: product.id,
      newStock: product.stock,
      productName: product.name
    })
    setShowStockModal(true)
  }

  const handleStockUpdate = async () => {
    if (!user || !token) return

    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/products/${stockUpdate.productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stock: stockUpdate.newStock })
      })

      if (response.status === 401) {
        alert('Your session has expired. Please log in again.')
        router.push('/login')
        return
      }

      if (response.ok) {
        alert('Stock updated successfully!')
        setShowStockModal(false)
        fetchProducts(token!)
      } else {
        const errorData = await response.json()
        alert(`Failed to update stock: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating stock:', error)
      alert('Failed to update stock')
    }
  }

  const handleEditPrice = (product: Product) => {
    setPriceUpdate({
      productId: product.id.toString(),
      newPrice: product.price.toString(),
      productName: product.name
    })
    setShowPriceModal(true)
  }

  const handlePriceUpdate = async () => {
    if (!user) return

    try {
      const apiBase = getApiBaseUrl()
      let newPrice = parseFloat(priceUpdate.newPrice)

      if (isNaN(newPrice) || newPrice <= 0) {
        alert('Please enter a valid price greater than 0')
        return
      }

      // Add 10% to the price
      newPrice = newPrice * 1.1
      console.log(` Price update: ${parseFloat(priceUpdate.newPrice)} + 10% = ${newPrice.toFixed(2)}`)

      const response = await fetch(`${apiBase}/products/${priceUpdate.productId}/price`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ price: newPrice })
      })

      if (response.ok) {
        alert('Product price updated successfully!')
        setShowPriceModal(false)
        fetchProducts(token!)
      } else {
        const error = await response.json()
        alert(`Failed to update price: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating price:', error)
      alert('Failed to update price')
    }
  }

  const handleEditProduct = (product: Product) => {
    const basePrice = product?.price ? (Number(product.price) / 1.1) : 0
    const rawCategory =
      (product as any)?.category?.id ||
      (product as any)?.categoryId ||
      (product as any)?.category ||
      ''
    const categoryId = isEvVendor
      ? resolveCategoryId(categories[0]?.id || '')
      : resolveCategoryId(String(rawCategory))
    const rawSubcategory =
      (product as any)?.subcategory?.id ||
      (product as any)?.subcategoryId ||
      (product as any)?.subcategory ||
      ''
    const subcategoryId = String(rawSubcategory || '')

    setEditingProduct(product)
    setIsEditingProduct(true)
    setShowAddProduct(true)
    setFormData({
      name: product?.name || '',
      description: (product as any)?.description || '',
      price: basePrice ? basePrice.toString() : '',
      stock: String(product?.stock ?? ''),
      category: categoryId,
      subcategory: subcategoryId,
      image: '',
      country: (product as any)?.country || formData.country,
      city: (product as any)?.city || formData.city,
      enablePaySmallSmall: Boolean((product as any)?.enablePaySmallSmall)
    })

    if (categoryId) {
      fetchSubcategoriesForCategory(categoryId)
    }

    const currentImages = parseImageList((product as any).images)
    const fallbackImages = parseImageList((product as any).image)
    const resolvedImages = currentImages.length > 0 ? currentImages : fallbackImages
    setImageUrls(resolvedImages.slice(0, 1))
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct || !token) return

    if (imageUrls.length === 0) {
      alert('Please upload at least one product image')
      return
    }

    const basePrice = parseFloat(formData.price)
    if (isNaN(basePrice) || basePrice <= 0) {
      alert('Please enter a valid price greater than 0')
      return
    }

    const markedUpPrice = basePrice * 1.1

    setSavingProduct(true)
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: markedUpPrice,
          stock: formData.stock,
          category: formData.category,
          subcategory: formData.subcategory || null,
          country: formData.country,
          city: formData.city,
          image: imageUrls[0],
          images: imageUrls.slice(0, 1)
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update product')
      }

      alert('Product updated successfully!')
      setEditingProduct(null)
      setIsEditingProduct(false)
      setShowAddProduct(false)
      setImageUrls([])
      fetchProducts(token)
    } catch (error: any) {
      console.error('Error updating product:', error)
      alert(error?.message || 'Failed to update product')
    } finally {
      setSavingProduct(false)
    }
  }

  const handleJoinPaySmallSmall = async () => {
    if (!token) return
    try {
      await apiClient.put('/users/profile', { interestedInPaySmallSmall: true })
      setHasJoinedPaySmallSmall(true)
      updateUser({ interestedInPaySmallSmall: true })
      alert('You have successfully joined Pay Small Small.')
    } catch (error: any) {
      console.error('Failed to join Pay Small Small:', error)
      alert(error?.response?.data?.message || 'Failed to join Pay Small Small. Please try again.')
    }
  }

  // Fetch earnings data from orders and referrals
  const fetchEarningsData = async () => {
    if (!token) return
    
    setLoadingEarnings(true)
    try {
      // Calculate revenue from orders
      const paidOrdersRevenue = orders
        .filter(o => getPaymentStatus(o) === 'paid' && getOrderStatus(o) !== 'cancelled')
        .reduce((sum, o) => sum + getVendorOrderTotal(o), 0)
      
      setTotalStoreRevenue(paidOrdersRevenue)
      const fee = paidOrdersRevenue * commissionRate
      setPlatformFee(fee)
      setVendorEarnings(paidOrdersRevenue - fee)
      setAvailableBalance((paidOrdersRevenue - fee) - pendingPayouts)
      
      // Fetch referral earnings
      try {
        const referralRes = await apiClient.get('/referrals/my-stats')
        const refData = referralRes.data.data
        if (refData) {
          setReferralEarnings(parseFloat(refData.totalCommission || 0))
        }
      } catch (e) {
        console.error('Failed to fetch referral stats:', e)
      }
      
      // Fetch payout history
      try {
        const payoutRes = await apiClient.get('/store-payouts/my-requests')
        const payouts: any[] = payoutRes.data?.data?.requests || []
        setPayoutHistory(payouts)
        
        const pending = payouts
          .filter((p: any) => p.status === 'pending' || p.status === 'approved')
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount || p.requestedAmount || 0), 0)
        
        const completed = payouts
          .filter((p: any) => p.status === 'completed')
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount || p.requestedAmount || 0), 0)
        
        setPendingPayouts(pending)
        setCompletedPayouts(completed)
      } catch (e) {
        console.error('Failed to fetch payout history:', e)
      }
    } catch (error) {
      console.error('Failed to fetch earnings data:', error)
    } finally {
      setLoadingEarnings(false)
    }
  }

  const handleWithdrawalRequest = async () => {
    const amount = parseFloat(withdrawalAmount)
    if (!amount || amount <= 0) {
      alert('Please enter a valid withdrawal amount')
      return
    }
    
    if (amount < 1000) {
      alert('Minimum payout amount is ₦1,000')
      return
    }

    if (amount > availableBalance) {
      alert(`Insufficient balance. Available: ${formatPrice(availableBalance)}`)
      return
    }

    if (!storeId) {
      alert('Store not found. Please refresh and try again.')
      return
    }

    if (!storeProfile.bankName || !storeProfile.bankAccountNumber || !storeProfile.bankAccountName) {
      alert('Please add your bank details in Store Profile before requesting a withdrawal.')
      setActiveTab('profile')
      return
    }
    
    try {
      const response = await apiClient.post('/store-payouts/create', {
        storeId,
        amount,
        bankDetails: {
          bankName: storeProfile.bankName,
          accountName: storeProfile.bankAccountName,
          accountNumber: storeProfile.bankAccountNumber
        }
      })
      
      alert(' Payout request submitted successfully! Admin will review and process within 2-3 business days.')
      setShowWithdrawalModal(false)
      setWithdrawalAmount('')
      fetchEarningsData()
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to submit payout request')
    }
  }

  if (!user) {
    return null
  }
  const selectedFlashProduct = flashDealProducts.find((product: any) => String(product.id) === String(evFlashDealForm.productId))
  const selectedFlashOriginalPrice = selectedFlashProduct
    ? Number(selectedFlashProduct.price || (selectedFlashProduct as any).originalPrice || 0)
    : 0

  const vendorSidebarItems = [
    { key: 'products', label: 'My Products', icon: '📦' },
    { key: 'orders', label: `Orders (${orders.length})`, icon: '🧾' },
    ...(hasJoinedPaySmallSmall ? [{ key: 'installments', label: `Installments (${installmentOrders.length})`, icon: '💳' }] : []),
    { key: 'profile', label: 'Store Profile', icon: '🏪' },
    { key: 'flash-deals', label: `Flash Deals (${vendorFlashDeals.length})`, icon: '⚡' },
    { key: 'resale', label: 'Swap & Resell', icon: '🔄' },
    { key: 'earnings', label: 'Earnings', icon: '💰' },
    {
      key: 'add-product',
      label: 'Add Product',
      icon: '➕',
      onClick: () => {
        setEditingProduct(null)
        setIsEditingProduct(false)
        setImageUrls([])
        const evCategoryId = isEvVendor ? resolveCategoryId(categories[0]?.id || '') : ''
        if (evCategoryId) {
          fetchSubcategoriesForCategory(evCategoryId)
        }
        setFormData({
          name: '',
          description: '',
          price: '',
          stock: '',
          category: evCategoryId,
          subcategory: '',
          image: '',
          country: formData.country,
          city: formData.city,
          enablePaySmallSmall: false
        })
        setShowAddProduct(true)
      },
    },
    {
      key: 'post-solar',
      label: isEvVendor ? 'Post Flash Deal' : 'Post Solar Package',
      icon: isEvVendor ? '⚡' : '☀️',
      onClick: () => setShowFlashDealsModal(true),
    },
    {
      key: 'view-orders',
      label: 'View Orders',
      icon: '📋',
      onClick: () => setActiveTab('orders'),
    },
    {
      key: 'payout-request',
      label: 'Payout Request',
      icon: '🏦',
      onClick: () => setShowWithdrawalModal(true),
    },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <Head>
        <title>{isEvVendor ? 'E V Dealer Dashboard' : 'Vendor Dashboard'} - RenewableZmart</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Sora:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <Header />

      <main className="bg-gray-50 dark:bg-gray-900">
        <DashboardLayout
          title={isEvVendor ? 'E V Dealer Dashboard' : 'Vendor Dashboard'}
          subtitle="Store Management & Analytics Center"
          sidebarItems={vendorSidebarItems}
          activeKey={activeTab}
          hideHeader
          headerRight={<DashboardHeaderActions messageHref="/messages?tab=notifications" settingsHref="/vendor/store-settings" />}
          onNavigate={(key) => {
            const nextTab = key as typeof activeTab;
            if (nextTab === 'earnings') {
              fetchEarningsData();
            }
            setActiveTab(nextTab);
          }}
        >
          <div className="space-y-8">

        {/* Stats Cards Grid - Hidden but kept for reference */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 hidden">
        </div>

        {/* Stock Update Modal */}
        {showStockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4" onClick={() => setShowStockModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Update Stock</h2>
                  <button onClick={() => setShowStockModal(false)} className="text-3xl hover:text-black font-bold leading-none">×</button>
                </div>
              </div>

              <div className="p-6">
                <p className="text-black dark:text-white font-bold mb-4">Product: <span className="font-bold">{stockUpdate.productName}</span></p>
                
                <div className="mb-6">
                  <label className="block font-bold mb-2">New Stock Quantity</label>
                  <input
                    type="number"
                    value={stockUpdate.newStock}
                    onChange={(e) => setStockUpdate({ ...stockUpdate, newStock: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600 text-lg font-bold"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleStockUpdate}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition"
                  >
                    Update Stock
                  </button>
                  <button
                    onClick={() => setShowStockModal(false)}
                    className="px-6 py-3 border-2 border-gray-400 rounded-lg font-bold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Price Modal */}
        {showPriceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4" onClick={() => setShowPriceModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Edit Product Price</h2>
                  <button onClick={() => setShowPriceModal(false)} className="text-3xl hover:text-black font-bold leading-none">×</button>
                </div>
              </div>

              <div className="p-6">
                <p className="text-black dark:text-white font-bold mb-4">Product: <span className="font-bold">{priceUpdate.productName}</span></p>
                
                <div className="mb-6">
                  <label className="block font-bold mb-2">New Price</label>
                  <input
                    type="number"
                    value={priceUpdate.newPrice}
                    onChange={(e) => setPriceUpdate({ ...priceUpdate, newPrice: e.target.value })}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600 text-lg font-bold"
                    placeholder="e.g. 180,000"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handlePriceUpdate}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition"
                  >
                    Update Price
                  </button>
                  <button
                    onClick={() => setShowPriceModal(false)}
                    className="px-6 py-3 border-2 border-gray-400 rounded-lg font-bold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Product Modal */}
        {showAddProduct && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4"
            onClick={() => {
              setShowAddProduct(false)
              setEditingProduct(null)
              setIsEditingProduct(false)
              setImageUrls([])
            }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">{isEditingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                  <button onClick={() => { setShowAddProduct(false); setEditingProduct(null); setIsEditingProduct(false); setImageUrls([]) }} className="text-3xl hover:text-black font-bold leading-none">×</button>
                </div>
              </div>

              <form onSubmit={isEditingProduct ? handleUpdateProduct : handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block font-bold mb-2">{isEvVendor ? 'E V Product Name *' : 'Product Name *'}</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600"
                    placeholder={isEvVendor ? 'e.g. Electric Vehicle Battery' : 'e.g. 5KVA Solar Inverter'}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600"
                    placeholder="Detailed product description..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-2">Price *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600"
                      placeholder="50000"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-2">Stock Quantity *</label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      required
                      min="0"
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600"
                      placeholder="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-2">Category *</label>
                  {isEvVendor && (
                    <p className="text-xs text-emerald-700 font-semibold mb-2">
                      E V dealers can only upload products under {evCategoryName}.
                    </p>
                  )}
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    disabled={false}
                    className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.category && subcategories.length > 0 && (
                  <div>
                    <label className="block font-bold mb-2">Subcategory</label>
                    <select
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold"
                    >
                      <option value="">Select a subcategory (optional)</option>
                      {subcategories.map((subcat: any) => (
                        <option key={subcat.id} value={subcat.id}>
                          {subcat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold mb-2">Product Images * (Direct S3 Upload)</label>
                  <S3ImageUploader
                    folder="products"
                    maxImages={1}
                    onUploadComplete={(urls) => {
                      console.log(`[VENDOR DASHBOARD] Images uploaded successfully:`, urls);
                      setImageUrls(urls.slice(0, 1))
                    }}
                    onError={(error) => {
                      console.error(`[VENDOR DASHBOARD] Image upload error:`, error);
                      alert(`Image upload failed: ${error.message}`)
                    }}
                  />
                  
                  {/* Display uploaded image previews */}
                  {imageUrls.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-black dark:text-white font-bold mb-2"> {imageUrls.length} image(s) uploaded to S3:</p>
                      <div className="grid grid-cols-5 gap-2">
                        {imageUrls.map((url, index) => (
                          <div key={index} className="relative aspect-square bg-gray-100 rounded border overflow-hidden">
                            <img
                              src={getImageUrl(url)}
                              alt={`Uploaded ${index + 1}`}
                              className="w-full h-full object-cover rounded"
                              crossOrigin="anonymous"
                              onLoad={() => {
                                console.log(`[VENDOR DASHBOARD] Image ${index + 1} loaded successfully from S3`);
                              }}
                              onError={(e) => {
                                console.error(`[VENDOR DASHBOARD] Failed to load image ${index + 1} from URL:`, url);
                                // Set a gray background with checkmark instead of trying to load placeholder
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent && !parent.querySelector('.image-loaded')) {
                                  const label = document.createElement('div');
                                  label.className = 'image-loaded flex items-center justify-center h-full text-2xl bg-gradient-to-br from-green-50 to-emerald-50';
                                  label.textContent = '';
                                  parent.appendChild(label);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = imageUrls.filter((_, i) => i !== index)
                                setImageUrls(updated)
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 z-10"
                              title="Remove image"
                            >
                              -
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pay Small Small Option */}
                {(formData.category === 'solar' || formData.category === 'inverters' || formData.category === 'batteries') && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="enablePaySmallSmall"
                        checked={formData.enablePaySmallSmall}
                        onChange={(e) => setFormData({ ...formData, enablePaySmallSmall: e.target.checked })}
                        className="mt-1 w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <label htmlFor="enablePaySmallSmall" className="block font-bold text-emerald-800 mb-1 cursor-pointer">
                           Enable Pay Small Small for this product
                        </label>
                        <p className="text-sm text-black dark:text-white font-bold mb-2">
                          Allow customers to buy this product with flexible payment plans (50% upfront, balance in 3-6 months)
                        </p>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-emerald-200">
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-black dark:text-white font-bold">3 Months Plan:</span>
                              <span className="font-bold">{formatPrice(450000)} - {formatPrice(1000000)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-black dark:text-white font-bold">6 Months Plan:</span>
                              <span className="font-bold">Other amounts</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-emerald-100">
                              <span className="text-emerald-700 font-bold"> 0% Interest - No Hidden Charges</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition disabled:opacity-60" disabled={savingProduct}>
                    {savingProduct ? 'Saving...' : (isEditingProduct ? 'Update Product' : 'Add Product')}
                  </button>
                  <button type="button" onClick={() => { setShowAddProduct(false); setEditingProduct(null); setIsEditingProduct(false); setImageUrls([]) }} className="px-6 py-3 border-2 border-gray-400 rounded-lg font-bold hover:bg-gray-50 transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Flash Deals Modal */}
        {showFlashDealsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full my-8" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">{isEvVendor ? 'Post EV Flash Deal' : 'Post Solar Package'}</h2>
                  <button onClick={() => setShowFlashDealsModal(false)} className="text-3xl hover:text-black font-bold leading-none">×</button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {isEvVendor
                    ? 'Select an EV product and set a reduced price for a limited-time deal.'
                    : 'Create and post predefined solar packages for customers.'}
                </p>
              </div>

              {isEvVendor ? (
                <form className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="block font-bold mb-2">Select EV Product *</label>
                    <select
                      value={evFlashDealForm.productId}
                      onChange={(e) => {
                        const productId = e.target.value
                        const product = flashDealProducts.find((item: any) => String(item.id) === String(productId))
                        const productImage =
                          product?.image ||
                          (Array.isArray(product?.images) ? product.images[0] : '')
                        const productAny = product as any
                        const productDescription =
                          productAny?.description ||
                          productAny?.productDescription ||
                          productAny?.details ||
                          productAny?.summary ||
                          productAny?.shortDescription ||
                          ''
                        setEvFlashDealForm(prev => ({
                          ...prev,
                          productId,
                          price: product ? String(product.price || (product as any).originalPrice || '') : '',
                          quantity: product ? String(product.stock ?? '') : '',
                          description: productDescription ? String(productDescription) : prev.description,
                          images: productImage ? [productImage] : prev.images
                        }))
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-red-600 bg-white text-black font-semibold"
                    >
                      <option value="">Choose a product...</option>
                      {flashDealProducts.map((product: any) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    {flashDealProducts.length === 0 && (
                      <p className="mt-2 text-sm text-red-600 font-semibold">No EV products found for flash deals.</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold mb-2">Original Price</label>
                      <input
                        type="text"
                        value={selectedFlashOriginalPrice ? `₦${selectedFlashOriginalPrice.toLocaleString('en-US')}` : ''}
                        readOnly
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-700 font-semibold"
                        placeholder="Select a product to view price"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-2">Flash Deal Price (Reduced) *</label>
                      <input
                        type="number"
                        value={evFlashDealForm.price}
                        onChange={(e) => setEvFlashDealForm({ ...evFlashDealForm, price: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-red-600 text-black font-semibold"
                        placeholder="Enter reduced price"
                        step="100"
                        min="0"
                      />
                      <p className="text-xs text-gray-600 mt-1">Must be lower than the original price.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-2">Quantity (Stock) *</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={evFlashDealForm.quantity}
                      onChange={(e) => setEvFlashDealForm({ ...evFlashDealForm, quantity: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-red-600 text-black font-semibold"
                      placeholder="e.g. 5"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-2">Description</label>
                    <textarea
                      value={evFlashDealForm.description}
                      onChange={(e) => setEvFlashDealForm({ ...evFlashDealForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-red-600 text-black"
                      placeholder="Tell customers what makes this EV deal special..."
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-2">Flash Deal Image (Optional)</label>
                    <div className="border-2 border-dashed border-gray-400 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const files = e.target.files
                          if (!files) return

                          setUploadingPackageImages(true)
                          const { uploadImageToS3 } = await import('@/lib/s3ImageUploader')
                          try {
                            const file = files[0]
                            if (!file) return
                            const url = await uploadImageToS3(file, 'packages')
                            setEvFlashDealForm(prev => ({
                              ...prev,
                              images: [url]
                            }))
                          } catch (error) {
                            console.error('Image upload failed:', error)
                            alert('Failed to upload image')
                          } finally {
                            setUploadingPackageImages(false)
                          }
                        }}
                        disabled={uploadingPackageImages}
                        className="hidden"
                        id="package-images"
                      />
                      <label htmlFor="package-images" className="cursor-pointer">
                        <div className="text-4xl mb-2"></div>
                        <p className="font-bold text-gray-900 mb-1">Click to upload an image</p>
                        <p className="text-xs text-gray-600">or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to 5MB</p>
                      </label>
                    </div>

                    {evFlashDealForm.images.length > 0 && (
                      <div className="mt-4">
                        <p className="font-bold mb-2">Selected Image</p>
                        <div className="grid grid-cols-3 gap-3">
                          {evFlashDealForm.images.map((img, idx) => (
                            <div key={idx} className="relative">
                              <img src={img} alt={`Flash deal ${idx}`} className="w-full h-24 object-cover rounded border" />
                              <button
                                type="button"
                                onClick={() => setEvFlashDealForm(prev => ({
                                  ...prev,
                                  images: prev.images.filter((_, i) => i !== idx)
                                }))}
                                className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                              >
                                -
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold mb-3">Flash Deal Summary</h3>
                    <ul className="space-y-2 text-sm">
                      <li><span className="font-semibold">Product:</span> {selectedFlashProduct?.name || '(Select a product)'}</li>
                      <li><span className="font-semibold">Original Price:</span> {selectedFlashOriginalPrice ? `₦${selectedFlashOriginalPrice.toLocaleString('en-US')}` : '—'}</li>
                      <li><span className="font-semibold">Flash Deal Price:</span> {evFlashDealForm.price ? `₦${Number(evFlashDealForm.price).toLocaleString('en-US')}` : '—'}</li>
                      <li><span className="font-semibold">Quantity:</span> {evFlashDealForm.quantity || '—'}</li>
                      {evFlashDealForm.description ? (
                        <li><span className="font-semibold">Description:</span> {evFlashDealForm.description}</li>
                      ) : null}
                    </ul>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={handlePostEvFlashDeal}
                      className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50"
                      disabled={uploadingPackageImages || flashDealProducts.length === 0}
                    >
                      Post Flash Deal
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFlashDealsModal(false)}
                      className="px-6 py-3 border-2 border-gray-400 rounded-lg font-bold hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <form className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Package Type Selection */}
                  <div>
                    <label className="block font-bold mb-2">Select Package Type *</label>
                    <select 
                      value={packageFormData.selectedPackageName}
                      onChange={(e) => {
                        const pkg = e.target.value;
                        setPackageFormData({ ...packageFormData, selectedPackageName: pkg });
                        
                        // Auto-set inverter type for Hybrid Smart Home
                        if (pkg.includes('Hybrid')) {
                          setPackageFormData(prev => ({ ...prev, inverterType: 'hybrid' }));
                        } else {
                          setPackageFormData(prev => ({ ...prev, inverterType: 'standard' }));
                        }
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-red-600 bg-white text-black font-semibold"
                    >
                      <option value="">Choose a package...</option>
                      <option value="Starter Backup (No Panel)">Starter Backup (No Panel) - 0 panels</option>
                      <option value="Starter Backup Package">Starter Backup Package - 1-2 panels</option>
                      <option value="Apartment Essential Package">Apartment Essential Package - 2-3 panels</option>
                      <option value="Family Home Package">Family Home Package - 3-5 panels</option>
                      <option value="Premium Home Package">Premium Home Package - 6-8 panels</option>
                      <option value="Hybrid Smart Home Package">Hybrid Smart Home Package - 8-12 panels (Hybrid Inverter)</option>
                      <option value="Retail Store Package">Retail Store Package - 3-4 panels</option>
                      <option value="Small Office Package">Small Office Package - 4-6 panels</option>
                      <option value="Medium Office Package">Medium Office Package - 6-10 panels</option>
                    </select>
                  </div>

                  {/* Battery Type Selection */}
                  <div>
                    <label className="block font-bold mb-2">Battery Type *</label>
                    <select 
                      value={packageFormData.batteryType}
                      onChange={(e) => setPackageFormData({ ...packageFormData, batteryType: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-red-600 bg-white text-black font-semibold"
                    >
                      <option value="lithium"> Lithium (3-5 years warranty)</option>
                      <option value="tubular"> Tubular (1-2 years warranty)</option>
                    </select>
                  </div>

                  {/* Inverter Type Selection */}
                  <div>
                    <label className="block font-bold mb-2">Inverter Type *</label>
                    <select 
                      value={packageFormData.inverterType}
                      onChange={(e) => setPackageFormData({ ...packageFormData, inverterType: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-red-600 bg-white text-black font-semibold"
                    >
                      <option value="standard"> Standard Inverter</option>
                      <option value="hybrid"> Hybrid Inverter (Smart Home)</option>
                    </select>
                  </div>

                  {/* Powers */}
                  <div>
                    <label className="block font-bold mb-2">Powers</label>
                    <textarea
                      value={packageFormData.powers}
                      onChange={(e) => setPackageFormData({ ...packageFormData, powers: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-red-600 text-black"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block font-bold mb-2">Description</label>
                    <textarea
                      value={packageFormData.warranty}
                      onChange={(e) => setPackageFormData({ ...packageFormData, warranty: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-red-600 text-black"
                    />
                  </div>

                  {/* Package Price */}
                  <div>
                    <label className="block font-bold mb-2">Package Price *</label>
                    <input
                      type="number"
                      value={packageFormData.price}
                      onChange={(e) => setPackageFormData({ ...packageFormData, price: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-red-600 text-black font-semibold"
                      placeholder="e.g. 500000"
                      step="1000"
                      min="0"
                    />
                    <p className="text-xs text-gray-600 mt-1">Total price for the complete package</p>
                  </div>

                  {/* Package Quantity */}
                  <div>
                    <label className="block font-bold mb-2">Quantity (Stock) *</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={packageFormData.quantity}
                      onChange={(e) => setPackageFormData({ ...packageFormData, quantity: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-red-600 text-black font-semibold"
                      placeholder="e.g. 5"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block font-bold mb-2">Package Images (Optional)</label>
                    <div className="border-2 border-dashed border-gray-400 rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files) return;

                          setUploadingPackageImages(true);
                          const { uploadImageToS3 } = await import('@/lib/s3ImageUploader');
                          
                          try {
                            const file = files[0];
                            if (!file) return;
                            const url = await uploadImageToS3(file, 'packages');
                            setPackageFormData(prev => ({
                              ...prev,
                              images: [url]
                            }));
                          } catch (error) {
                            console.error('Image upload failed:', error);
                            alert('Failed to upload images');
                          } finally {
                            setUploadingPackageImages(false);
                          }
                        }}
                        disabled={uploadingPackageImages}
                        className="hidden"
                        id="package-images"
                      />
                      <label htmlFor="package-images" className="cursor-pointer">
                        <div className="text-4xl mb-2"></div>
                        <p className="font-bold text-gray-900 mb-1">Click to upload package images</p>
                        <p className="text-xs text-gray-600">or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to 5MB</p>
                      </label>
                    </div>
                    
                    {/* Image Preview */}
                    {packageFormData.images.length > 0 && (
                      <div className="mt-4">
                        <p className="font-bold mb-2">Uploaded Images ({packageFormData.images.length})</p>
                        <div className="grid grid-cols-3 gap-3">
                          {packageFormData.images.map((img, idx) => (
                            <div key={idx} className="relative">
                              <img src={img} alt={`Package ${idx}`} className="w-full h-24 object-cover rounded border" />
                              <button
                                type="button"
                                onClick={() => setPackageFormData(prev => ({
                                  ...prev,
                                  images: prev.images.filter((_, i) => i !== idx)
                                }))}
                                className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                              >
                                -
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Package Summary */}
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold mb-3"> Package Includes:</h3>
                    <ul className="space-y-2 text-sm">
                      <li> <span className="font-semibold">Panels:</span> {packageFormData.selectedPackageName || '(Select a package)'}</li>
                      <li> <span className="font-semibold">Battery:</span> {packageFormData.batteryType === 'lithium' ? 'Lithium (3-5 yrs)' : 'Tubular (1-2 yrs)'}</li>
                      <li> <span className="font-semibold">Inverter:</span> {packageFormData.inverterType === 'hybrid' ? 'Hybrid (Smart Home)' : 'Standard'}</li>
                      <li> <span className="font-semibold">Installation Kit:</span> Always included</li>
                    </ul>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={handlePostFlashDeal}
                      className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50"
                      disabled={uploadingPackageImages}
                    >
                       Post Solar Package
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowFlashDealsModal(false)} 
                      className="px-6 py-3 border-2 border-gray-400 rounded-lg font-bold hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Products List */}
        {activeTab === 'products' ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h2 className="text-2xl font-bold">Your Products</h2>
              <button
                onClick={() => setShowAddProduct(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition"
                >
                 Add Product
              </button>
            </div>

            {!hasJoinedPaySmallSmall && (
              <div className="mb-6 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-bold text-emerald-800">Join Pay Small Small</h3>
                    <p className="text-sm text-black font-semibold">
                      Enable flexible installment plans for your customers and increase conversion.
                    </p>
                  </div>
                  <button
                    onClick={handleJoinPaySmallSmall}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition whitespace-nowrap"
                  >
                    Join Now
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-black dark:text-white font-bold">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4"></div>
                <p className="text-black dark:text-white font-bold mb-4">You haven't added any products yet</p>
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition"
                >
                  Add Your First Product
                </button>
              </div>
            ) : (
              <>
                <div className="md:hidden space-y-3">
                  {products.map((product) => (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <img
                          src={resolveDisplayImage(product)}
                          alt={product.name}
                          className="w-14 h-14 object-cover rounded"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).src = getSmallFallbackImage('No Image')
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold break-words">{product.name}</p>
                          <p className="text-sm text-gray-600">{resolveCategoryLabel(product.category)}</p>
                          <p className="text-sm font-bold mt-1">{formatPrice(product.price)}</p>
                          <p className="text-sm">Stock: {product.stock}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              (product as any).approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                              (product as any).approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {(product as any).approvalStatus === 'approved' ? 'Approved' :
                                (product as any).approvalStatus === 'rejected' ? 'Rejected' :
                                'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => handleEditPrice(product)} className="text-green-700 font-bold text-sm">Edit Price</button>
                        <button onClick={() => openStockModal(product)} className="text-blue-700 font-bold text-sm">Update Stock</button>
                        <button onClick={() => handleEditProduct(product)} className="text-purple-700 font-bold text-sm">Edit</button>
                        <button onClick={() => handleDelete(product.id)} className="text-red-700 font-bold text-sm">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-black dark:text-white font-bold">Product</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-black dark:text-white font-bold">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-black dark:text-white font-bold">Price</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-black dark:text-white font-bold">Stock</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-black dark:text-white font-bold">Stock Status</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-black dark:text-white font-bold">Approval Status</th>
                      <th className="px-4 py-3 text-left text-sm font-bold text-black dark:text-white font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={resolveDisplayImage(product)}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                ;(e.currentTarget as HTMLImageElement).src = getSmallFallbackImage('No Image')
                              }}
                            />
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-black dark:text-white font-bold">{resolveCategoryLabel(product.category)}</td>
                        <td className="px-4 py-3 text-sm font-bold">
                          {formatPrice(product.price)}
                        </td>
                        <td className="px-4 py-3 text-sm">{product.stock}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            (product as any).approvalStatus === 'approved' ? 'bg-green-100 text-green-800' : 
                            (product as any).approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {(product as any).approvalStatus === 'approved' ? 'Approved' : 
                             (product as any).approvalStatus === 'rejected' ? 'Rejected' : 
                             'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPrice(product)}
                              className="text-green-600 hover:text-green-800 font-bold text-sm"
                            >
                              Edit Price
                            </button>
                            <button
                              onClick={() => openStockModal(product)}
                              className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                            >
                              Update Stock
                            </button>
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="text-purple-600 hover:text-purple-800 font-bold text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-800 font-bold text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        ) : activeTab === 'orders' ? (
          /* Orders Tab */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold"> Customer Orders</h2>
              <span className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-bold">
                Total: {orders.length}
              </span>
            </div>
            <div className="max-w-xl">
              <input
                type="search"
                placeholder="Search orders by customer, product, or ID..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {orders.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
                <p className="text-2xl mb-2"></p>
                <p className="text-black dark:text-white font-bold text-lg">No orders yet</p>
                <p className="text-black dark:text-white font-bold text-sm mt-2">When customers purchase your products, orders will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders
                  .filter((order) => {
                    const q = orderSearch.trim().toLowerCase()
                    if (!q) return true
                    const customer = `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim()
                    const items = Array.isArray(order.items) ? order.items : []
                    const createdAt = order.createdAt ? new Date(order.createdAt) : null
                    const haystack = [
                      order.id,
                      customer,
                      order.user?.email,
                      createdAt ? createdAt.toLocaleDateString() : '',
                      createdAt ? createdAt.toISOString().slice(0, 10) : '',
                      ...items.map((i) => i?.productName)
                    ].filter(Boolean).join(' ').toLowerCase()
                    return haystack.includes(q)
                  })
                  .map((order) => {
                  const orderStatus = getOrderStatus(order)
                  const paymentStatus = getPaymentStatus(order)
                  const displayTotal = getVendorOrderTotal(order)
                  return (
                  <details key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-[180px]">
                        <p className="text-xs text-black dark:text-white font-bold uppercase tracking-wide">Order</p>
                        <p className="font-mono font-bold text-sm">{order.id.substring(0, 8)}...</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold">Items: {order.items.length}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-black dark:text-white font-bold uppercase tracking-wide">Date</p>
                        <p className="text-sm font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          orderStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                          orderStatus === 'shipped' || orderStatus === 'in_transit' || orderStatus === 'out_for_delivery' ? 'bg-blue-100 text-blue-800' :
                          orderStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          delivery: {orderStatus.replace(/_/g, ' ') || 'pending'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          payment: {paymentStatus}
                        </span>
                      </div>
                    </summary>

                    <div className="px-6 pb-6">
                      <div className="border-t pt-4 mb-4">
                        <p className="text-sm font-bold text-black dark:text-white mb-3">Items Ordered</p>
                        <div className="space-y-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex gap-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg hover:bg-gray-100 transition">
                              {/* Product Image */}
                              <div className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                                <img
                                  src={resolveOrderItemImage(item)}
                                  alt={item.productName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = getSmallFallbackImage('No Image')
                                  }}
                                />
                              </div>
                              
                              <div className="flex-1 flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-gray-900">{item.productName}</p>
                                  <div className="flex gap-3 mt-2 text-sm text-black dark:text-white font-bold">
                                    <span>Qty: <span className="font-medium text-gray-900">{item.quantity}</span></span>
                                    <span>Price: <span className="font-medium text-gray-900">{formatPrice(item.price)}</span></span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-black dark:text-white font-bold">Subtotal</p>
                                  <p className="font-bold text-emerald-600">{formatPrice(item.price * item.quantity)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t">
                        <div>
                          <p className="text-sm text-black dark:text-white font-bold">Customer</p>
                          <p className="font-medium">{order.user.firstName || 'N/A'} {order.user.lastName || ''}</p>
                          <p className="text-sm text-black dark:text-white font-bold">{order.user.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-black dark:text-white font-bold">Total</p>
                          <p className="text-2xl font-bold text-green-600 price-inline">{formatPrice(displayTotal)}</p>
                        </div>
                      </div>
                    </div>
                  </details>
                )})}
              </div>
            )}
          </div>
        ) : activeTab === 'installments' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Installment Orders (Pay Small Small)</h2>
              <span className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-bold">
                Total: {installmentOrders.length}
              </span>
            </div>
            <div className="max-w-xl">
              <input
                type="search"
                placeholder="Search installment orders..."
                value={installmentSearch}
                onChange={(e) => setInstallmentSearch(e.target.value)}
                className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {installmentOrdersLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 font-bold">Loading installment orders...</div>
            ) : installmentOrders.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
                <p className="text-black dark:text-white font-bold text-lg">No installment orders yet</p>
                <p className="text-black dark:text-white font-bold text-sm mt-2">Approved Pay Small Small applications will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {installmentOrders
                  .filter((app) => {
                    const q = installmentSearch.trim().toLowerCase()
                    if (!q) return true
                    const customerName = (app.user?.firstName || app.user?.lastName)
                      ? `${app.user?.firstName || ''} ${app.user?.lastName || ''}`.trim()
                      : app.fullName || ''
                    const productNames = (app.vendorItems || []).map((i) => i?.productName).filter(Boolean)
                    const createdAt = app.createdAt ? new Date(app.createdAt) : null
                    const approvedAt = app.approvedAt ? new Date(app.approvedAt) : null
                    const haystack = [
                      app.id,
                      customerName,
                      app.address,
                      createdAt ? createdAt.toLocaleDateString() : '',
                      createdAt ? createdAt.toISOString().slice(0, 10) : '',
                      approvedAt ? approvedAt.toLocaleDateString() : '',
                      approvedAt ? approvedAt.toISOString().slice(0, 10) : '',
                      ...productNames
                    ].filter(Boolean).join(' ').toLowerCase()
                    return haystack.includes(q)
                  })
                  .map((app) => {
                  const customerName = (app.user?.firstName || app.user?.lastName)
                    ? `${app.user?.firstName || ''} ${app.user?.lastName || ''}`.trim()
                    : app.fullName || 'Customer'
                  const customerEmail = app.user?.email || app.email || 'N/A'
                  const customerPhone = app.user?.phone || app.phone || 'N/A'
                  const appStatus = String(app.status || 'pending').toLowerCase()
                  const paymentStatus = String(
                    app.paymentStatus ||
                    (appStatus === 'payment_completed' ? 'paid' : appStatus === 'approved' ? 'pending' : 'n/a')
                  ).toLowerCase()
                  const deliveryStatus = String(app.deliveryStatus || 'pending').toLowerCase()
                  const installationStatus = String(app.installationStatus || 'pending').toLowerCase()
                  const firstPaymentDate = app.firstPaymentDate ? new Date(app.firstPaymentDate) : null
                  const appStatusLabel = appStatus === 'payment_completed'
                    ? `50% payment completed${firstPaymentDate ? ` • ${firstPaymentDate.toLocaleDateString()}` : ''}`
                    : appStatus.replace(/_/g, ' ')

                  const statusPill =
                    appStatus === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : appStatus === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  const paymentPill =
                    paymentStatus === 'paid' || paymentStatus === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : paymentStatus === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  const deliveryPill =
                    deliveryStatus === 'delivered'
                      ? 'bg-green-100 text-green-800'
                      : deliveryStatus === 'shipped' || deliveryStatus === 'in_transit' || deliveryStatus === 'out_for_delivery'
                        ? 'bg-blue-100 text-blue-800'
                        : deliveryStatus === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                  const installationPill =
                    installationStatus === 'installed'
                      ? 'bg-green-100 text-green-800'
                      : installationStatus === 'in_progress' || installationStatus === 'scheduled'
                        ? 'bg-blue-100 text-blue-800'
                        : installationStatus === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'

                  return (
                    <details key={app.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                      <summary className="cursor-pointer list-none px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-[200px]">
                          <p className="text-xs text-black dark:text-white font-bold uppercase tracking-wide">Customer</p>
                          <p className="font-bold text-sm text-gray-900">{customerName}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold truncate max-w-[260px]">{app.address || 'N/A'}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold">
                            Sold: {(app.vendorItems || []).length}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-black dark:text-white font-bold uppercase tracking-wide">Applied</p>
                          <p className="text-sm font-semibold">{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusPill}`}>
                            {appStatusLabel}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${paymentPill}`}>
                            {appStatus === 'payment_completed'
                              ? `payment: 50% paid${firstPaymentDate ? ` • ${firstPaymentDate.toLocaleDateString()}` : ''}`
                              : `payment: ${paymentStatus.replace(/_/g, ' ')}`}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${deliveryPill}`}>
                            delivery: {deliveryStatus.replace(/_/g, ' ')}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${installationPill}`}>
                            install: {installationStatus.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </summary>

                      <div className="px-6 pb-6">
                        <div className="border-t pt-4 mb-4">
                          <p className="text-sm font-bold text-black dark:text-white mb-3">Products</p>
                          <div className="space-y-3">
                            {(app.vendorItems || []).map((item, idx) => (
                              <div key={`${app.id}-item-${idx}`} className="flex gap-4 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                <div className="w-16 h-16 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                                  <img
                                    src={item.image ? getImageUrl(item.image) : getSmallFallbackImage('No Image')}
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = getSmallFallbackImage('No Image')
                                    }}
                                  />
                                </div>
                                <div className="flex-1 flex justify-between items-start">
                                  <div>
                                    <p className="font-bold text-gray-900">{item.productName}</p>
                                    <div className="flex gap-3 mt-2 text-sm text-black dark:text-white font-bold">
                                      <span>Qty: <span className="font-medium text-gray-900">{item.quantity}</span></span>
                                      <span>Price: <span className="font-medium text-gray-900">{formatPrice(item.price)}</span></span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-black dark:text-white font-bold">Subtotal</p>
                                    <p className="font-bold text-emerald-600">{formatPrice(item.price * item.quantity)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                          <div>
                            <p className="text-sm text-black dark:text-white font-bold">Pay Small Small</p>
                            <p className="text-sm text-black dark:text-white font-bold">Total: {formatPrice(app.vendorTotal || 0)}</p>
                            <p className="text-sm text-black dark:text-white font-bold">First Payment: {formatPrice(app.firstPayment || 0)}</p>
                            <p className="text-sm text-black dark:text-white font-bold">Monthly: {formatPrice(app.monthlyPayment || 0)} • {app.months || 'N/A'} months</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-black dark:text-white font-bold">Application</p>
                            <p className="font-medium">Approved {app.approvedAt ? new Date(app.approvedAt).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </details>
                  )
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'profile' ? (
          /* Store Profile Tab */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                            <h2 className="text-2xl font-bold mb-6"> Store Profile</h2>
            
            <div className="space-y-6">
              {/* Store Logo */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">Store Logo</label>
                {(storeProfile.logoUrl || storeProfile.logo) && (
                  <div className="mb-4">
                    <div className="cursor-pointer" onClick={() => {
                      setViewingImage(getImageUrl(storeProfile.logoUrl || storeProfile.logo))
                    }}>
                      <img 
                        src={getImageUrl(storeProfile.logoUrl || storeProfile.logo)} 
                        alt="Current logo" 
                        className="w-16 h-16 object-cover rounded-full hover:opacity-90 transition"
                        onError={(e) => {
                          e.currentTarget.src = ''
                        }}
                      />
                      <p className="text-xs text-black dark:text-white font-bold mt-1">Click to view full size</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Remove store logo This action cannot be undone.')) {
                          try {
                            const apiBase = getApiBaseUrl()
                            const response = await fetch(`${apiBase}/stores/${storeId}/remove-image`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token!}`
                              },
                              body: JSON.stringify({ imageType: 'logo' })
                            })
                            if (response.ok) {
                              setStoreProfile({ ...storeProfile, logoUrl: '', logo: '' })
                              alert('Logo removed successfully')
                            } else {
                              alert('Failed to remove logo')
                            }
                          } catch (error) {
                            alert('Failed to remove logo')
                          }
                        }
                      }}
                      className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
                    >
                       Remove Logo
                    </button>
                  </div>
                )}
                {storeLogoFile && (
                  <div className="mb-4 cursor-pointer" onClick={() => setViewingImage(URL.createObjectURL(storeLogoFile))}>
                    <img 
                      src={URL.createObjectURL(storeLogoFile)} 
                      alt="New logo" 
                      className="w-16 h-16 object-cover rounded-full hover:opacity-90 transition"
                    />
                    <p className="text-xs text-black dark:text-white font-bold mt-1">Click to view full size</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setStoreLogoFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-black dark:text-white font-bold mt-1">Recommended size: 400x400px</p>
              </div>

              {/* Store Name */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">Store Name</label>
                <input
                  type="text"
                  value={storeProfile.name}
                  onChange={(e) => setStoreProfile({ ...storeProfile, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter store name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">Description</label>
                <textarea
                  value={storeProfile.description}
                  onChange={(e) => setStoreProfile({ ...storeProfile, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  rows={4}
                  placeholder="Describe your store"
                />
              </div>

              {/* Contact Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">Phone</label>
                  <input
                    type="tel"
                    value={storeProfile.phone}
                    onChange={(e) => setStoreProfile({ ...storeProfile, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder={storeProfile.country ? (getPhoneInfo(storeProfile.country)?.format || 'Phone number') : 'Phone number'}
                  />
                  {storeProfile.country && getPhoneInfo(storeProfile.country) && (
                    <p className="text-xs text-black dark:text-white font-bold mt-1">Format: {getPhoneInfo(storeProfile.country)?.format}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">Email</label>
                  <input
                    type="email"
                    value={storeProfile.email}
                    onChange={(e) => setStoreProfile({ ...storeProfile, email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Store email"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">Address</label>
                <input
                  type="text"
                  value={storeProfile.address}
                  onChange={(e) => setStoreProfile({ ...storeProfile, address: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Store address"
                />
              </div>

              {/* Location */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">Country <span className="text-red-500">*</span></label>
                  <select
                    value={storeProfile.country}
                    onChange={(e) => {
                      const selectedCountry = africanCountries.find(c => c.name === e.target.value)
                      setAvailableStoreCities(selectedCountry?.states || selectedCountry?.cities || [])
                      setStoreProfile({ ...storeProfile, country: e.target.value, city: '', state: '' })
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-800 text-black dark:text-white border-black dark:border-gray-600 font-semibold"
                  >
                    <option value="">Select Country</option>
                    {africanCountries.map((country) => (
                      <option key={country.name} value={country.name}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">City/State <span className="text-red-500">*</span></label>
                  <select
                    value={storeProfile.city}
                    onChange={(e) => setStoreProfile({ ...storeProfile, city: e.target.value, state: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-800 text-black dark:text-white border-black dark:border-gray-600 font-semibold disabled:bg-gray-100 dark:disabled:bg-gray-700"
                    disabled={!storeProfile.country}
                  >
                    <option value="">Select City/State</option>
                    {availableStoreCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bank Account Section */}
              <div className="mt-8 pt-6 border-t-2 border-emerald-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4"> Bank Account (For Payouts)</h3>
                <p className="text-sm text-black dark:text-white font-bold mb-4">Add your bank account details to receive payouts and payments</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">Account Name</label>
                    <input
                      type="text"
                      value={storeProfile.bankAccountName}
                      onChange={(e) => setStoreProfile({ ...storeProfile, bankAccountName: e.target.value })}
                      placeholder="Account holder name"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">Account Number</label>
                    <input
                      type="text"
                      value={storeProfile.bankAccountNumber}
                      onChange={(e) => setStoreProfile({ ...storeProfile, bankAccountNumber: e.target.value })}
                      placeholder="Bank account number"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">Bank Name</label>
                    <input
                      type="text"
                      value={storeProfile.bankName}
                      onChange={(e) => setStoreProfile({ ...storeProfile, bankName: e.target.value })}
                      placeholder="Bank name"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">Bank Code</label>
                    <input
                      type="text"
                      value={storeProfile.bankCode}
                      onChange={(e) => setStoreProfile({ ...storeProfile, bankCode: e.target.value })}
                      placeholder="Bank code"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white font-bold mb-2">Bank Country</label>
                    <input
                      type="text"
                      value={storeProfile.bankCountry}
                      onChange={(e) => setStoreProfile({ ...storeProfile, bankCountry: e.target.value })}
                      placeholder="Country"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={handleStoreUpdate}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-emerald-700 transition"
                >
                   Save Store Profile
                </button>
              </div>

              {/* Danger Zone */}
              <div className="mt-8 pt-6 border-t-2 border-red-200">
                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                  <h3 className="text-lg font-bold text-red-800 mb-2"> Danger Zone</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Once you delete your account, there is no going back. This will permanently delete your account, 
                    all your products, store information, and all associated data.
                  </p>
                  <button
                    onClick={deleteAccount}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition"
                  >
                     Delete My Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'flash-deals' ? (
          /* Flash Deals Tab */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold"> Your Flash Deals ({vendorFlashDeals.length})</h2>
              <button
                onClick={() => setShowFlashDealsModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition"
              >
                + Post New Deal
              </button>
            </div>

            <div className="max-w-xl mb-4">
              <input
                type="search"
                placeholder="Search flash deals..."
                value={flashSearch}
                onChange={(e) => setFlashSearch(e.target.value)}
                className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {loadingFlashDeals ? (
              <div className="text-center py-12 text-black dark:text-white font-bold">Loading flash deals...</div>
            ) : vendorFlashDeals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4"></div>
                <p className="text-black dark:text-white font-bold mb-4">You haven't posted any flash deals yet</p>
                <button
                  onClick={() => setShowFlashDealsModal(true)}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition"
                >
                  Post Your First Flash Deal
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">Manage Posted Flash Deals</h3>
                    <p className="text-sm text-gray-600 font-semibold">Create, edit, or remove your live packages.</p>
                  </div>
                  <div className="text-sm text-gray-600 font-semibold bg-gray-100 px-3 py-1 rounded-full">
                    {vendorFlashDeals.length} deal{vendorFlashDeals.length !== 1 ? 's' : ''} posted
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {vendorFlashDeals
                    .filter((deal) => {
                      const q = flashSearch.trim().toLowerCase()
                      if (!q) return true
                      const createdAt = deal?.createdAt ? new Date(deal.createdAt) : null
                      const haystack = [
                        deal?.name,
                        deal?.selectedPackageName,
                        deal?.category,
                        deal?.inverterType,
                        createdAt ? createdAt.toLocaleDateString() : '',
                        createdAt ? createdAt.toISOString().slice(0, 10) : ''
                      ].filter(Boolean).join(' ').toLowerCase()
                      return haystack.includes(q)
                    })
                    .map((deal) => {
                    const rawImage = (deal.images && deal.images[0]) || deal.image || ''
                    const imageSrc = rawImage
                      ? (rawImage.startsWith('http') ? rawImage : `${getBackendBaseUrl()}${rawImage}`)
                      : ''
                    const batteryLabel = deal.category === 'lithium'
                      ? 'Lithium'
                      : deal.category === 'tubular'
                        ? 'Tubular'
                        : (deal.category || 'Battery')
                    const createdAt = deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : '-'
                    const inverterLabel = deal.inverterType === 'hybrid' ? 'Hybrid' : 'Standard'

                    return (
                      <details key={deal.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-lg transition ring-1 ring-transparent hover:ring-red-100">
                        <summary className="cursor-pointer list-none flex items-center gap-3">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 overflow-hidden flex items-center justify-center border border-red-100">
                            {imageSrc ? (
                              <img src={imageSrc} alt={deal.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-2xl text-red-400">?</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 leading-tight">{deal.name}</h4>
                            <p className="text-xs text-gray-500 font-semibold mt-1">Posted: {createdAt}</p>
                            <p className="text-xs text-gray-700 font-semibold">Price: {formatPrice(deal.vendorPrice)} • Qty: {deal.quantity ?? 0}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">Flash Deal</span>
                              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold">{batteryLabel}</span>
                              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold">{inverterLabel}</span>
                            </div>
                          </div>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">Active</span>
                        </summary>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 font-bold">Price</p>
                            <p className="text-sm font-bold text-gray-900 price-inline">{formatPrice(deal.vendorPrice)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 font-bold">Quantity</p>
                            <p className="text-sm font-bold text-gray-900">{deal.quantity ?? 0}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleEditFlashDeal(deal)}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition"
                          >
                            Edit Deal
                          </button>
                          <button
                            onClick={() => handleDeleteVendorFlashDeal(deal.id)}
                            className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </details>
                    )
                  })}
                </div>

                <div className="mt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="text-lg font-bold">Sold Flash Deals</h3>
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      {soldFlashItems.length} sold
                    </span>
                  </div>
                  <div className="max-w-xl mb-4">
                    <input
                      type="search"
                      placeholder="Search sold flash deals..."
                      value={flashSoldSearch}
                      onChange={(e) => setFlashSoldSearch(e.target.value)}
                      className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  {soldFlashItems.length === 0 ? (
                    <div className="text-sm font-semibold text-gray-500">No sold flash deals yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {soldFlashItems
                        .filter(({ order, item }) => {
                          const q = flashSoldSearch.trim().toLowerCase()
                          if (!q) return true
                          const name = getOrderCustomerName(order)
                          const address = getOrderCustomerAddress(order)
                          const date = order?.createdAt ? new Date(order.createdAt) : null
                          const haystack = [
                            order?.id,
                            item?.productName,
                            name,
                            address,
                            date ? date.toLocaleDateString() : '',
                            date ? date.toISOString().slice(0, 10) : ''
                          ].filter(Boolean).join(' ').toLowerCase()
                          return haystack.includes(q)
                        })
                        .map(({ order, item }) => (
                          <details key={`${order.id}-${item.productId}`} className="bg-gray-50 rounded-lg px-4 py-3">
                            <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold uppercase text-gray-600">Customer</p>
                                <p className="font-semibold text-sm">{getOrderCustomerName(order)}</p>
                                <p className="text-xs text-gray-500">{getOrderCustomerAddress(order)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold uppercase text-gray-600">Item</p>
                                <p className="font-semibold text-sm">{item?.productName || 'Flash Deal'}</p>
                                <p className="text-xs text-gray-500">Qty: {item?.quantity || 1}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">
                                  payment: {getPaymentStatus(order)}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                                  delivery: {getOrderStatus(order)}
                                </span>
                              </div>
                            </summary>
                            <div className="pt-3 text-sm font-semibold text-gray-700">
                              Order Date: {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'} • Price: {formatPrice(Number(item?.price || 0))}
                            </div>
                          </details>
                        ))}
                    </div>
                  )}
                </div>

                {/* Edit Flash Deal Modal */}
                {editingFlashDealId && editFlashDealForm && (
                  <div className="mt-8 bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">
                       Edit Flash Deal: {editFlashDealForm.selectedPackageName}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-black mb-2">{isEvVendor ? 'Product Name' : 'Package Name'}</label>
                        <input
                          type="text"
                          value={editFlashDealForm.selectedPackageName}
                          onChange={(e) => setEditFlashDealForm({ ...editFlashDealForm, selectedPackageName: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-blue-600 text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-black mb-2">Price</label>
                        <input
                          type="number"
                          value={editFlashDealForm.price}
                          onChange={(e) => setEditFlashDealForm({ ...editFlashDealForm, price: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-blue-600 text-black"
                          step="1000"
                          min="0"
                          placeholder="e.g. 500000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-black mb-2">Quantity (Stock)</label>
                        <input
                          type="number"
                          value={editFlashDealForm.quantity}
                          onChange={(e) => setEditFlashDealForm({ ...editFlashDealForm, quantity: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-blue-600 text-black"
                          step="1"
                          min="0"
                          placeholder="e.g. 10"
                        />
                      </div>
                      {isEvVendor && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-black mb-2">Description</label>
                          <textarea
                            value={editFlashDealForm.description || ''}
                            onChange={(e) => setEditFlashDealForm({ ...editFlashDealForm, description: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-blue-600 text-black"
                            rows={3}
                          />
                        </div>
                      )}
                      {!isEvVendor && (
                        <>
                          <div>
                            <label className="block text-sm font-bold text-black mb-2">Battery Type</label>
                            <select
                              value={editFlashDealForm.batteryType}
                              onChange={(e) => setEditFlashDealForm({ ...editFlashDealForm, batteryType: e.target.value })}
                              className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-blue-600 text-black"
                            >
                              <option value="lithium"> Lithium</option>
                              <option value="tubular"> Tubular</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-black mb-2">Inverter Type</label>
                            <select
                              value={editFlashDealForm.inverterType}
                              onChange={(e) => setEditFlashDealForm({ ...editFlashDealForm, inverterType: e.target.value })}
                              className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-blue-600 text-black"
                            >
                              <option value="standard"> Standard</option>
                              <option value="hybrid"> Hybrid</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-black mb-2">Powers/Capabilities</label>
                            <textarea
                              value={editFlashDealForm.powers}
                              onChange={(e) => setEditFlashDealForm({ ...editFlashDealForm, powers: e.target.value })}
                              className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-blue-600 text-black"
                              rows={2}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-black mb-2">Warranty Information</label>
                            <textarea
                              value={editFlashDealForm.warranty}
                              onChange={(e) => setEditFlashDealForm({ ...editFlashDealForm, warranty: e.target.value })}
                              className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-blue-600 text-black"
                              rows={2}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-bold text-black mb-2">Deal Images</label>
                      <S3ImageUploader
                        folder="admin-flash-deals"
                        maxImages={1}
                        onUploadComplete={(urls) => {
                          setEditFlashDealForm({ ...editFlashDealForm, images: urls.slice(0, 1) })
                        }}
                        onError={(error) => {
                          console.error('Flash deal edit upload error:', error)
                          alert(`Image upload failed: ${error.message}`)
                        }}
                      />
                      {Array.isArray(editFlashDealForm.images) && editFlashDealForm.images.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                          {editFlashDealForm.images.map((img: string, idx: number) => (
                            <div key={idx} className="relative aspect-square border rounded overflow-hidden">
                              <img src={getImageUrl(img)} alt={`Flash deal image ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setEditFlashDealForm({
                                  ...editFlashDealForm,
                                  images: editFlashDealForm.images.filter((_: string, i: number) => i !== idx)
                                })}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button onClick={handleSaveVendorFlashDeal} disabled={savingFlashDeal} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50">
                        {savingFlashDeal ? ' Saving...' : ' Save Changes'}
                      </button>
                      <button onClick={() => { setEditingFlashDealId(null); setEditFlashDealForm(null); }} className="px-6 py-2 border-2 border-gray-400 rounded-lg font-bold hover:bg-gray-50 transition">
                         Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'resale' ? (
          /* Swap & Resell Tab */
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6"> Swap & Resell Products</h2>

            <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Choose Upload Form</label>
              <select
                value={swapFormType}
                onChange={(e) => setSwapFormType(e.target.value as 'resale' | 'tradein')}
                className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg font-semibold focus:outline-none focus:border-orange-500"
              >
                <option value="resale">Sell My Product</option>
                <option value="tradein">Trade-In Product</option>
              </select>
            </div>

            {swapFormType === 'resale' ? (
              <div className="bg-slate-900 dark:bg-slate-900 p-6 rounded-lg mb-10">
                <h3 className="text-xl font-bold text-orange-700 dark:text-orange-100 mb-3"> Sell My Product</h3>
                <ResaleForm />
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg mb-10">
                <h3 className="text-xl font-bold text-blue-700 dark:text-blue-100 mb-3"> Trade-In Product</h3>
                <TradeInForm />
              </div>
            )}
            
            {/* Resale Listings */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4"> My Resale Listings</h3>
              <div className="max-w-xl mb-4">
                <input
                  type="search"
                  placeholder="Search resale listings..."
                  value={resaleSearch}
                  onChange={(e) => setResaleSearch(e.target.value)}
                  className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              {loadingListings ? (
                <div className="text-center py-8 text-gray-500">Loading your listings...</div>
              ) : resaleListings.length === 0 ? (
                <div className="bg-slate-900 dark:bg-slate-900 p-6 rounded-lg text-center">
                  <p className="text-orange-800 dark:text-orange-200 font-bold">No resale listings yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {resaleListings
                    .filter((listing) => {
                      const q = resaleSearch.trim().toLowerCase()
                      if (!q) return true
                      const createdAt = listing?.createdAt ? new Date(listing.createdAt) : null
                      const haystack = [
                        listing?.productName,
                        listing?.brand,
                        listing?.productCondition,
                        listing?.deliveryOption,
                        listing?.status,
                        createdAt ? createdAt.toLocaleDateString() : '',
                        createdAt ? createdAt.toISOString().slice(0, 10) : ''
                      ].filter(Boolean).join(' ').toLowerCase()
                      return haystack.includes(q)
                    })
                    .map(listing => (
                    <details key={listing.id} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3">
                      <summary className="cursor-pointer list-none flex justify-between items-center gap-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg">{listing.productName}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{listing.brand} • {listing.productCondition}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Delivery: {listing.deliveryOption} • Price: {formatPrice(listing.price)}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          listing.status === 'approved' ? 'bg-green-100 text-green-800' :
                          listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          listing.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          listing.status === 'sold' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {listing.status.toUpperCase()}
                        </span>
                      </summary>
                      <div className="pt-4">
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Base Price</p>
                            <p className="font-bold">{formatPrice(listing.price / 1.1)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">With 10% Fee</p>
                            <p className="font-bold text-orange-600">{formatPrice(listing.price)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Delivery</p>
                            <p className="font-bold capitalize">{listing.deliveryOption}</p>
                          </div>
                        </div>
                        {Array.isArray(listing.images) && listing.images.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Images</p>
                            <div className="grid grid-cols-5 gap-2">
                              {listing.images.slice(0, 5).map((img: string, idx: number) => (
                                <img key={idx} src={getImageUrl(img)} alt={`Resale image ${idx + 1}`} className="w-14 h-14 object-cover rounded border" />
                              ))}
                            </div>
                          </div>
                        )}
                        {listing.status !== 'sold' && (
                          <div className="flex gap-2 pt-4 border-t">
                            {deleteConfirmId === listing.id && deleteConfirmType === 'resale' ? (
                              <>
                                <p className="flex-1 text-sm text-red-600 dark:text-red-400 font-bold">
                                  Delete this listing
                                </p>
                                <button
                                  onClick={() => handleDeleteListing(listing.id, 'resale')}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteConfirmId(null)
                                    setDeleteConfirmType(null)
                                  }}
                                  className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => openEditListing(listing, 'resale')}
                                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                >
                                   Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteConfirmId(listing.id)
                                    setDeleteConfirmType('resale')
                                  }}
                                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                >
                                   Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>

            {/* Trade-In Listings */}
            <div>
              <h3 className="text-xl font-bold mb-4"> My Trade-In Requests</h3>
              <div className="max-w-xl mb-4">
                <input
                  type="search"
                  placeholder="Search trade-in requests..."
                  value={tradeSearch}
                  onChange={(e) => setTradeSearch(e.target.value)}
                  className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {loadingListings ? (
                <div className="text-center py-8 text-gray-500">Loading your requests...</div>
              ) : tradeInListings.length === 0 ? (
                <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg text-center">
                  <p className="text-blue-800 dark:text-blue-200 font-bold">No trade-in requests yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tradeInListings
                    .filter((listing) => {
                      const q = tradeSearch.trim().toLowerCase()
                      if (!q) return true
                      const createdAt = listing?.createdAt ? new Date(listing.createdAt) : null
                      const haystack = [
                        listing?.productName,
                        listing?.brand,
                        listing?.yearOfManufacture,
                        listing?.deliveryOption,
                        listing?.status,
                        createdAt ? createdAt.toLocaleDateString() : '',
                        createdAt ? createdAt.toISOString().slice(0, 10) : ''
                      ].filter(Boolean).join(' ').toLowerCase()
                      return haystack.includes(q)
                    })
                    .map(listing => (
                    <details key={listing.id} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3">
                      <summary className="cursor-pointer list-none flex justify-between items-center gap-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg">{listing.productName}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{listing.brand} • Year: {listing.yearOfManufacture}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Delivery: {listing.deliveryOption} • Est: {formatPrice(listing.estimatedPrice)}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          listing.status === 'approved' ? 'bg-green-100 text-green-800' :
                          listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          listing.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {listing.status.toUpperCase()}
                        </span>
                      </summary>
                      <div className="pt-4">
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Base Estimated Price</p>
                            <p className="font-bold">{formatPrice(listing.estimatedPrice / 1.1)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">With 10% Fee</p>
                            <p className="font-bold text-blue-600">{formatPrice(listing.estimatedPrice)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Delivery</p>
                            <p className="font-bold capitalize">{listing.deliveryOption}</p>
                          </div>
                        </div>
                        {Array.isArray(listing.images) && listing.images.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Images</p>
                            <div className="grid grid-cols-5 gap-2">
                              {listing.images.slice(0, 5).map((img: string, idx: number) => (
                                <img key={idx} src={getImageUrl(img)} alt={`Trade-in image ${idx + 1}`} className="w-14 h-14 object-cover rounded border" />
                              ))}
                            </div>
                          </div>
                        )}
                        {listing.status !== 'approved' && (
                          <div className="flex gap-2 pt-4 border-t">
                            {deleteConfirmId === listing.id && deleteConfirmType === 'tradein' ? (
                              <>
                                <p className="flex-1 text-sm text-red-600 dark:text-red-400 font-bold">
                                  Delete this request
                                </p>
                                <button
                                  onClick={() => handleDeleteListing(listing.id, 'tradein')}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteConfirmId(null)
                                    setDeleteConfirmType(null)
                                  }}
                                  className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => openEditListing(listing, 'tradein')}
                                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                >
                                   Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteConfirmId(listing.id)
                                    setDeleteConfirmType('tradein')
                                  }}
                                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                >
                                   Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-lg font-bold">Sold Resale Items</h3>
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {soldResaleItems.length} sold
                </span>
              </div>
              <div className="max-w-xl mb-4">
                <input
                  type="search"
                  placeholder="Search sold resale items..."
                  value={resaleSoldSearch}
                  onChange={(e) => setResaleSoldSearch(e.target.value)}
                  className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              {soldResaleItems.length === 0 ? (
                <div className="text-sm font-semibold text-gray-500">No sold resale items yet.</div>
              ) : (
                <div className="space-y-3">
                  {soldResaleItems
                    .filter(({ order, item }) => {
                      const q = resaleSoldSearch.trim().toLowerCase()
                      if (!q) return true
                      const name = getOrderCustomerName(order)
                      const address = getOrderCustomerAddress(order)
                      const date = order?.createdAt ? new Date(order.createdAt) : null
                      const haystack = [
                        order?.id,
                        item?.productName,
                        name,
                        address,
                        date ? date.toLocaleDateString() : '',
                        date ? date.toISOString().slice(0, 10) : ''
                      ].filter(Boolean).join(' ').toLowerCase()
                      return haystack.includes(q)
                    })
                    .map(({ order, item }) => (
                      <details key={`${order.id}-${item.productId}`} className="bg-gray-50 rounded-lg px-4 py-3">
                        <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase text-gray-600">Customer</p>
                            <p className="font-semibold text-sm">{getOrderCustomerName(order)}</p>
                            <p className="text-xs text-gray-500">{getOrderCustomerAddress(order)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold uppercase text-gray-600">Item</p>
                            <p className="font-semibold text-sm">{item?.productName || 'Resale Item'}</p>
                            <p className="text-xs text-gray-500">Qty: {item?.quantity || 1}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">
                              payment: {getPaymentStatus(order)}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                              delivery: {getOrderStatus(order)}
                            </span>
                          </div>
                        </summary>
                        <div className="pt-3 text-sm font-semibold text-gray-700">
                          Order Date: {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'} • Price: {formatPrice(Number(item?.price || 0))}
                        </div>
                      </details>
                    ))}
                </div>
              )}
            </div>

            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-lg font-bold">Sold Trade-In Items</h3>
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {soldTradeInItems.length} sold
                </span>
              </div>
              <div className="max-w-xl mb-4">
                <input
                  type="search"
                  placeholder="Search sold trade-in items..."
                  value={tradeSoldSearch}
                  onChange={(e) => setTradeSoldSearch(e.target.value)}
                  className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {soldTradeInItems.length === 0 ? (
                <div className="text-sm font-semibold text-gray-500">No sold trade-in items yet.</div>
              ) : (
                <div className="space-y-3">
                  {soldTradeInItems
                    .filter(({ order, item }) => {
                      const q = tradeSoldSearch.trim().toLowerCase()
                      if (!q) return true
                      const name = getOrderCustomerName(order)
                      const address = getOrderCustomerAddress(order)
                      const date = order?.createdAt ? new Date(order.createdAt) : null
                      const haystack = [
                        order?.id,
                        item?.productName,
                        name,
                        address,
                        date ? date.toLocaleDateString() : '',
                        date ? date.toISOString().slice(0, 10) : ''
                      ].filter(Boolean).join(' ').toLowerCase()
                      return haystack.includes(q)
                    })
                    .map(({ order, item }) => (
                      <details key={`${order.id}-${item.productId}`} className="bg-gray-50 rounded-lg px-4 py-3">
                        <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase text-gray-600">Customer</p>
                            <p className="font-semibold text-sm">{getOrderCustomerName(order)}</p>
                            <p className="text-xs text-gray-500">{getOrderCustomerAddress(order)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold uppercase text-gray-600">Item</p>
                            <p className="font-semibold text-sm">{item?.productName || 'Trade-In Item'}</p>
                            <p className="text-xs text-gray-500">Qty: {item?.quantity || 1}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">
                              payment: {getPaymentStatus(order)}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                              delivery: {getOrderStatus(order)}
                            </span>
                          </div>
                        </summary>
                        <div className="pt-3 text-sm font-semibold text-gray-700">
                          Order Date: {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'} • Price: {formatPrice(Number(item?.price || 0))}
                        </div>
                      </details>
                    ))}
                </div>
              )}
            </div>

            {editingListing && editingListingType && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4" onClick={() => { setEditingListing(null); setEditingListingType(null); }}>
                <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold">
                        {editingListingType === 'resale' ? 'Edit Resale Listing' : 'Edit Trade-In Request'}
                      </h2>
                      <button onClick={() => { setEditingListing(null); setEditingListingType(null); }} className="text-3xl hover:text-black font-bold leading-none">×</button>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block font-bold mb-2">Product Name *</label>
                      <input
                        type="text"
                        value={editListingForm.productName}
                        onChange={(e) => setEditListingForm({ ...editListingForm, productName: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-2">Description</label>
                      <textarea
                        value={editListingForm.description}
                        onChange={(e) => setEditListingForm({ ...editListingForm, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    {editingListingType === 'tradein' && (
                      <div>
                        <label className="block font-bold mb-2">Interested In Product *</label>
                        <input
                          type="text"
                          value={editListingForm.interestedInProduct}
                          onChange={(e) => setEditListingForm({ ...editListingForm, interestedInProduct: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold mb-2">Product Condition *</label>
                        <select
                          value={editListingForm.productCondition}
                          onChange={(e) => setEditListingForm({ ...editListingForm, productCondition: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600"
                        >
                          <option value="Like New">Like New</option>
                          <option value="Good">Good</option>
                          <option value="Fair">Fair</option>
                          <option value="Poor">Poor</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold mb-2">Quantity *</label>
                        <input
                          type="number"
                          value={editListingForm.quantity}
                          onChange={(e) => setEditListingForm({ ...editListingForm, quantity: e.target.value })}
                          min="0"
                          className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold mb-2">
                          {editingListingType === 'resale' ? 'Asking Price *' : 'Estimated Price *'}
                        </label>
                        <input
                          type="number"
                          value={editingListingType === 'resale' ? editListingForm.price : editListingForm.estimatedPrice}
                          onChange={(e) => setEditListingForm({
                            ...editListingForm,
                            [editingListingType === 'resale' ? 'price' : 'estimatedPrice']: e.target.value
                          })}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Price with 10% fee:{' '}
                          {formatPrice((parseFloat(editingListingType === 'resale' ? editListingForm.price : editListingForm.estimatedPrice) || 0) * 1.1)}
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold mb-2">Inspection Fee</label>
                        <input
                          type="number"
                          value={editListingForm.inspectionFee}
                          onChange={(e) => setEditListingForm({ ...editListingForm, inspectionFee: e.target.value })}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold mb-2">Delivery Option *</label>
                      <select
                        value={editListingForm.deliveryOption}
                        onChange={(e) => setEditListingForm({ ...editListingForm, deliveryOption: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600"
                      >
                        <option value="pickup">Pickup</option>
                        <option value="delivery">Delivery</option>
                        <option value="both">Pickup & Delivery</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold mb-2">Images *</label>
                      <S3ImageUploader
                        folder="products"
                        maxImages={1}
                        onUploadComplete={(urls) => {
                          setEditListingForm({ ...editListingForm, images: urls.slice(0, 1) })
                        }}
                        onError={(error) => {
                          console.error('Listing image upload error:', error)
                          alert(`Image upload failed: ${error.message}`)
                        }}
                      />

                      {editListingForm.images.length > 0 && (
                        <div className="mt-3 grid grid-cols-5 gap-2">
                          {editListingForm.images.map((img: string, idx: number) => (
                            <div key={idx} className="relative">
                              <img src={getImageUrl(img)} alt={`Listing image ${idx + 1}`} className="w-14 h-14 object-cover rounded border" />
                              <button
                                type="button"
                                onClick={() => setEditListingForm({
                                  ...editListingForm,
                                  images: editListingForm.images.filter((_: string, i: number) => i !== idx)
                                })}
                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={handleSaveListingEdit}
                        className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition"
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingListing(null); setEditingListingType(null); }}
                        className="px-6 py-3 border-2 border-gray-400 rounded-lg font-bold hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* ===== EARNINGS TAB ===== */}
        {activeTab === 'earnings' ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Earned Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <h3 className="text-sm text-gray-600 font-bold mb-2">Total Earned</h3>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 price-inline">{formatPrice(totalStoreRevenue)}</p>
                <p className="text-xs text-gray-500 mt-2">From all paid orders</p>
              </div>

              {/* Platform Commission Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-red-500">
                <h3 className="text-sm text-gray-600 font-bold mb-2">Platform Commission</h3>
                <p className="text-2xl sm:text-3xl font-bold text-red-600 price-inline">{formatPrice(platformFee)}</p>
                <p className="text-xs text-gray-500 mt-2">Our service fee (10%)</p>
              </div>

              {/* Your Net Earnings Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-emerald-500">
                <h3 className="text-sm text-gray-600 font-bold mb-2">Your Net Earnings</h3>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 price-inline">{formatPrice(vendorEarnings)}</p>
                <p className="text-xs text-gray-500 mt-2">Available for withdrawal</p>
              </div>

              {/* Referral Bonus Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                <h3 className="text-sm text-gray-600 font-bold mb-2">Referral Bonus</h3>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600 price-inline">{formatPrice(referralEarnings)}</p>
                <p className="text-xs text-gray-500 mt-2">From referral program</p>
              </div>
            </div>

            {/* Account Balance Section */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg shadow-md p-8 border border-emerald-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Available Balance */}
                <div className="bg-white rounded-lg p-6">
                  <p className="text-sm text-gray-600 font-bold mb-2"> Available Balance</p>
                  <p className="text-2xl sm:text-4xl font-bold text-emerald-600 price-inline">{formatPrice(Math.max(0, availableBalance))}</p>
                  <p className="text-xs text-gray-500 mt-2">Ready to withdraw</p>
                </div>

                {/* Pending Payouts */}
                <div className="bg-white rounded-lg p-6">
                  <p className="text-sm text-gray-600 font-bold mb-2"> Pending Payouts</p>
                  <p className="text-2xl sm:text-4xl font-bold text-yellow-600 price-inline">{formatPrice(pendingPayouts)}</p>
                  <p className="text-xs text-gray-500 mt-2">Awaiting admin approval</p>
                </div>

                {/* Completed Payouts */}
                <div className="bg-white rounded-lg p-6">
                  <p className="text-sm text-gray-600 font-bold mb-2"> Completed Payouts</p>
                  <p className="text-2xl sm:text-4xl font-bold text-blue-600 price-inline">{formatPrice(completedPayouts)}</p>
                  <p className="text-xs text-gray-500 mt-2">Successfully withdrawn</p>
                </div>
              </div>

              {/* Quick Withdrawal Button */}
              <button
                onClick={() => {
                  if (!storeProfile.bankAccountName || !storeProfile.bankAccountNumber) {
                    alert(' Please add your bank details in Store Profile before requesting a withdrawal.')
                    setActiveTab('profile')
                    return
                  }
                  setShowWithdrawalModal(true)
                }}
                className="w-full bg-emerald-600 text-white py-4 rounded-lg font-bold hover:bg-emerald-700 transition text-lg"
              >
                 Request Withdrawal
              </button>
            </div>

            {/* Commission Breakdown Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4"> Commission Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-black dark:text-white font-bold">Commission Rate</span>
                  <span className="text-2xl font-bold text-red-600">10%</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-black dark:text-white font-bold">Example: Order of 100,000</span>
                  <span className="text-sm sm:text-lg font-bold break-words">Commission: NGN 10,000 | Your Earnings: NGN 90,000</span>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                   The 10% commission helps us maintain the platform, provide 24/7 support, and ensure secure payments for all vendors.
                </p>
              </div>
            </div>

            {/* Payout History */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4"> Payout History</h3>
              
              {loadingEarnings ? (
                <div className="text-center py-8 text-gray-500">Loading payout history...</div>
              ) : payoutHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 font-bold">No payout requests yet</p>
                  <p className="text-sm text-gray-500">Your withdrawal requests will appear here</p>
                </div>
              ) : (
                <>
                <div className="md:hidden space-y-3">
                  {payoutHistory.map((payout: any, idx: number) => {
                    const bankDetails = (() => {
                      if (!payout?.bankDetails) return null
                      if (typeof payout.bankDetails === 'string') {
                        try {
                          return JSON.parse(payout.bankDetails)
                        } catch {
                          return null
                        }
                      }
                      return payout.bankDetails
                    })()
                    const accountLast4 = bankDetails?.accountNumber
                      ? String(bankDetails.accountNumber).slice(-4)
                      : payout.accountNumber
                        ? String(payout.accountNumber).slice(-4)
                        : ''
                    return (
                      <div key={`payout-mobile-${idx}`} className="border border-gray-200 rounded-lg p-3">
                        <p className="text-xs text-gray-500 font-bold">Date</p>
                        <p className="font-semibold">{new Date(payout.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500 font-bold mt-2">Amount</p>
                        <p className="font-bold text-emerald-600">{formatPrice(payout.amount || payout.requestedAmount || 0)}</p>
                        <p className="text-xs text-gray-500 font-bold mt-2">Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                          payout.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          payout.status === 'approved' ? 'bg-cyan-100 text-cyan-800' :
                          payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          payout.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payout.status.toUpperCase()}
                        </span>
                        <p className="text-xs text-gray-500 font-bold mt-2">Bank</p>
                        <p className="text-sm text-gray-700">{accountLast4 ? `**** ${accountLast4}` : 'N/A'}</p>
                      </div>
                    )
                  })}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-bold text-black dark:text-white">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-black dark:text-white">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-black dark:text-white">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-black dark:text-white">Bank Info</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payoutHistory.map((payout: any, idx: number) => {
                        const bankDetails = (() => {
                          if (!payout?.bankDetails) return null
                          if (typeof payout.bankDetails === 'string') {
                            try {
                              return JSON.parse(payout.bankDetails)
                            } catch {
                              return null
                            }
                          }
                          return payout.bankDetails
                        })()
                        const accountLast4 = bankDetails?.accountNumber
                          ? String(bankDetails.accountNumber).slice(-4)
                          : payout.accountNumber
                            ? String(payout.accountNumber).slice(-4)
                            : ''
                        return (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm">
                            {new Date(payout.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-emerald-600">
                            {formatPrice(payout.amount || payout.requestedAmount || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                              payout.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                              payout.status === 'approved' ? 'bg-cyan-100 text-cyan-800' :
                              payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              payout.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {payout.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {accountLast4 && `**** ${accountLast4}`}
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>

            {/* Withdrawal Modal */}
            {showWithdrawalModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4" onClick={() => setShowWithdrawalModal(false)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold"> Request Withdrawal</h2>
                      <button onClick={() => setShowWithdrawalModal(false)} className="text-3xl hover:text-gray-600 font-bold leading-none">×</button>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Available Balance Display */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 font-bold mb-2">Available Balance</p>
                      <p className="text-3xl font-bold text-emerald-600 price-inline">{formatPrice(Math.max(0, availableBalance))}</p>
                    </div>

                    {/* Withdrawal Amount Input */}
                    <div>
                      <label className="block text-sm font-bold mb-2">Withdrawal Amount *</label>
                      <input
                        type="number"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600 text-lg font-bold"
                        placeholder="e.g. 50,000"
                        min="0"
                        step="1000"
                      />
                      <p className="text-xs text-gray-500 mt-2">Minimum: ₦1,000 | Maximum: {formatPrice(Math.max(0, availableBalance))}</p>
                    </div>

                    {/* Bank Details Summary */}
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Bank Details</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Account Name:</span>
                          <span className="font-bold">{storeProfile.bankAccountName || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Account Number:</span>
                          <span className="font-bold">{storeProfile.bankAccountNumber || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Bank:</span>
                          <span className="font-bold">{storeProfile.bankName || 'Not set'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Processing Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 font-bold"> Processing Time</p>
                      <p className="text-sm text-blue-700">Your withdrawal will be processed within 2-3 business days after admin approval.</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={handleWithdrawalRequest}
                        className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition"
                      >
                         Submit Request
                      </button>
                      <button
                        onClick={() => setShowWithdrawalModal(false)}
                        className="px-6 py-3 border-2 border-gray-400 rounded-lg font-bold hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
        {/* ===== END EARNINGS TAB ===== */}
          </div>
        </DashboardLayout>
      </main>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-[10000] flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-900 dark:hover:text-gray-100"
            >
               Close
            </button>
            <img 
              src={viewingImage} 
              alt="Store photo" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}















