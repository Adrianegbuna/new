import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/authStore'
import { S3ImageUploader } from '../components/S3ImageUploader'

interface Store {
  id: string
  name: string
  ownerId: string
  country: string
  city: string
}

interface FlashDeal {
  id: string
  name: string
  panelRange: string | null
  maxBatteryLithium: number
  maxBatteryTubular: number
  inverterType: 'standard' | 'hybrid'
  powers: string
  warranty: string
  vendorPrice: number | null
  quantity?: number
  image: string | null
  images: string[] | null
  storeId: string
  store: Store
}

export default function EditFlashDealPage() {
  const router = useRouter()
  const { id } = router.query
  const { user, token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [flashDeal, setFlashDeal] = useState<FlashDeal | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    selectedPackageName: '',
    batteryType: 'lithium',
    inverterType: 'standard',
    powers: '3 bedrooms, lights, fan, TV, decoder, phone charging',
    warranty: 'Panels (10–25 yrs) • Inverter (1–2 yrs) • Battery — Lithium (3–5 yrs) / Tubular (1–2 yrs) • Installation kit (1 yr)',
    price: '',
    quantity: '',
    storeId: '',
    images: [] as string[]
  })

  useEffect(() => {
    if (!user || !token) {
      router.push('/login')
      return
    }

    if (user.role !== 'admin' && user.role !== 'vendor') {
      router.push('/')
      return
    }

    if (!id) return

    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch the flash deal
        const dealRes = await apiClient.get(`/packages/${id}`)
        const deal = dealRes.data
        setFlashDeal(deal)

        // Fetch available stores
        const storesRes = await apiClient.get('/admin/stores')
        setStores(storesRes.data)

        // Populate form with existing data (price without 10% markup for display)
        const basePrice = deal.vendorPrice / 1.10
        setForm({
          selectedPackageName: deal.name,
          batteryType: deal.category || 'lithium',
          inverterType: deal.inverterType,
          powers: deal.powers,
          warranty: deal.warranty,
          price: basePrice.toString(),
          quantity: String(deal.quantity ?? ''),
          storeId: deal.storeId,
          images: Array.isArray(deal.images) ? deal.images.slice(0, 1) : []
        })

        setLoading(false)
      } catch (error: any) {
        console.error('Error fetching flash deal:', error)
        alert(error.response?.data?.message || 'Failed to load flash deal')
        router.push('/deals')
      }
    }

    fetchData()
  }, [id, user, token, router])

  const handleSave = async () => {
    if (!form.selectedPackageName || !form.price || !form.storeId) {
      alert('Please fill in all required fields')
      return
    }
    if (!form.quantity) {
      alert('Please enter quantity for this flash deal')
      return
    }

    setSaving(true)
    try {
      await apiClient.put(`/packages/admin/flash-deals/${id}`, {
        selectedPackageName: form.selectedPackageName,
        batteryType: form.batteryType,
        maxBatteryLithium: form.batteryType === 'lithium' ? 10 : 0,
        maxBatteryTubular: form.batteryType === 'tubular' ? 10 : 0,
        inverterType: form.inverterType,
        powers: form.powers,
        warranty: form.warranty,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity || '0', 10),
        storeId: form.storeId,
        images: form.images.slice(0, 1)
      })

      alert('✓ Flash deal updated successfully!')
      router.push('/deals')
    } catch (error: any) {
      console.error('Error updating flash deal:', error)
      alert(error.response?.data?.message || 'Failed to update flash deal')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Head><title>Edit Flash Deal - RenewableZmart</title></Head>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            <p className="text-gray-600 font-semibold mt-4">Loading flash deal...</p>
          </div>
        </div>
      </>
    )
  }

  if (!flashDeal) {
    return (
      <>
        <Head><title>Edit Flash Deal - RenewableZmart</title></Head>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 font-semibold">Flash deal not found</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Edit Flash Deal - RenewableZmart</title>
      </Head>
      <Header />

      <main className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-6">
            <Link href="/deals" className="text-teal-600 font-semibold hover:text-teal-700">
              ← Back to Flash Deals
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Edit Flash Deal</h1>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave()
              }}
              className="space-y-6"
            >
              {/* Package Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Package Name *
                </label>
                <input
                  type="text"
                  value={form.selectedPackageName}
                  onChange={(e) => setForm({ ...form, selectedPackageName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-600 text-gray-900"
                  placeholder="e.g., Solar 5kW System"
                />
              </div>

              {/* Battery Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Battery Type
                </label>
                <select
                  value={form.batteryType}
                  onChange={(e) => setForm({ ...form, batteryType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-600 text-gray-900"
                >
                  <option value="lithium">Lithium</option>
                  <option value="tubular">Tubular</option>
                </select>
              </div>

              {/* Inverter Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Inverter Type
                </label>
                <select
                  value={form.inverterType}
                  onChange={(e) => setForm({ ...form, inverterType: e.target.value as 'standard' | 'hybrid' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-600 text-gray-900"
                >
                  <option value="standard">Standard</option>
                  <option value="hybrid">Hybrid (Smart)</option>
                </select>
              </div>

              {/* Price (Base Price - will add 10% markup) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price (₦) - 10% markup will be added *
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-600 text-gray-900"
                  placeholder="e.g., 500000"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity (Stock) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-600 text-gray-900"
                  placeholder="e.g., 5"
                />
              </div>

              {/* Store */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Store *
                </label>
                <select
                  value={form.storeId}
                  onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-600 text-gray-900"
                >
                  <option value="">Select a store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload Images
                </label>
                <S3ImageUploader
                  folder="admin-flash-deals"
                  maxImages={1}
                  onUploadComplete={(images: string[]) => setForm({ ...form, images: images.slice(0, 1) })}
                />
                {form.images.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 font-semibold mb-2">Uploaded/Selected Images:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {form.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img src={img} alt={`Image ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border border-gray-300" />
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, images: form.images.filter((_, i) => i !== idx) })}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Powers */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Powers
                </label>
                <textarea
                  value={form.powers}
                  onChange={(e) => setForm({ ...form, powers: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-600 text-gray-900"
                  rows={3}
                  placeholder="e.g. 3 bedrooms, lights, fan, TV, decoder, phone charging"
                />
              </div>

              {/* Warranty */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Warranty
                </label>
                <textarea
                  value={form.warranty}
                  onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-600 text-gray-900"
                  rows={3}
                  placeholder="e.g. Panels 10 years, inverter 2 years, battery 3 years"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => router.push('/deals')}
                  className="flex-1 bg-gray-300 text-gray-900 py-2 rounded-lg font-bold hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-teal-600 text-white py-2 rounded-lg font-bold hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : '✓ Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}

