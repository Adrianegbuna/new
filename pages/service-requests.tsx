import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../components/Header'
import { useAuthStore } from '@/store/authStore'
import { PaystackPaymentService } from '@/lib/paystackService'
import { apiClient } from '@/lib/api-client'

// Service types available for request
const SERVICE_TYPES = [
  {
    category: 'Solar Installation',
    icon: '☀️',
    services: [
      'Solar Panel Installation',
      'Solar System Design & Planning',
      'Rooftop Solar Assessment',
      'Grid-tied Solar System Setup',
      'Off-grid Solar System Setup',
      'Solar Panel Replacement',
      'Solar System Maintenance',
      'Solar System Repair',
      'Battery Storage Installation',
      'Solar Inverter Installation',
    ]
  },
  {
    category: 'Battery & Energy Storage',
    icon: '🔋',
    services: [
      'Battery Installation',
      'Battery Replacement',
      'Battery Maintenance',
      'Lithium Battery Setup',
      'Lead-acid Battery Installation',
      'Battery Upgrade',
      'Energy Storage System Design',
      'Battery Performance Optimization',
      'Backup Power System Installation',
    ]
  },
  {
    category: 'Inverter Services',
    icon: '⚡',
    services: [
      'Inverter Installation',
      'Inverter Replacement',
      'Inverter Troubleshooting',
      'Inverter Maintenance',
      'Hybrid Inverter Setup',
      'Pure Sine Wave Inverter Installation',
      'Inverter Configuration',
      'Power Backup Setup',
    ]
  },
  {
    category: 'Wind Energy',
    icon: '💨',
    services: [
      'Wind Turbine Installation',
      'Wind System Design',
      'Wind Assessment & Site Analysis',
      'Wind Turbine Maintenance',
      'Wind Turbine Repair',
      'Hybrid Wind-Solar System Setup',
      'Wind Power Optimization',
    ]
  },
  {
    category: 'Generator & Backup',
    icon: '⚡',
    services: [
      'Generator Installation',
      'Diesel Generator Setup',
      'Petrol Generator Installation',
      'Automatic Transfer Switch Setup',
      'Generator Maintenance',
      'Fuel System Installation',
      'Generator Load Testing',
    ]
  },
  {
    category: 'Electrical Consultation',
    icon: '💡',
    services: [
      'Energy Audit',
      'System Design Consultation',
      'Cost Estimation',
      'Electrical Inspection',
      'Safety Assessment',
      'Efficiency Optimization',
      'Renewable Energy Planning',
    ]
  },
  {
    category: 'Maintenance & Support',
    icon: '🔧',
    services: [
      'System Maintenance',
      'Preventive Maintenance',
      'Emergency Repair',
      'Component Replacement',
      'Performance Monitoring',
      'System Upgrade',
      'Warranty Support',
    ]
  },
  {
    category: 'Product Purchase & Consultation',
    icon: '🛒',
    services: [
      'Product Recommendation',
      'Bulk Purchase Inquiry',
      'Product Availability Check',
      'Price Quote Request',
      'Custom Product Order',
      'Warranty Inquiry',
      'Delivery & Installation Package',
    ]
  }
]

interface ServiceRequest {
  id: string
  userId: string
  serviceType: string
  message: string
  role: 'customer' | 'vendor' | 'installer'
  status: 'pending' | 'approved' | 'assigned' | 'in_progress' | 'completed' | 'rejected'
  preferredDate?: string
  assignedTo?: string
  assignedUser?: {
    id?: string
    firstName?: string
    lastName?: string
    name?: string
    fullName?: string
    email?: string
    phone?: string
  } | null
  assignedInstallerName?: string
  assignedInstallerEmail?: string
  createdAt: string
  updatedAt: string
}

