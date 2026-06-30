import { useState, useEffect, ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Header from '../components/Header'

interface InstallerProfile {
  companyName: string
  yearsOfExperience: string
  serviceAreas: string
  bio: string
  portfolioProjects: string
  licenseNumber: string
  insuranceProvider: string
  insuranceExpiryDate: string
  emergencyPhone: string
  workingHours: string
  minimumProjectValue: string
  bankAccountName: string
  bankAccountNumber: string
  bankName: string
  bankCode: string
  phone: string
  country: string
  city: string
  address: string
}

interface Errors { [key: string]: string }

export default function InstallerProfileUpdate() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [formData, setFormData] = useState<InstallerProfile>({
    companyName: '',
    yearsOfExperience: '',
    serviceAreas: '',
    bio: '',
    portfolioProjects: '',
    licenseNumber: '',
    insuranceProvider: '',
    insuranceExpiryDate: '',
    emergencyPhone: '',
    workingHours: '',
    minimumProjectValue: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankCode: '',
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
    if (user.accountType !== 'installer') {
      router.push('/')
      return
    }
    setCurrentUser(user)

    // Pre-fill known data from registration
    if (user.companyName) setFormData(prev => ({ ...prev, companyName: user.companyName }))
    if (user.yearsOfExperience) setFormData(prev => ({ ...prev, yearsOfExperience: user.yearsOfExperience }))
    if (user.serviceAreas) setFormData(prev => ({ ...prev, serviceAreas: user.serviceAreas }))
  }, [router])

  useEffect(() => {
    // Calculate profile completion percentage
    const requiredFields = ['companyName', 'yearsOfExperience', 'serviceAreas', 'bio', 'bankAccountName', 'bankAccountNumber', 'bankName', 'bankCode']
    const filledRequiredFields = requiredFields.filter(field => {
      const value = formData[field as keyof InstallerProfile]
      return value && value.toString().trim() !== ''
    }).length
    setCompletionPercentage(Math.round((filledRequiredFields / requiredFields.length) * 100))
  }, [formData])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    } as InstallerProfile)
    if (errors[name]) setErrors({ ...errors, [name]: '' })
  }

  const validateForm = () => {
    const newErrors: Errors = {}
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required'
    if (!formData.yearsOfExperience) newErrors.yearsOfExperience = 'Years of experience is required'
    if (!formData.serviceAreas.trim()) newErrors.serviceAreas = 'Service areas are required'
    if (!formData.bio.trim()) newErrors.bio = 'Professional bio is required'
    if (!formData.bankAccountName.trim()) newErrors.bankAccountName = 'Bank account holder name is required'
    if (!formData.bankAccountNumber.trim()) newErrors.bankAccountNumber = 'Bank account number is required'
    if (!formData.bankName.trim()) newErrors.bankName = 'Bank name is required'
    if (!formData.bankCode.trim()) newErrors.bankCode = 'Bank code is required'
    
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

        setMessage('Profile updated successfully! Your installer profile is ready.')
        setTimeout(() => {
          router.push('/installer-dashboard')
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
    router.push('/installer-dashboard')
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
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-8 rounded-t-lg">
            <h1 className="text-3xl font-bold mb-2">Complete Your Installer Profile</h1>
            <p className="text-white font-semibold">Welcome to RenewableZmart! Let's set up your installer profile to start receiving installation requests.</p>
          </div>

          <div className="bg-white shadow-lg rounded-b-lg p-8">
            {/* Profile Completion Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-900 text-base">Profile Completion</h3>
                <span className="text-lg font-bold text-green-600">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Pre-filled from Registration */}
              <div className="mb-8 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <h3 className="font-bold text-blue-900 mb-4">💼 Professional Information (From Registration)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Company Name</label>
                    <div className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-black font-bold">
                      {formData.companyName || 'Not provided'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Years of Experience</label>
                    <div className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-black font-bold">
                      {formData.yearsOfExperience ? `${formData.yearsOfExperience} years` : 'Not provided'}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-black font-bold mb-2">Service Areas</label>
                    <div className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-black font-bold">
                      {formData.serviceAreas || 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Details */}
              <div className="mb-8 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                <h3 className="font-bold text-yellow-900 mb-4">📝 Additional Professional Details</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-bold text-black font-bold mb-2">Professional Bio <span className="text-red-500">*</span></label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-900 font-semibold ${
                      errors.bio ? 'border-red-500' : 'border-gray-400'
                    }`}
                    placeholder="Tell customers about your experience, expertise, and approach to installation work..."
                  />
                  {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio}</p>}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-black font-bold mb-2">Portfolio / Completed Projects</label>
                  <textarea
                    name="portfolioProjects"
                    value={formData.portfolioProjects}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-900 font-semibold"
                    placeholder="Describe some of your notable projects (e.g., Solar panels for 50 homes in Lagos, etc.)"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">License/Registration Number</label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-900 font-semibold"
                      placeholder="e.g., NABCEP #12345"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      name="emergencyPhone"
                      value={formData.emergencyPhone}
                      onChange={handleChange}
                      className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-900 font-semibold"
                      placeholder="+234..."
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Working Hours</label>
                    <input
                      type="text"
                      name="workingHours"
                      value={formData.workingHours}
                      onChange={handleChange}
                      className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-900 font-semibold"
                      placeholder="e.g., 8am - 6pm, Mon-Sat"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Minimum Project Value (?)</label>
                    <input
                      type="number"
                      name="minimumProjectValue"
                      value={formData.minimumProjectValue}
                      onChange={handleChange}
                      className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-900 font-semibold"
                      placeholder="e.g., 500000"
                    />
                  </div>
                </div>

                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Insurance Provider</label>
                    <input
                      type="text"
                      name="insuranceProvider"
                      value={formData.insuranceProvider}
                      onChange={handleChange}
                      className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-900 font-semibold"
                      placeholder="e.g., AXA Mansard Insurance"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Insurance Expiry Date</label>
                    <input
                      type="date"
                      name="insuranceExpiryDate"
                      value={formData.insuranceExpiryDate}
                      onChange={handleChange}
                      className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Banking Information */}
              <div className="mb-8 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">🏦 Banking Information (Required for Payments)</h3>
                <p className="text-sm text-green-800 mb-4">We need your banking details to process payments for your installation services.</p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-black font-bold mb-2">Account Holder Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="bankAccountName"
                      value={formData.bankAccountName}
                      onChange={handleChange}
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-900 font-semibold ${
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
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 font-semibold ${
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
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-900 font-semibold ${
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
                      className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-900 font-semibold ${
                        errors.bankCode ? 'border-red-500' : 'border-gray-400'
                      }`}
                      placeholder="e.g., 007 for GTBank"
                      maxLength={3}
                    />
                    {errors.bankCode && <p className="text-red-500 text-xs mt-1">{errors.bankCode}</p>}
                  </div>
                </div>

                <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-800">🔐 Your banking information is encrypted and secure. We only use it to process your payments for completed installation jobs.</p>
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
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
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
                You can update your profile details anytime from your <Link href="/installer-dashboard" className="text-green-600 hover:underline">installer dashboard</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}



