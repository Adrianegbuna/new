import { useState, useEffect, ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Header from '../components/Header'

interface VendorProfile {
  businessName: string
  businessRegNumber: string
  businessDescription: string
  businessLogo: string
  businessWebsite: string
  businessPhone: string
  businessEmail: string
  bankAccountName: string
  bankAccountNumber: string
  bankName: string
  bankCode: string
  interestedInPaySmallSmall: boolean
  phone: string
  country: string
  city: string
  address: string
}

interface Errors { [key: string]: string }

export default function VendorProfileUpdate() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [formData, setFormData] = useState<VendorProfile>({
    businessName: '',
    businessRegNumber: '',
    businessDescription: '',
    businessLogo: '',
    businessWebsite: '',
    businessPhone: '',
    businessEmail: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankCode: '',
    interestedInPaySmallSmall: false,
    phone: '',
    country: '',
    city: '',
    address: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [completionPercentage, setCompletionPercentage] = useState(0)

  useEffect(() => {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('renewablezmart_current_user') || 'null')
    if (!user) {
      router.push('/login')
      return
    }
    if (user.accountType !== 'vendor' && user.accountType !== 'ev_vendor') {
      router.push('/')
      return
    }
    setCurrentUser(user)

    // Pre-fill known data from registration
    if (user.businessName) setFormData(prev => ({ ...prev, businessName: user.businessName }))
    if (user.businessRegNumber) setFormData(prev => ({ ...prev, businessRegNumber: user.businessRegNumber }))
    if (user.interestedInPaySmallSmall !== undefined) {
      setFormData(prev => ({ ...prev, interestedInPaySmallSmall: user.interestedInPaySmallSmall }))
    }
  }, [router])

  useEffect(() => {
    // Calculate profile completion percentage
    const filledFields = Object.values(formData).filter(value => {
      if (typeof value === 'boolean') return false // Don't count checkboxes
      return value && value.toString().trim() !== ''
    }).length
    const totalFields = Object.keys(formData).filter(key => key !== 'interestedInPaySmallSmall').length
    setCompletionPercentage(Math.round((filledFields / totalFields) * 100))
  }, [formData])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    } as VendorProfile)
    if (errors[name]) setErrors({ ...errors, [name]: '' })
  }

  const validateForm = () => {
    const newErrors: Errors = {}
    if (!formData.businessDescription.trim()) newErrors.businessDescription = 'Business description is required'
    if (!formData.bankAccountName.trim()) newErrors.bankAccountName = 'Bank account holder name is required'
    if (!formData.bankAccountNumber.trim()) newErrors.bankAccountNumber = 'Bank account number is required'
    if (!formData.bankName.trim()) newErrors.bankName = 'Bank name is required'
    if (!formData.bankCode.trim()) newErrors.bankCode = 'Bank code is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.country) newErrors.country = 'Country is required'
    if (!formData.city.trim()) newErrors.city = 'City is required'
    if (!formData.address.trim()) newErrors.address = 'Address is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setMessage('')

    try {
      const token = localStorage.getItem('accessToken')
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api'

      const response = await fetch(`${apiBase}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        // Update localStorage with new profile info
        const updatedUser = {
          ...currentUser,
          ...data.profile
        }
        localStorage.setItem('renewablezmart_current_user', JSON.stringify(updatedUser))

        setMessage('Profile updated successfully! Your dealer store is ready.')
        setTimeout(() => {
          router.push('/vendor-dashboard')
        }, 2000)
      } else {
        const error = await response.json()
        setMessage(`❌ Failed to update profile: ${error.message || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Profile update error:', error)
      setMessage('Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/vendor-dashboard')
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-4">Loading</div>
          <p className="text-gray-900 font-bold text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-8 rounded-t-lg">
            <h1 className="text-3xl font-bold mb-2">Complete Your Dealer Profile</h1>
            <p className="text-white font-semibold">Welcome to RenewableZmart! Let's set up your dealer store.</p>
          </div>

          <div className="bg-white shadow-lg rounded-b-lg p-8">
            {/* Profile Completion Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-900 text-base">Profile Completion</h3>
                <span className="text-lg font-bold text-teal-600">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Pre-filled from Registration */}
              <div className="mb-8 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <h3 className="font-bold text-blue-900 mb-4">💼 Business Information (From Registration)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Business Name</label>
                    <div className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-black font-bold">
                      {formData.businessName || 'Not provided'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Registration Number</label>
                    <div className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-black font-bold">
                      {formData.businessRegNumber || 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="mb-8 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                <h3 className="font-bold text-yellow-900 mb-4">📝 Additional Business Details</h3>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-black font-bold mb-2">Business Description <span className="text-red-500">*</span></label>
                  <textarea
                    name="businessDescription"
                    value={formData.businessDescription}
                    onChange={handleChange}
                    rows={4}
                    className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-900 font-semibold ${
                      errors.businessDescription ? 'border-red-500' : 'border-gray-400'
                    }`}
                    placeholder="Describe your business, what you sell, and your mission..."
                  />
                  {errors.businessDescription && <p className="text-red-500 text-xs mt-1">{errors.businessDescription}</p>}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Business Website</label>
                    <input
                      type="url"
                      name="businessWebsite"
                      value={formData.businessWebsite}
                      onChange={handleChange}
                      className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-900 font-semibold"
                      placeholder="https://yourbusiness.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Business Email</label>
                    <input
                      type="email"
                      name="businessEmail"
                      value={formData.businessEmail}
                      onChange={handleChange}
                      className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-900 font-semibold"
                      placeholder="business@company.com"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition">
                    <input
                      type="checkbox"
                      name="interestedInPaySmallSmall"
                      checked={formData.interestedInPaySmallSmall}
                      onChange={handleChange}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-bold text-gray-900">Enable "Pay Small Small" installment deals 💳</span>
                      <p className="text-xs text-black font-bold mt-1">Allow your customers to buy on flexible payment plans</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Banking Information */}
              <div className="mb-8 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">🏦 Banking Information (Required for Payouts)</h3>
                <p className="text-sm text-green-800 mb-4">We need your banking details to process payments for your sales.</p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Account Holder Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="bankAccountName"
                      value={formData.bankAccountName}
                      onChange={handleChange}
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-900 font-semibold ${
                        errors.bankAccountName ? 'border-red-500' : 'border-gray-400'
                      }`}
                      placeholder="Full name on bank account"
                    />
                    {errors.bankAccountName && <p className="text-red-500 text-xs mt-1">{errors.bankAccountName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Bank Name <span className="text-red-500">*</span></label>
                    <select
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange as any}
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 font-semibold ${
                        errors.bankName ? 'border-red-500' : 'border-gray-400'
                      }`}
                    >
                      <option value="">Select your bank</option>
                      <option value="GTBank">Guaranty Trust Bank (GTBank)</option>
                      <option value="FirstBank">First Bank Nigeria</option>
                      <option value="Access">Access Bank</option>
                      <option value="UBA">United Bank for Africa (UBA)</option>
                      <option value="Zenith">Zenith Bank</option>
                      <option value="StanbicIBTC">Stanbic IBTC Bank</option>
                      <option value="FCMB">FCMB</option>
                      <option value="Fidelity">Fidelity Bank</option>
                      <option value="Wema">Wema Bank</option>
                      <option value="Polaris">Polaris Bank</option>
                    </select>
                    {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Account Number <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="bankAccountNumber"
                      value={formData.bankAccountNumber}
                      onChange={handleChange}
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-900 font-semibold ${
                        errors.bankAccountNumber ? 'border-red-500' : 'border-gray-400'
                      }`}
                      placeholder="10-digit account number"
                      maxLength={10}
                    />
                    {errors.bankAccountNumber && <p className="text-red-500 text-xs mt-1">{errors.bankAccountNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Bank Code <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="bankCode"
                      value={formData.bankCode}
                      onChange={handleChange}
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-900 font-semibold ${
                        errors.bankCode ? 'border-red-500' : 'border-gray-400'
                      }`}
                      placeholder="e.g., 007 for GTBank"
                      maxLength={3}
                    />
                    {errors.bankCode && <p className="text-red-500 text-xs mt-1">{errors.bankCode}</p>}
                  </div>
                </div>

                <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-800">🔐 Your banking information is encrypted and secure. We only use it to process your payouts.</p>
                </div>
              </div>

              {/* Account Details */}
              <div className="mb-8 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">👤 Personal Account Details</h3>
                <p className="text-sm text-purple-800 mb-4">Help us deliver your orders and reach you when needed.</p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Phone Number <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-900 font-semibold ${
                        errors.phone ? 'border-red-500' : 'border-gray-400'
                      }`}
                      placeholder="e.g., +234 703 456 7890"
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Country <span className="text-red-500">*</span></label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange as any}
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 font-semibold ${
                        errors.country ? 'border-red-500' : 'border-gray-400'
                      }`}
                    >
                      <option value="">Select a country</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                      <option value="South Africa">South Africa</option>
                      <option value="Tanzania">Tanzania</option>
                      <option value="Uganda">Uganda</option>
                      <option value="Rwanda">Rwanda</option>
                    </select>
                    {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">City <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-900 font-semibold ${
                        errors.city ? 'border-red-500' : 'border-gray-400'
                      }`}
                      placeholder="e.g., Lagos"
                    />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-bold text-black font-bold mb-2">Street Address <span className="text-red-500">*</span></label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder-gray-900 font-semibold ${
                      errors.address ? 'border-red-500' : 'border-gray-400'
                    }`}
                    placeholder="e.g., 123 Main Street, Apartment 4B, Lagos 100001"
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
              </div>

              {message && (
                <div className={`mb-6 p-4 rounded-lg border ${
                  message.toLowerCase().includes('success') 
                    ? 'bg-green-50 text-green-800 border-green-200' 
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  {message}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Saving Profile...' : 'Complete Profile Setup'}
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={loading}
                  className="flex-1 bg-gray-300 text-gray-900 font-bold py-3 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Skip for Now
                </button>
              </div>

              <p className="text-xs text-black font-bold text-center mt-4">
                You can update your profile details anytime from your <Link href="/vendor-dashboard" className="text-teal-600 hover:underline">dealer dashboard</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}