export default function ServiceRequestsPage() {
  const router = useRouter()
  const { user, token, accessToken, isHydrated } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'my-requests'>('browse')
  const [loading, setLoading] = useState(true)
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [expandedServiceCards, setExpandedServiceCards] = useState<Record<string, boolean>>({})
  
  // Form state
  const [formData, setFormData] = useState({
    serviceCategory: '',
    serviceType: '',
    description: '',
    location: '',
    budget: '',
    urgency: 'medium' as 'low' | 'medium' | 'high',
    preferredDate: ''
  })
  const [formErrors, setFormErrors] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const CONSULTATION_FEE = 5000 // NGN 5,000
  const authToken = token || accessToken
  const requesterFullName =
    `${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim() ||
    (user as any)?.fullName ||
    (user as any)?.name ||
    'Customer'
  const requesterEmail = (user as any)?.email || ''
  const requesterPhone = (user as any)?.phone || (user as any)?.mobile || 'N/A'

  useEffect(() => {
    // Wait for auth store to hydrate
    if (isHydrated) {
      setLoading(false)
      
      // If user tries to access 'my-requests' without being authenticated, redirect to browse
      if (!token && activeTab === 'my-requests') {
        setActiveTab('browse')
      }
    }
    
    // Paystack Inline API is loaded on-demand via paystackLoader.ts
    // No global script loading needed - prevents duplicate script conflicts
    return () => {}
  }, [isHydrated, token, activeTab])

  useEffect(() => {
    if (activeTab === 'my-requests' && token) {
      fetchMyRequests()
    }
  }, [activeTab, token])

  useEffect(() => {
    if (!authToken) return
    const pendingRaw = typeof window !== 'undefined' ? window.localStorage.getItem('pending-service-request') : null
    if (!pendingRaw) return
    try {
      const pending = JSON.parse(pendingRaw)
      if (!pending?.payload || !pending?.paymentReference) return
      retryPendingRequest(pending.payload, pending.paymentReference)
    } catch (error) {
      console.error('Failed to parse pending service request:', error)
    }
  }, [authToken])

  const fetchMyRequests = async () => {
    try {
      setLoadingRequests(true)
      const response = await apiClient.get('/service-requests/my')
      const data = response.data
      setMyRequests(data?.data || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoadingRequests(false)
    }
  }

  const handleInputChange = (e: any) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' })
    }
  }

  const validateForm = () => {
    const errors: any = {}
    if (!formData.serviceCategory) errors.serviceCategory = 'Please select a service category'
    if (!formData.serviceType) errors.serviceType = 'Please select a service type'
    if (!formData.description.trim()) errors.description = 'Description is required'
    if (!formData.location.trim()) errors.location = 'Location is required'
    if (formData.budget && isNaN(Number(formData.budget))) errors.budget = 'Budget must be a valid number'
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePaystackPayment = async () => {
    if (!user) return
    
    setPaymentLoading(true)
    try {
      await PaystackPaymentService.initializePayment({
        publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        amount: CONSULTATION_FEE,
        email: requesterEmail,
        reference: `service-request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerName: requesterFullName || requesterEmail || 'Customer',
        onSuccess: (reference) => {
          submitServiceRequest(reference)
        },
        onError: (error) => {
          console.error('Paystack error:', error)
          setFormErrors({ form: error?.message || 'Payment failed. Please try again.' })
          setShowPaymentModal(false)
          setPaymentLoading(false)
        }
      })
    } catch (error) {
      console.error('Paystack error:', error)
      setFormErrors({ form: 'Payment failed. Please try again.' })
      setShowPaymentModal(false)
      setPaymentLoading(false)
    }
  }

  const submitServiceRequest = async (paymentReference: string, payloadOverride?: any) => {
    try {
      const payload = payloadOverride || {
        fullName: requesterFullName,
        email: requesterEmail,
        phone: requesterPhone,
        serviceType: formData.serviceType,
        message: [
          `Category: ${formData.serviceCategory}`,
          `Description: ${formData.description}`,
          `Location: ${formData.location}`,
          formData.budget ? `Budget: ${formData.budget}` : '',
          `Urgency: ${formData.urgency}`,
          formData.preferredDate ? `Preferred Date: ${formData.preferredDate}` : '',
          `Payment Amount: ₦${CONSULTATION_FEE.toLocaleString()}`,
          `Payment Reference: ${paymentReference}`
        ].filter(Boolean).join('\n'),
        role: (user?.role as any) || 'customer'
      }

      await apiClient.post('/service-requests', payload)

        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('pending-service-request')
        }
        // Show success message
        setSuccessMessage('Payment successful! Your service request has been submitted to dealers and installers.')
        
        // Clear form
        setFormData({
          serviceCategory: '',
          serviceType: '',
          description: '',
          location: '',
          budget: '',
          urgency: 'medium',
          preferredDate: ''
        })
        
        // Close payment modal
        setShowPaymentModal(false)
        
        // Auto-redirect to my-requests tab after 2 seconds
        setTimeout(() => {
          setSuccessMessage('')
          setActiveTab('my-requests')
          setPaymentLoading(false)
        }, 2000)
    } catch (error) {
      const message = (error as any)?.response?.data?.message || 'Error creating request. Please try again.'
      setFormErrors({ form: message })
      if (typeof window !== 'undefined') {
        const payload = payloadOverride || {
          fullName: requesterFullName,
          email: requesterEmail,
          phone: requesterPhone,
          serviceType: formData.serviceType,
          message: [
            `Category: ${formData.serviceCategory}`,
            `Description: ${formData.description}`,
            `Location: ${formData.location}`,
            formData.budget ? `Budget: ${formData.budget}` : '',
            `Urgency: ${formData.urgency}`,
            formData.preferredDate ? `Preferred Date: ${formData.preferredDate}` : '',
            `Payment Amount: ₦${CONSULTATION_FEE.toLocaleString()}`,
            `Payment Reference: ${paymentReference}`
          ].filter(Boolean).join('\n'),
          role: (user?.role as any) || 'customer'
        }
        window.localStorage.setItem('pending-service-request', JSON.stringify({ payload, paymentReference }))
      }
      setShowPaymentModal(false)
      setPaymentLoading(false)
    }
  }

  const retryPendingRequest = async (payload: any, paymentReference: string) => {
    if (!authToken) return
    try {
      await submitServiceRequest(paymentReference, payload)
    } catch (error) {
      console.error('Retry pending service request failed:', error)
    }
  }

  const handleSubmitRequest = async (e: any) => {
    e.preventDefault()
    if (!validateForm()) return

    if (!authToken) {
      setFormErrors({ form: 'Please login again before proceeding with payment.' })
      return
    }

    // Show payment modal and wait for user to click Pay Now
    setShowPaymentModal(true)
  }

  const getServicesByCategory = (category: string) => {
    const cat = SERVICE_TYPES.find(s => s.category === category)
    return cat?.services || []
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-gray-100 text-gray-900 font-bold'
      case 'approved': return 'bg-indigo-100 text-indigo-800'
      case 'assigned': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-900 font-bold'
    }
  }

  const getAssignedInstallerName = (request: ServiceRequest) => {
    const firstName = request.assignedUser?.firstName || ''
    const lastName = request.assignedUser?.lastName || ''
    const fullName = `${firstName} ${lastName}`.trim()
    return (
      request.assignedUser?.fullName ||
      request.assignedUser?.name ||
      fullName ||
      request.assignedInstallerName ||
      request.assignedUser?.email ||
      request.assignedInstallerEmail ||
      (request.assignedTo ? `Installer (${request.assignedTo.slice(0, 8)})` : 'Not assigned')
    )
  }

  const toggleServiceCard = (category: string) => {
    setExpandedServiceCards((prev) => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Service Requests - RenewableZmart</title>
      </Head>
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Service Requests</h1>
          <p className="text-black font-bold">Request services from dealers and installers in your area</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-6 py-3 font-bold border-b-2 transition ${
              activeTab === 'browse'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-black font-semibold hover:text-black'
            }`}
          >
            Browse Services
          </button>
          {token && (
            <>
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-3 font-bold border-b-2 transition ${
                  activeTab === 'create'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-black font-semibold hover:text-black'
                }`}
              >
                📋 Create Request
              </button>
              <button
                onClick={() => setActiveTab('my-requests')}
                className={`px-6 py-3 font-bold border-b-2 transition ${
                  activeTab === 'my-requests'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-black font-semibold hover:text-black'
                }`}
              >
                My Requests
              </button>
            </>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'browse' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICE_TYPES.map((category, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="text-4xl mb-4">{category.icon}</div>
                  <h3 className="text-xl font-bold text-black mb-4">{category.category}</h3>
                  <ul className="space-y-2 mb-6">
                    {(expandedServiceCards[category.category] ? category.services : category.services.slice(0, 5)).map((service, sidx) => (
                      <li key={sidx} className="text-sm text-black flex items-center gap-2">
                        <span className="text-teal-600">✓</span> {service}
                      </li>
                    ))}
                    {category.services.length > 5 && (
                      <li>
                        <button
                          type="button"
                          onClick={() => toggleServiceCard(category.category)}
                          className="text-sm text-teal-700 font-bold hover:text-teal-800 underline underline-offset-2"
                        >
                          {expandedServiceCards[category.category]
                            ? 'Show less'
                            : `+${category.services.length - 5} more services`}
                        </button>
                      </li>
                    )}
                  </ul>
                  <button
                    onClick={() => {
                      if (!token) {
                        // Show registration prompt for unregistered users
                        setShowRegistrationPrompt(true)
                      } else {
                        // For registered users, go to create tab
                        setFormData({ ...formData, serviceCategory: category.category })
                        setActiveTab('create')
                      }
                    }}
                    className="w-full bg-teal-600 text-white py-2 rounded-lg font-bold hover:bg-teal-700 transition"
                  >
                    Request This Service
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-black mb-6">Create Service Request</h2>
            
            {successMessage && (
              <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg border border-green-300">
                {successMessage}
              </div>
            )}

            {formErrors.form && (
              <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-lg border border-red-300">
                {formErrors.form}
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-6">
              {/* Service Category */}
              <div>
                <label className="block text-sm font-bold text-black font-semibold mb-2">
                  Service Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="serviceCategory"
                  value={formData.serviceCategory}
                  onChange={handleInputChange}
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold ${
                    formErrors.serviceCategory ? 'border-red-500' : 'border-black dark:border-gray-600'
                  }`}
                >
                  <option value="">Select a service category</option>
                  {SERVICE_TYPES.map((cat, idx) => (
                    <option key={idx} value={cat.category}>
                      {cat.icon} {cat.category}
                    </option>
                  ))}
                </select>
                {formErrors.serviceCategory && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.serviceCategory}</p>
                )}
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-sm font-bold text-black font-semibold mb-2">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleInputChange}
                  disabled={!formData.serviceCategory}
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold disabled:bg-gray-100 dark:disabled:bg-gray-700 ${
                    formErrors.serviceType ? 'border-red-500' : 'border-black dark:border-gray-600'
                  }`}
                >
                  <option value="">Select a service type</option>
                  {formData.serviceCategory && getServicesByCategory(formData.serviceCategory).map((service, idx) => (
                    <option key={idx} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
                {formErrors.serviceType && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.serviceType}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-black font-semibold mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Describe your service request in detail. Include any specific requirements, timeline, or preferences..."
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${
                    formErrors.description ? 'border-red-500' : 'border-black'
                  }`}
                />
                {formErrors.description && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-bold text-black font-semibold mb-2">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="City, State, or Full Address"
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${
                    formErrors.location ? 'border-red-500' : 'border-black'
                  }`}
                />
                {formErrors.location && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.location}</p>
                )}
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-bold text-black font-semibold mb-2">
                  Budget Range (Optional)
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  placeholder="e.g. 75,000"
                  className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${
                    formErrors.budget ? 'border-red-500' : 'border-black'
                  }`}
                />
                {formErrors.budget && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.budget}</p>
                )}
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-sm font-bold text-black font-semibold mb-2">
                  Urgency Level <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {(['low', 'medium', 'high'] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: level })}
                      className={`py-2 px-4 rounded-lg font-bold border-2 transition ${
                        formData.urgency === level
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-black text-black hover:border-teal-300'
                      }`}
                    >
                      {level === 'low' && 'Low'}
                      {level === 'medium' && 'Medium'}
                      {level === 'high' && 'High'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Date */}
              <div>
                <label className="block text-sm font-bold text-black font-semibold mb-2">
                  Preferred Date (Optional)
                </label>
                <input
                  type="date"
                  name="preferredDate"
                  value={formData.preferredDate}
                  onChange={handleInputChange}
                  className="w-full border border-black rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {submitting ? 'Creating Request...' : 'Submit Service Request'}
              </button>
            </form>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
              {paymentLoading ? (
                <div className="text-center">
                  <div className="animate-spin text-4xl mb-4">⏳</div>
                  <h3 className="text-2xl font-bold text-black mb-2">Processing Payment</h3>
                  <p className="text-black font-bold">Please complete the payment in the popup window...</p>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-black mb-4">Payment Required</h3>
                  
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-black mb-3">
                      A consultation fee is required before your service request can be submitted to dealers and installers.
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-black">Consultation Fee:</span>
                      <span className="text-2xl font-bold text-teal-600">₦{CONSULTATION_FEE.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-900">
                      <strong>📌 This fee:</strong> Helps us connect you with verified professionals and ensures quality leads for dealers and installers.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 bg-gray-200 text-gray-900 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePaystackPayment}
                      disabled={paymentLoading}
                      className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                      💳 Pay Now
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'my-requests' && (
          <div>
            {loadingRequests ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-xl">Loading your requests...</div>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-black font-bold mb-4">You haven't created any service requests yet.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 transition"
                >
                  Create Your First Request
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map(request => (
                  <div key={request.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-black">{request.serviceType}</h3>
                        <p className="text-sm text-black font-bold capitalize">Requested as: {request.role}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(request.status)}`}>
                          {request.status.replace('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-black font-bold mb-4 whitespace-pre-line">{request.message}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-black font-bold">Created</p>
                        <p className="font-bold text-black">{new Date(request.createdAt).toLocaleDateString()}</p>
                      </div>
                      {request.assignedTo && (
                        <div>
                          <p className="text-black font-bold">Assigned To</p>
                          <p className="font-bold text-black">{getAssignedInstallerName(request)}</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="text-teal-600 font-bold hover:text-teal-700 transition"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-black">{selectedRequest.serviceType}</h3>
                  <p className="text-sm text-black font-semibold">
                    Status: {selectedRequest.status.replace('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-3 py-1 rounded border border-gray-300 text-black font-bold hover:bg-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-black font-bold">Created</p>
                  <p className="text-black font-semibold">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-black font-bold">Assigned Installer</p>
                  <p className="text-black font-semibold">{getAssignedInstallerName(selectedRequest)}</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-black font-bold mb-2">Request Details</p>
                <p className="text-black font-semibold whitespace-pre-line">{selectedRequest.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Registration Prompt Modal */}
        {showRegistrationPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold text-black mb-4">Join RenewableZmart</h3>
              
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-black mb-4">
                  To request a service, you need to create an account first. This helps us connect you with verified professionals in your area.
                </p>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold mt-0.5">✓</span>
                    <span className="text-black">Get connected with verified dealers and installers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold mt-0.5">✓</span>
                    <span className="text-black">Track your service requests in real-time</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold mt-0.5">✓</span>
                    <span className="text-black">Receive quotes and professional advice</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold mt-0.5">✓</span>
                    <span className="text-black">Fast and secure transaction processing</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRegistrationPrompt(false)}
                  className="flex-1 bg-gray-200 text-gray-900 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRegistrationPrompt(false)
                    router.push('/register')
                  }}
                  className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 transition flex items-center justify-center gap-2"
                >
                  📝 Create Account
                </button>
              </div>

              <div className="mt-4 text-center text-sm text-black font-semibold">
                Already have an account? <button onClick={() => {
                  setShowRegistrationPrompt(false)
                  router.push('/login')
                }} className="text-teal-600 font-bold hover:underline">Login here</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}




