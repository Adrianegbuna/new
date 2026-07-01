import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Header from "@/components/layout/Header";
import Head from 'next/head'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { useAuthStore } from '@/store/authStore'

export default function CustomerProjectsPage() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'quotations' | 'jobs'>('quotations')
  const [loading, setLoading] = useState(true)
  
  const [quotations, setQuotations] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  
  const [loadingQuotations, setLoadingQuotations] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(false)

  useEffect(() => {
    if (!token) {
      router.push('/login')
    } else {
      setLoading(false)
      fetchQuotations() // Auto-fetch quotations on mount
    }
  }, [token, router])

  const fetchQuotations = async () => {
    try {
      setLoadingQuotations(true)
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/quotations/customer/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setQuotations(data)
      } else {
        setQuotations([])
      }
    } catch (error) {
      console.error('Error fetching quotations:', error)
      setQuotations([])
    } finally {
      setLoadingQuotations(false)
    }
  }

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true)
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/jobs/customer/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setJobs(data)
      } else {
        setJobs([])
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setJobs([])
    } finally {
      setLoadingJobs(false)
    }
  }


  const handleAcceptQuotation = async (quotationId: string) => {
    try {
      const token = localStorage.getItem('accessToken')
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/quotations/${quotationId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        alert('Quotation accepted! The installer will contact you soon.')
        fetchQuotations()
      } else {
        alert('Failed to accept quotation')
      }
    } catch (error) {
      console.error('Error accepting quotation:', error)
      alert('Failed to accept quotation')
    }
  }

  const handleRejectQuotation = async (quotationId: string) => {
    try {
      const token = localStorage.getItem('accessToken')
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/quotations/${quotationId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        alert('Quotation rejected')
        fetchQuotations()
      } else {
        alert('Failed to reject quotation')
      }
    } catch (error) {
      console.error('Error rejecting quotation:', error)
      alert('Failed to reject quotation')
    }
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

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>My Projects - RenewableZmart</title>
      </Head>
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Projects & Quotations</h1>
          <p className="text-gray-800 font-semibold">Manage your service quotations and active projects</p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => { setActiveTab('quotations'); fetchQuotations(); }}
              className={`px-6 py-4 font-semibold ${activeTab === 'quotations' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-800 font-bold hover:text-gray-900'}`}
            >
              Quotations
            </button>
            <button
              onClick={() => { setActiveTab('jobs'); fetchJobs(); }}
              className={`px-6 py-4 font-semibold ${activeTab === 'jobs' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-800 font-bold hover:text-gray-900'}`}
            >
              My Projects
            </button>
          </div>
        </div>

        {/* Quotations Tab */}
        {activeTab === 'quotations' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Quotations Received</h2>
            
            {loadingQuotations ? (
              <p className="text-center py-12 text-gray-800 font-semibold">Loading quotations...</p>
            ) : quotations && quotations.length > 0 ? (
              <div className="space-y-4">
                {quotations.map((quote: any) => (
                  <div key={quote.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{quote.description}</h3>
                        <p className="text-sm text-gray-800 font-semibold mt-1">From: {quote.installer?.firstName} {quote.installer?.lastName}</p>
                        <p className="text-sm text-gray-800 font-semibold">Scope: {quote.projectScope}</p>
                        <p className="text-sm text-gray-800 font-semibold">Location: {quote.location}</p>
                        <p className="text-sm text-gray-800 font-semibold mt-2">Duration: {quote.estimatedDuration || 'Not specified'}</p>
                      </div>
                      <div className="text-right">
                        <div className="mb-3">
                          <p className="text-sm text-gray-800 font-semibold">Subtotal</p>
                          <p className="text-lg font-semibold">?{quote.subtotal?.toLocaleString()}</p>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm text-gray-800 font-semibold">Tax</p>
                          <p className="font-semibold">?{quote.taxAmount?.toLocaleString()}</p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded">
                          <p className="text-sm text-emerald-600 font-semibold">Total Amount</p>
                          <p className="text-2xl font-bold text-emerald-600">?{quote.totalAmount?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 mb-4">
                      <p className="text-sm text-gray-800 font-semibold mb-2">
                        <strong>Status:</strong> <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          quote.status === 'viewed' ? 'bg-blue-100 text-blue-800' :
                          quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>{quote.status?.toUpperCase()}</span>
                      </p>
                      {quote.validUntil && (
                        <p className="text-sm text-gray-800 font-semibold">
                          <strong>Valid Until:</strong> {new Date(quote.validUntil).toLocaleDateString()}
                        </p>
                      )}
                      {quote.notes && (
                        <p className="text-sm text-gray-800 font-semibold mt-2"><strong>Notes:</strong> {quote.notes}</p>
                      )}
                    </div>

                    {quote.status === 'sent' || quote.status === 'viewed' ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAcceptQuotation(quote.id)}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold transition"
                        >
                          ✓ Accept Quotation
                        </button>
                        <button
                          onClick={() => handleRejectQuotation(quote.id)}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-semibold transition"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔧</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Quotations Yet</h3>
                <p className="text-gray-800 font-semibold">Request quotations from installers to see them here</p>
              </div>
            )}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">My Projects</h2>
            
            {loadingJobs ? (
              <p className="text-center py-12 text-gray-800 font-semibold">Loading projects...</p>
            ) : jobs && jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job: any) => (
                  <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 text-lg">{job.title}</h3>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        job.status === 'completed' ? 'bg-green-100 text-green-800' :
                        job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        job.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                        job.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-800 font-semibold">Installer: {job.installer?.firstName} {job.installer?.lastName}</p>
                        <p className="text-sm text-gray-800 font-semibold">Location: {job.location}</p>
                        <p className="text-sm text-gray-800 font-semibold">Description: {job.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="mb-2">
                          <p className="text-sm text-gray-800 font-semibold">Amount</p>
                          <p className="text-xl font-bold text-emerald-600">?{job.quotedAmount?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-800 font-semibold">Payment</p>
                          <p className={`font-semibold ${
                            job.paymentStatus === 'completed' ? 'text-green-600' :
                            job.paymentStatus === 'partial' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {job.paymentStatus?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {job.scheduledStartDate && (
                      <p className="text-sm text-gray-800 font-semibold mb-2">
                        Start Date: {new Date(job.scheduledStartDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Projects Yet</h3>
                <p className="text-gray-800 font-semibold">Accept a quotation to start a project</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}



