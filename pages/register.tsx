import { useState, useEffect, ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Header from '../components/Header'
import PasswordInput from '../components/PasswordInput'
import { useAuthStore } from '@/store/authStore'
import { africanCountries } from '../data/locations'
import { validatePhoneNumber, formatPhoneNumber, getPhoneInfo } from '@/lib/phoneValidation'
import { validateEmail } from '@/lib/emailValidation'
import { validateCompanyRegistration } from '@/lib/companyValidation'
import { apiClient } from '@/lib/api-client'
import { useNotifications } from '@/context/NotificationContext'
import { buildRegistrationEmail, sendEmailNotification } from '@/lib/notify'

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  accountType: 'customer' | 'vendor' | 'installer' | 'ev_vendor'
  country: string
  city: string
  businessName: string
  businessRegNumber: string
  yearsOfExperience: string
  serviceAreas: string
  acceptTerms: boolean
  interestedInPaySmallSmall: boolean
}

interface Errors { [key: string]: string }

export default function Register() {
  const router = useRouter()
  const { addNotification } = useNotifications()
  const [formData, setFormData] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    accountType: 'customer',
    country: 'Nigeria',
    city: '',
    businessName: '',
    businessRegNumber: '',
    yearsOfExperience: '',
    serviceAreas: '',
    acceptTerms: false,
    interestedInPaySmallSmall: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [availableCities, setAvailableCities] = useState<string[]>([])

  useEffect(() => {
    // Always start with a fresh empty form
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      accountType: 'customer',
      country: 'Nigeria',
      city: '',
      businessName: '',
      businessRegNumber: '',
      yearsOfExperience: '',
      serviceAreas: '',
      acceptTerms: false,
      interestedInPaySmallSmall: false,
    })
    setErrors({})
    setMessage('')
    setFormError('')
    
    // Set cities for default country
    const defaultCountry = africanCountries.find(c => c.name === 'Nigeria')
    if (defaultCountry) {
      setAvailableCities(defaultCountry.states || defaultCountry.cities || [])
    }
  }, [])

  useEffect(() => {
    if (router.query.type === 'vendor') {
      setFormData((prev) => ({ ...prev, accountType: 'vendor' }))
    } else if (router.query.type === 'ev' || router.query.type === 'ev_vendor') {
      setFormData((prev) => ({ ...prev, accountType: 'ev_vendor' }))
    } else if (router.query.type === 'installer') {
      setFormData((prev) => ({ ...prev, accountType: 'installer' }))
    }
  }, [router.query])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement
    
    // Handle country change - update available cities
    if (name === 'country') {
      const selectedCountry = africanCountries.find(c => c.name === value)
      setAvailableCities(selectedCountry?.states || selectedCountry?.cities || [])
      setFormData({ ...formData, country: value, city: '' } as FormState)
    } else {
      setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value } as FormState)
    }
    
    if (errors[name]) setErrors({ ...errors, [name]: '' })
  }

  const validateForm = () => {
    const newErrors: Errors = {}
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    
    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else {
      const emailValidation = validateEmail(formData.email)
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.error || 'Invalid email'
        if (emailValidation.suggestion) {
          newErrors.email += ` Did you mean: ${emailValidation.suggestion}?`
        }
      }
    }
    
    // Validate phone number
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else {
      const phoneValidation = validatePhoneNumber(formData.phone, formData.country)
      if (!phoneValidation.isValid) {
        newErrors.phone = phoneValidation.error || 'Invalid phone number'
      }
    }
    
    if (!formData.country.trim()) newErrors.country = 'Country is required'
    if (!formData.city.trim()) newErrors.city = 'City is required'

    if (formData.accountType === 'vendor' || formData.accountType === 'ev_vendor') {
      if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required for Dealers'
      if (!formData.businessRegNumber.trim()) {
        newErrors.businessRegNumber = 'Business registration number is required'
      } else {
        const regValidation = validateCompanyRegistration(formData.businessRegNumber, formData.country)
        if (!regValidation.isValid) {
          newErrors.businessRegNumber = regValidation.error || 'Invalid registration number'
          if (regValidation.suggestion) {
            newErrors.businessRegNumber += ` (${regValidation.suggestion})`
          }
        }
      }
    }

    if (formData.accountType === 'installer') {
      if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required'
      if (!formData.yearsOfExperience) newErrors.yearsOfExperience = 'Years of experience is required'
      if (!formData.serviceAreas.trim()) newErrors.serviceAreas = 'Service areas are required'
    }

    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.password)) 
      newErrors.password = 'Password must contain uppercase, lowercase, numbers, and special characters (@$!%*?&)'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    if (!formData.acceptTerms) newErrors.acceptTerms = 'You must accept the terms and conditions'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) {
      setFormError('Please fix the highlighted fields and try again.')
      return
    }
    setLoading(true)
    setMessage('')
    setFormError('')
    
    try {
      // Register with PostgreSQL backend
      const registrationData: any = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        country: formData.country,
        city: formData.city,
        accountType: formData.accountType,
      }

      // Add vendor-specific fields
      if (formData.accountType === 'vendor' || formData.accountType === 'ev_vendor') {
        registrationData.businessName = formData.businessName
        registrationData.businessRegNumber = formData.businessRegNumber
        registrationData.interestedInPaySmallSmall = formData.interestedInPaySmallSmall
      }

      // Add installer-specific fields
      if (formData.accountType === 'installer') {
        registrationData.businessName = formData.businessName
        registrationData.yearsOfExperience = parseInt(formData.yearsOfExperience)
        registrationData.serviceAreas = formData.serviceAreas
      }

      // Call backend register endpoint
      const response = await apiClient.post('/auth/register', registrationData)
      
      // Backend sets cookies and returns user/tokens
      const { user, accessToken } = response.data
      
      // Update auth store
      const { setUser, setToken } = useAuthStore.getState()
      setUser(user)
      setToken(accessToken)
      // Ensure token is immediately available for pages that read from localStorage
      if (typeof window !== 'undefined' && accessToken) {
        localStorage.setItem('accessToken', accessToken)
      }
      
      // Clear form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        accountType: 'customer',
        country: 'Nigeria',
        city: '',
        businessName: '',
        businessRegNumber: '',
        yearsOfExperience: '',
        serviceAreas: '',
        acceptTerms: false,
        interestedInPaySmallSmall: false,
      })
      setErrors({})
      
      // Auto-populate location from registration
      localStorage.setItem('renewablezmart_location', JSON.stringify({
        country: formData.country,
        city: formData.city,
      }))
      
      // Clear cart for new user
      localStorage.removeItem('renewablezmart_cart')
      
      setMessage('Registration successful! Redirecting...')
      setFormError('')
      
      // Route to appropriate profile update page based on account type
      let redirectPath = '/'
      if (formData.accountType === 'vendor' || formData.accountType === 'ev_vendor') {
        redirectPath = '/vendor-profile-update'
      } else if (formData.accountType === 'installer') {
        redirectPath = '/installer-profile-update'
      }

      const emailPayload = buildRegistrationEmail({
        customerName: `${user?.firstName || formData.firstName}`,
        dashboardUrl: `${window.location.origin}${redirectPath}`,
      })
      if (user?.email || formData.email) {
        await sendEmailNotification({ ...emailPayload, to: user?.email || formData.email })
        addNotification({
          userId: user?.id || 'guest',
          type: 'general',
          title: 'Welcome to RenewableZmart',
          message: 'Your account is ready. Explore products and services.',
          read: false,
          actionUrl: redirectPath,
          icon: '🎉',
          color: 'green',
        })
      }
      
      // Navigate without full reload to preserve auth state
      setTimeout(() => {
        router.push(redirectPath)
      }, 1500)
    } catch (error: any) {
      setLoading(false)
      setMessage('')
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || error.message || 'Registration failed. Please try again.'
      setErrors({ form: errorMessage })
      setFormError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-8 rounded-t-lg">
            <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
            <p className="text-white font-semibold">Join RenewableZmart and start shopping for sustainable energy solutions</p>
          </div>
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-b-lg p-8">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-900 mb-3">I am a <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button type="button" onClick={() => setFormData({ ...formData, accountType: 'customer' })} className={`p-4 border-2 rounded-lg text-center transition active:scale-95 ${formData.accountType === 'customer' ? 'border-teal-600 bg-teal-50' : 'border-gray-400 hover:border-teal-300'}`}>
                    <div className="text-3xl mb-2">🛒</div>
                    <div className="font-bold text-green-700">Customer</div>
                    <div className="text-sm font-bold text-black dark:text-white">Buy products</div>
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, accountType: 'vendor' })} className={`p-4 border-2 rounded-lg text-center transition active:scale-95 ${formData.accountType === 'vendor' ? 'border-teal-600 bg-teal-50' : 'border-gray-400 hover:border-teal-300'}`}>
                    <div className="text-3xl mb-2">🏪</div>
                    <div className="font-bold text-green-700">R E Dealer</div>
                    <div className="text-sm font-bold text-black dark:text-white">Renewable Energy Products</div>
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, accountType: 'ev_vendor' })} className={`p-4 border-2 rounded-lg text-center transition active:scale-95 ${formData.accountType === 'ev_vendor' ? 'border-teal-600 bg-teal-50' : 'border-gray-400 hover:border-teal-300'}`}>
                    <div className="text-3xl mb-2">🚗</div>
                    <div className="font-bold text-green-700">E V Dealer</div>
                    <div className="text-sm font-bold text-black dark:text-white">Electric vehicles & parts</div>
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, accountType: 'installer' })} className={`p-4 border-2 rounded-lg text-center transition active:scale-95 ${formData.accountType === 'installer' ? 'border-teal-600 bg-teal-50' : 'border-gray-400 hover:border-teal-300'}`}>
                    <div className="text-3xl mb-2">🔧</div>
                    <div className="font-bold text-green-700">Installer</div>
                    <div className="text-sm font-bold text-black dark:text-white">Install systems</div>
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">First Name <span className="text-red-500">*</span></label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} autoComplete="off" className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${errors.firstName ? 'border-red-500' : 'border-gray-400'}`} placeholder="John" />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Last Name <span className="text-red-500">*</span></label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} autoComplete="off" className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${errors.lastName ? 'border-red-500' : 'border-gray-400'}`} placeholder="Doe" />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-900 mb-2">Email Address <span className="text-red-500">*</span></label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} autoComplete="off" className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${errors.email ? 'border-red-500' : 'border-gray-400'}`} placeholder="john@gmail.com" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  <p className="text-xs text-black dark:text-white mt-1">✅ Use a valid email - disposable/temporary emails are not allowed</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-900 mb-2">Phone Number <span className="text-red-500">*</span></label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  autoComplete="off"
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${errors.phone ? 'border-red-500' : 'border-gray-400'}`} 
                  placeholder={formData.country ? (getPhoneInfo(formData.country)?.format || '+XXX XXX XXX XXXX') : '+234 XXX XXX XXXX'} 
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                {formData.country && getPhoneInfo(formData.country) && (
                  <p className="text-xs text-gray-800 dark:text-gray-200 font-bold mt-1">Format: {getPhoneInfo(formData.country)?.format}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Country <span className="text-red-500">*</span></label>
                  <select name="country" value={formData.country} onChange={handleChange} className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 font-semibold ${errors.country ? 'border-red-500' : 'border-gray-400'}`}>
                    <option value="">Select Country</option>
                    {africanCountries.map((country) => (
                      <option key={country.name} value={country.name}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                  {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">City/State <span className="text-red-500">*</span></label>
                  <select name="city" value={formData.city} onChange={handleChange} className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 font-semibold ${errors.city ? 'border-red-500' : 'border-gray-400'}`} disabled={!formData.country}>
                    <option value="">Select City/State</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                </div>
              </div>

              {(formData.accountType === 'vendor' || formData.accountType === 'ev_vendor') && (
                <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <h3 className="font-bold text-yellow-900 mb-4 flex items-center gap-2">🏢 Business Information (Required for Dealers)</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Business Name <span className="text-red-500">*</span></label>
                      <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${errors.businessName ? 'border-red-500' : 'border-gray-400'}`} placeholder="Your Company Ltd" />
                      {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Business Registration Number <span className="text-red-500">*</span></label>
                      <input type="text" name="businessRegNumber" value={formData.businessRegNumber} onChange={handleChange} className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${errors.businessRegNumber ? 'border-red-500' : 'border-gray-400'}`} placeholder="RC-123456 or BN-123456" />
                      {errors.businessRegNumber && <p className="text-red-500 text-xs mt-1">{errors.businessRegNumber}</p>}
                      <p className="text-xs text-black dark:text-white mt-1">Format: RC-XXXXXX or BN-XXXXXX (CAC Number)</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="flex items-start gap-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition active:bg-blue-200">
                      <span className="relative mt-0.5 flex-shrink-0">
                        <input
                          type="checkbox"
                          name="interestedInPaySmallSmall"
                          checked={formData.interestedInPaySmallSmall}
                          onChange={handleChange}
                          className="peer h-5 w-5 appearance-none rounded-sm border-2 border-gray-400 bg-white checked:bg-green-600 checked:border-green-600"
                        />
                        <svg viewBox="0 0 20 20" className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M4 10.5l4 4L16 6.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <div className="flex-1">
                        <span className="text-sm font-bold text-gray-900">I am interested in "Pay Small Small" installment deals 💳</span>
                        <p className="text-xs text-gray-800 dark:text-gray-200 font-bold mt-1">Allow customers to buy your products on flexible payment plans</p>
                      </div>
                    </label>
                  </div>
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-800">✅ Your business registration will be verified before you can upload products. Ensure the number matches your CAC registration.</p>
                  </div>
                </div>
              )}

              {formData.accountType === 'installer' && (
                <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                  <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">👨‍💼 Professional Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Business Name <span className="text-red-500">*</span></label>
                      <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${errors.businessName ? 'border-red-500' : 'border-gray-400'}`} placeholder="e.g., Solar Solutions Ltd" />
                      {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>}
                      <p className="text-xs text-gray-800 dark:text-gray-200 font-bold mt-1">Your company or trading name</p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Years of Experience <span className="text-red-500">*</span></label>
                      <input type="number" name="yearsOfExperience" value={formData.yearsOfExperience} onChange={handleChange} className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${errors.yearsOfExperience ? 'border-red-500' : 'border-gray-400'}`} placeholder="5" min="0" />
                      {errors.yearsOfExperience && <p className="text-red-500 text-xs mt-1">{errors.yearsOfExperience}</p>}
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-bold text-gray-900 mb-2">Service Areas <span className="text-red-500">*</span></label>
                    <input type="text" name="serviceAreas" value={formData.serviceAreas} onChange={handleChange} className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${errors.serviceAreas ? 'border-red-500' : 'border-gray-400'}`} placeholder="e.g., Lagos, Abuja, Port Harcourt" />
                    {errors.serviceAreas && <p className="text-red-500 text-xs mt-1">{errors.serviceAreas}</p>}
                    <p className="text-xs text-gray-800 dark:text-gray-200 font-bold mt-1">List cities/states where you provide services</p>
                  </div>
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-800">✅ Your credentials will be verified. Customers can book your services for solar system installations.</p>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-extrabold text-gray-900 mb-2">Password <span className="text-red-500">*</span></label>
                  <PasswordInput
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    error={!!errors.password}
                    minLength={8}
                    required
                  />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-gray-900 mb-2">Confirm Password <span className="text-red-500">*</span></label>
                  <PasswordInput
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    error={!!errors.confirmPassword}
                    required
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>

              <div className="mb-6 p-4 bg-slate-900 border-2 border-orange-300 rounded-lg">
                <label className="flex items-start gap-4 cursor-pointer active:bg-slate-900 p-2 rounded transition">
                  <span className="relative mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={handleChange}
                      className="peer h-5 w-5 appearance-none rounded-sm border-2 border-gray-400 bg-white checked:bg-green-600 checked:border-green-600"
                    />
                    <svg viewBox="0 0 20 20" className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M4 10.5l4 4L16 6.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-sm text-gray-900 font-semibold flex-1">
                    I agree to the <Link href="/terms" className="text-teal-600 hover:underline font-semibold">Terms and Conditions</Link> and <Link href="/privacy" className="text-teal-600 hover:underline font-semibold">Privacy Policy</Link>
                    <span className="text-red-500 ml-1">*</span>
                  </span>
                </label>
                {errors.acceptTerms && <p className="text-red-500 text-xs mt-2 ml-11">{errors.acceptTerms}</p>}
              </div>

              {formError && <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">{formError}</div>}
              {message && <div className="mb-6 p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">{message}</div>}

              <button type="submit" disabled={loading} className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition">
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <div className="mt-6 text-center text-sm text-black dark:text-white">
                Already have an account? <Link href="/login" className="text-teal-600 font-semibold hover:underline">Login here</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}



