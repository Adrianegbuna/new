import { useState, useEffect, ChangeEvent, FormEvent } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import { useAuthStore } from '@/store/authStore'
import { getApiBaseUrl } from '@/lib/apiConfig'

interface AccountDetails {
  phone: string
  country: string
  city: string
  address: string
  gender: string
  bankAccountName?: string
  bankAccountNumber?: string
  bankName?: string
  bankCode?: string
  bankCountry?: string
}

interface Errors {
  [key: string]: string
}

const countries = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Tanzania', 'Uganda', 'Rwanda',
  'Ethiopia', 'Cameroon', 'Senegal', 'Ivory Coast', 'Zambia', 'Zimbabwe',
  'Botswana', 'Namibia', 'Mauritius', 'Mozambique', 'Malawi', 'Madagascar',
  'Angola', 'Benin', 'Burkina Faso', 'Central African Republic', 'Chad', 'Congo',
  'Democratic Republic of Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea',
  'Eritrea', 'Gabon', 'Gambia', 'Guinea', 'Guinea-Bissau', 'Lesotho', 'Liberia',
  'Libya', 'Morocco', 'Niger', 'Sierra Leone', 'Somalia', 'South Sudan', 'Sudan',
  'Swaziland', 'Togo', 'Tunisia'
]

export default function AccountDetails() {
  const router = useRouter()
  const { user, token, isHydrated } = useAuthStore()
  const [formData, setFormData] = useState<AccountDetails>({
    phone: '',
    country: '',
    city: '',
    address: '',
    gender: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankCode: '',
    bankCountry: ''
  })
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [completionPercentage, setCompletionPercentage] = useState(0)
  const [isEditing, setIsEditing] = useState(true)

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    if (!user || !token) {
      router.push('/login')
      return
    }

    // Pre-fill with existing data
    setFormData({
      phone: user.phone || '',
      country: user.country || '',
      city: user.city || '',
      address: user.address || '',
      gender: user.gender || '',
      bankAccountName: user.bankAccountName || '',
      bankAccountNumber: user.bankAccountNumber || '',
      bankName: user.bankName || '',
      bankCode: user.bankCode || '',
      bankCountry: user.bankCountry || ''
    })
  }, [isHydrated, user, token, router])

  useEffect(() => {
    // Calculate profile completion percentage
    const filledFields = Object.values(formData).filter(value => value && value.toString().trim() !== '').length
    const totalFields = Object.keys(formData).length
    setCompletionPercentage(Math.round((filledFields / totalFields) * 100))
  }, [formData])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    } as AccountDetails)
    if (errors[name]) setErrors({ ...errors, [name]: '' })
  }

  const validateForm = () => {
    const newErrors: Errors = {}
    
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
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/users/account-details`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        // Update auth store with new profile info
        if (data.profile) {
          const updatedUser = { ...user, ...data.profile }
          useAuthStore.getState().setUser(updatedUser)
          localStorage.setItem('renewablezmart_current_user', JSON.stringify(updatedUser))
        }
        
        setMessage('Account details saved successfully!')
        setIsEditing(false)
        
        // Redirect based on user type after 1.5 seconds
        setTimeout(() => {
          if (user?.role === 'vendor' || user?.accountType === 'vendor' || user?.accountType === 'ev_vendor') {
            router.push('/vendor-dashboard')
          } else if (user?.role === 'installer' || user?.accountType === 'installer') {
            router.push('/installer-dashboard')
          } else if (user?.role === 'admin') {
            router.push('/admin-dashboard')
          } else {
            router.push('/account')
          }
        }, 1500)
      } else {
        const error = await response.json()
        setMessage(`❌ Failed to save account details: ${error.message || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Account details error:', error)
      setMessage('Failed to save account details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Navigate to appropriate dashboard based on user type
    if (user?.role === 'vendor' || user?.accountType === 'vendor' || user?.accountType === 'ev_vendor') {
      router.push('/vendor-dashboard')
    } else if (user?.role === 'installer' || user?.accountType === 'installer') {
      router.push('/installer-dashboard')
    } else if (user?.role === 'admin') {
      router.push('/admin-dashboard')
    } else {
      router.push('/account')
    }
  }

  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-4">Loading</div>
          <p className="text-black font-bold">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Complete Your Account Details - RenewableZmart</title>
      </Head>
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">Complete Your Account Details</h1>
            <p className="text-black font-semibold">Please provide your personal and address information to complete your profile</p>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-black">Profile Completion</span>
              <span className="text-sm font-bold text-teal-600">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`rounded-lg p-4 mb-6 ${message.toLowerCase().includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            {!isEditing && completionPercentage === 100 ? (
              <div className="text-center space-y-4">
                <div className="text-6xl">Complete</div>
                <h2 className="text-2xl font-bold text-black">Account Details Complete!</h2>
                <p className="text-black font-bold">Your profile is now complete and ready to use.</p>
                <button
                  onClick={handleSkip}
                  className="inline-block bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition"
                >
                  Continue to Dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Phone */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g., +234 703 456 7890"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${
                      errors.phone ? 'border-red-500' : 'border-gray-400'
                    }`}
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-black font-semibold ${
                      errors.country ? 'border-red-500' : 'border-gray-400'
                    }`}
                  >
                    <option value="">Select a country</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g., Lagos"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${
                      errors.city ? 'border-red-500' : 'border-gray-400'
                    }`}
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g., 123 Main Street, Apartment 4B"
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-black placeholder-gray-900 font-semibold ${
                      errors.address ? 'border-red-500' : 'border-gray-400'
                    }`}
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>

                {/* Gender (Optional) */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Gender <span className="text-black font-bold text-xs">(Optional)</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-black dark:text-white bg-white dark:bg-gray-800 border-black dark:border-gray-600 font-semibold"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>

                {/* Bank Account Section (Optional) */}
                <div className="col-span-full mt-8 pt-6 border-t-2 border-teal-200">
                  <h3 className="text-lg font-bold text-black mb-4">🏋 Bank Account (Optional - For Payouts)</h3>
                  <p className="text-black font-bold mb-4">Add your bank account details if you want to receive payouts or refunds</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">Account Name</label>
                      <input
                        type="text"
                        name="bankAccountName"
                        value={formData.bankAccountName || ''}
                        onChange={handleChange}
                        placeholder="Account holder name"
                        className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">Account Number</label>
                      <input
                        type="text"
                        name="bankAccountNumber"
                        value={formData.bankAccountNumber || ''}
                        onChange={handleChange}
                        placeholder="Bank account number"
                        className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">Bank Name</label>
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName || ''}
                        onChange={handleChange}
                        placeholder="Bank name"
                        className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">Bank Code</label>
                      <input
                        type="text"
                        name="bankCode"
                        value={formData.bankCode || ''}
                        onChange={handleChange}
                        placeholder="Bank code"
                        className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">Bank Country</label>
                      <input
                        type="text"
                        name="bankCountry"
                        value={formData.bankCountry || ''}
                        onChange={handleChange}
                        placeholder="Country"
                        className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                  >
                    {loading ? 'Saving...' : 'Save Account Details'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={loading}
                    className="flex-1 border border-gray-400 text-black px-6 py-3 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                  >
                    Skip for Now
                  </button>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-bold mb-2">📌 Why we need this information:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Delivery and shipping confirmation</li>
                    <li>Contacting you about your orders</li>
                    <li>Payment and billing verification</li>
                    <li>Eligibility for special offers</li>
                  </ul>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}




