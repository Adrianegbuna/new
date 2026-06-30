import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Header from '../components/Header'
import DashboardLayout from '@/components/DashboardLayout'
import DashboardHeaderActions from '@/components/DashboardHeaderActions'
import Head from 'next/head'
import { africanCountries } from '../data/locations'
import { validatePhoneNumber, getPhoneInfo } from '../lib/phoneValidation'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { useAuthStore } from '@/store/authStore'
import { isVideoUrl } from '@/lib/imageUtils'
import { uploadImageToS3 } from '@/lib/s3ImageUploader'
import { getPreviewSource, isVideo, getCleanS3Url } from '@/lib/previewUtils'
import ResaleForm from '../components/ResaleForm'
import TradeInForm from '../components/TradeInForm'
import { apiClient } from '@/lib/api-client'
import { useCurrency } from '@/hooks/useCurrency'

interface InstallerProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  businessName: string
  certifications: string
  yearsOfExperience: string
  serviceAreas: string
  country: string
  city: string
  profilePhoto?: string
  bio?: string
  specialties?: string[]
  rating?: number
  completedProjects?: number
  verified?: boolean
  bankAccountName?: string
  bankAccountNumber?: string
  bankName?: string
  bankCode?: string
  bankCountry?: string
}

interface Project {
  id: number
  title: string
  description: string
  category: string
  location: string
  completedDate: string
  images: string[]
}

export default function InstallerDashboard() {
  const router = useRouter()
  const { user, token, isHydrated } = useAuthStore()
  const { formatPrice } = useCurrency()
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'projects' | 'reviews' | 'quotations' | 'jobs' | 'resale' | 'earnings'>('overview')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<InstallerProfile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [showAddProject, setShowAddProject] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  const [profileForm, setProfileForm] = useState({
    businessName: '',
    serviceAreas: '',
    bio: '',
    specialties: [] as string[],
    phone: '',
    country: 'Nigeria',
    city: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankCode: '',
    bankCountry: ''
  })
  const [availableProfileCities, setAvailableProfileCities] = useState<string[]>([])

  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    category: 'solar',
    location: '',
    completedDate: '',
    media: [] as (File | string)[]
  })

  // New feature states
  const [quotations, setQuotations] = useState<any[]>([])
  const [servicePackages, setServicePackages] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [assignedRequests, setAssignedRequests] = useState<any[]>([])
  const [loadingQuotations, setLoadingQuotations] = useState(false)
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [loadingAssignedRequests, setLoadingAssignedRequests] = useState(false)

  // Earnings states
  const [totalJobIncome, setTotalJobIncome] = useState(0)
  const [commissionRate, setCommissionRate] = useState(0.05) // 5% default
  const [platformFee, setPlatformFee] = useState(0)
  const [installerEarnings, setInstallerEarnings] = useState(0)
  const [referralEarnings, setReferralEarnings] = useState(0)
  const [pendingPayouts, setPendingPayouts] = useState(0)
  const [completedPayouts, setCompletedPayouts] = useState(0)
  const [availableBalance, setAvailableBalance] = useState(0)
  const [payoutHistory, setPayoutHistory] = useState<any[]>([])
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [loadingEarnings, setLoadingEarnings] = useState(false)

  useEffect(() => {
    // Wait for store to hydrate from localStorage
    if (!isHydrated) {
      return
    }

    if (user) {
      // Check if user is installer
      if (user.role !== 'installer') {
        router.push('/')
        return
      }
      
      fetchProfile()
      fetchProjects()
      fetchQuotations()
      fetchJobs()
      fetchAssignedRequests()

      // Auto-refresh quotations and jobs every 5 seconds to catch new payments/statuses
      const interval = setInterval(() => {
        fetchQuotations()
        fetchJobs()
        fetchAssignedRequests()
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [isHydrated, user, router])

  const fetchProfile = async () => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        const country = data.country || 'Nigeria'
        setProfileForm({
          businessName: data.businessName || '',
          serviceAreas: data.serviceAreas || '',
          bio: data.bio || '',
          specialties: data.specialties || [],
          phone: data.phone || '',
          country: country,
          city: data.city || '',
          bankAccountName: data.bankAccountName || '',
          bankAccountNumber: data.bankAccountNumber || '',
          bankName: data.bankName || '',
          bankCode: data.bankCode || '',
          bankCountry: data.bankCountry || ''
        })
        setProfilePhotoUrl(data.profilePhoto || '')
        // Set available cities for the installer's country
        const selectedCountry = africanCountries.find(c => c.name === country)
        setAvailableProfileCities(selectedCountry?.states || selectedCountry?.cities || [])
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/installer/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      } else {
        console.error('Failed to fetch projects:', response.status)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  // Fetch quotations
  const fetchQuotations = async () => {
    try {
      setLoadingQuotations(true)
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/quotations/installer/list`, {
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

  // Fetch service packages
  const fetchServicePackages = async () => {
    try {
      setLoadingPackages(true)
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/service-packages/installer/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setServicePackages(data)
      } else {
        setServicePackages([])
      }
    } catch (error) {
      console.error('Error fetching service packages:', error)
      setServicePackages([])
    } finally {
      setLoadingPackages(false)
    }
  }

  // Fetch jobs
  const fetchJobs = async () => {
    try {
      setLoadingJobs(true)
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/jobs/installer/list`, {
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

  // Fetch service requests assigned to installer
  const fetchAssignedRequests = async () => {
    try {
      setLoadingAssignedRequests(true)
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/service-requests/assigned/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const payload = await response.json()
        setAssignedRequests(Array.isArray(payload?.data) ? payload.data : [])
      } else {
        setAssignedRequests([])
      }
    } catch (error) {
      console.error('Error fetching assigned service requests:', error)
      setAssignedRequests([])
    } finally {
      setLoadingAssignedRequests(false)
    }
  }

  // Fetch earnings data
  const fetchEarningsData = async () => {
    try {
      setLoadingEarnings(true)
      
      // Calculate job income from completed/paid jobs
      const jobIncome = jobs
        .filter(j => (j.paymentStatus === 'completed' || j.paymentStatus === 'paid') && j.status !== 'cancelled')
        .reduce((sum: number, j: any) => sum + (Number(j.actualAmount || j.quotedAmount || j.jobPrice || 0)), 0)
      
      setTotalJobIncome(jobIncome)
      const fee = jobIncome * commissionRate
      setPlatformFee(fee)
      setInstallerEarnings(jobIncome - fee)
      setAvailableBalance((jobIncome - fee) - pendingPayouts)
      
      // Fetch referral earnings
      try {
        const referralRes = await apiClient.get('/referrals/my-stats')
        const refData = referralRes.data?.data
        if (refData) {
          setReferralEarnings(parseFloat(refData.totalCommission || 0))
        }
      } catch (e) {
        console.error('Failed to fetch referral stats:', e)
      }
      
      // Fetch payout history
      try {
        const payoutRes = await apiClient.get('/payouts/my-requests')
        const payouts: any[] = payoutRes.data?.data || []
        setPayoutHistory(payouts)
        
        const pending = payouts
          .filter((p: any) => p.status === 'pending' || p.status === 'approved')
          .reduce((sum: number, p: any) => sum + parseFloat(p.requestedAmount || 0), 0)
        
        const completed = payouts
          .filter((p: any) => p.status === 'completed')
          .reduce((sum: number, p: any) => sum + parseFloat(p.requestedAmount || 0), 0)
        
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
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      alert('Please enter a valid withdrawal amount')
      return
    }

    if (parseFloat(withdrawalAmount) > availableBalance) {
      alert(`Insufficient balance. Available: ${formatPrice(availableBalance)}`)
      return
    }

    try {
      const response = await apiClient.post('/payouts/create', {
        requestedAmount: parseFloat(withdrawalAmount),
        bankName: profile?.bankName,
        accountNumber: profile?.bankAccountNumber,
        accountHolderName: profile?.bankAccountName,
        bankCode: profile?.bankCode,
        usertype: 'installer'
      })

      alert('✅ Withdrawal request submitted! Processing within 2-3 business days.')
      setWithdrawalAmount('')
      setShowWithdrawalModal(false)
      await fetchEarningsData()
    } catch (error: any) {
      console.error('Withdrawal request failed:', error)
      alert(`Failed to submit withdrawal: ${error.response?.data?.message || error.message}`)
    }
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Photo size must be less than 5MB')
        return
      }
      
      // ✅ Show local blob URL preview immediately
      const previewUrl = URL.createObjectURL(file)
      setProfilePhotoUrl(previewUrl)
      
      // ✅ Upload to S3 in background
      setUploadingPhoto(true)
      try {
        const s3Url = await uploadImageToS3(file, 'profile-photos')
        // ✅ Replace preview with S3 URL after upload succeeds
        setProfilePhotoUrl(s3Url)
      } catch (error) {
        console.error('Error uploading photo to S3:', error)
        // ✅ Keep preview visible even if upload fails
        alert(`Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setUploadingPhoto(false)
      }
    }
  }

  const handlePhotoUpload = async () => {
    if (!profilePhotoUrl) {
      alert('Please select a photo first')
      return
    }

    setUploadingPhoto(true)
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/users/profile-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoUrl: profilePhotoUrl })
      })

      if (response.ok) {
        const data = await response.json()
        alert('Profile photo updated successfully!')
        setProfile(prev => prev ? { ...prev, profilePhoto: data.profilePhoto } : null)
        setProfilePhotoUrl('')
        
        // ✅ Refetch profile to ensure fresh state
        await fetchProfile()
      } else {
        const error = await response.json()
        alert(`Failed to update photo: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating photo:', error)
      alert('Failed to update photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleProfileUpdate = async () => {
    // Validate phone number
    if (profileForm.phone) {
      const phoneValidation = validatePhoneNumber(profileForm.phone, profileForm.country)
      if (!phoneValidation.isValid) {
        alert(phoneValidation.error || 'Invalid phone number')
        return
      }
    }

    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileForm)
      })

      if (response.ok) {
        const data = await response.json()
        // Immediately update profile display with response data (no extra fetch needed)
        if (data.profile) {
          setProfile(data.profile)
          // Update auth store with new profile info
          const { setUser } = useAuthStore.getState()
          const updatedUser = { ...user, ...data.profile }
          setUser(updatedUser)
        }
        alert('Profile updated successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to update profile: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleAddProject = async () => {
    if (!projectForm.title || !projectForm.description) {
      alert('Please fill in all required fields')
      return
    }

    if (projectForm.media.length === 0) {
      alert('Please add at least one image or video')
      return
    }

    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/installer/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: projectForm.title,
          description: projectForm.description,
          category: projectForm.category,
          location: projectForm.location,
          completedDate: projectForm.completedDate,
          images: projectForm.media
        })
      })

      if (response.ok) {
        alert('Project added successfully!')
        // Clear the form
        setProjectForm({
          title: '',
          description: '',
          category: 'solar',
          location: '',
          completedDate: '',
          media: []
        })
        setShowAddProject(false)
        fetchProjects()
      } else {
        const error = await response.json()
        alert(`Failed to add project: ${error.message}`)
      }
    } catch (error) {
      console.error('Error adding project:', error)
      alert(`Failed to add project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleProjectImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (projectForm.media.length + files.length > 10) {
      alert('Maximum 10 files allowed (images and videos combined)')
      return
    }

    // ✅ IMMEDIATELY add File objects to media for local preview
    // This shows previews BEFORE upload completes
    const newMediaWithFiles = [...projectForm.media, ...files]
    setProjectForm(prev => ({ 
      ...prev, 
      media: newMediaWithFiles
    }))

    // ✅ Upload files to S3 in background and REPLACE File objects with S3 URLs
    setUploadingImages(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const startIndex = projectForm.media.length + i
        
        try {
          // Upload file to S3
          const s3Url = await uploadImageToS3(file, 'project-media')
          
          // Replace the File object with the S3 URL
          setProjectForm(prev => {
            const newMedia = [...prev.media]
            newMedia[startIndex] = s3Url
            return { ...prev, media: newMedia }
          })
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error)
          // Remove failed file from media array
          setProjectForm(prev => ({
            ...prev,
            media: prev.media.filter((_, idx) => idx !== startIndex)
          }))
        }
      }
    } finally {
      setUploadingImages(false)
    }
  }

  const removeProjectImage = (index: number) => {
    // ✅ Clean up object URLs if the removed item is a File
    const removedMedia = projectForm.media[index]
    if (removedMedia instanceof File) {
      // Revoke the object URL to free memory
      const url = URL.createObjectURL(removedMedia)
      URL.revokeObjectURL(url)
    }
    
    setProjectForm(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }))
  }

  const handleDeleteProjectImage = async (projectId: number, imageIndex: number) => {
    if (!confirm('Delete this image?')) return

    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/installer/projects/${projectId}/images/${imageIndex}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Image deleted successfully!')
        fetchProjects()
      } else {
        alert('Failed to delete image')
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Failed to delete image')
    }
  }

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    setDeletingProjectId(projectId)

    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/installer/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Project deleted successfully!')
        fetchProjects()
      } else {
        const error = await response.json()
        alert(`Failed to delete project: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeletingProjectId(null)
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

  const installerSidebarItems = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'profile', label: 'Profile', icon: '👤' },
    { key: 'projects', label: 'Projects', icon: '💼' },
    { key: 'reviews', label: 'Reviews', icon: '⭐' },
    { key: 'quotations', label: 'Quotations', icon: '💬' },
    { key: 'jobs', label: 'Jobs', icon: '🔨' },
    { key: 'resale', label: 'Swap & Resell', icon: '🔄' },
    { key: 'earnings', label: 'Earnings', icon: '💰' },
    { key: 'quick-add-project', label: 'Add New Project', icon: '📸', onClick: () => setActiveTab('projects') },
    { key: 'quick-update-profile', label: 'Update Profile', icon: '🌟', onClick: () => setActiveTab('profile') },
    { key: 'quick-payout', label: 'Payout Request', icon: '🏦', onClick: () => router.push('/payout-request') },
  ];
  const completedJobsCount = jobs.filter((j: any) => j.status === 'completed').length
  const pendingJobsCount = jobs.filter((j: any) => j.status !== 'completed' && j.status !== 'cancelled').length
  const assignedRequestsCount = assignedRequests.length

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Installer Dashboard - RenewableZmart</title>
      </Head>
      <Header />

      <DashboardLayout
        title="Installer Dashboard"
        subtitle="Projects, quotes, and earnings"
        sidebarItems={installerSidebarItems}
        activeKey={activeTab}
        hideHeader
        headerRight={<DashboardHeaderActions messageHref="/messages?tab=notifications" settingsHref="/installer-profile-update" />}
        onNavigate={(key) => {
          const nextTab = key as typeof activeTab;
          if (nextTab === 'quotations') fetchQuotations();
          if (nextTab === 'jobs') fetchJobs();
          if (nextTab === 'earnings') fetchEarningsData();
          setActiveTab(nextTab);
        }}
      >
        <div className="space-y-6">

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-md p-4">
                <p className="text-xs font-bold text-gray-500 uppercase">Projects</p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1">{projects.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <p className="text-xs font-bold text-gray-500 uppercase">Assigned Requests</p>
                <p className="text-2xl font-extrabold text-blue-700 mt-1">{assignedRequestsCount}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <p className="text-xs font-bold text-gray-500 uppercase">Pending Jobs</p>
                <p className="text-2xl font-extrabold text-amber-700 mt-1">{pendingJobsCount}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <p className="text-xs font-bold text-gray-500 uppercase">Completed Jobs</p>
                <p className="text-2xl font-extrabold text-green-700 mt-1">{completedJobsCount}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4">Installer Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Business Name</p>
                  <p className="font-semibold break-words">{profileForm.businessName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Phone</p>
                  <p className="font-semibold break-words">{profileForm.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Country</p>
                  <p className="font-semibold break-words">{profileForm.country || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">City/State</p>
                  <p className="font-semibold break-words">{profileForm.city || 'Not provided'}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setActiveTab('projects')}
                  className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700"
                >
                  Manage Projects
                </button>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
                >
                  View Jobs
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Manage Your Profile</h2>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className={`px-6 py-2 rounded-lg font-bold transition ${
                  isEditingProfile
                    ? 'bg-gray-500 text-white hover:bg-gray-600'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            {!isEditingProfile ? (
              // View Mode - Display Information as Read-Only
              <div className="space-y-6">
                {/* Business Name */}
                <div>
                  <label className="block text-sm font-medium text-black font-bold mb-1">Business Name</label>
                  <p className="text-lg text-gray-900">{profileForm.businessName || 'Not provided'}</p>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-black font-bold mb-1">Bio</label>
                  <p className="text-black font-bold whitespace-pre-wrap">{profileForm.bio || 'Not provided'}</p>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-black font-bold mb-1">Phone Number</label>
                  <p className="text-gray-900">{profileForm.phone || 'Not provided'}</p>
                </div>

                {/* Service Areas */}
                <div>
                  <label className="block text-sm font-medium text-black font-bold mb-1">Service Areas</label>
                  <p className="text-gray-900">{profileForm.serviceAreas || 'Not provided'}</p>
                </div>

                {/* Country and City */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-black font-bold mb-1">Country</label>
                    <p className="text-gray-900">{profileForm.country || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black font-bold mb-1">City/State</label>
                    <p className="text-gray-900">{profileForm.city || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Edit Mode - Show Editable Fields
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black font-bold mb-2">Business Name</label>
                  <input
                    type="text"
                    value={profileForm.businessName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, businessName: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black font-bold mb-2">Bio</label>
                  <textarea
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Tell customers about your experience and expertise..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black font-bold mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder={profileForm.country ? (getPhoneInfo(profileForm.country)?.format || '+XXX XXX XXX') : '+XXX XXX XXX'}
                  />
                  {profileForm.country && getPhoneInfo(profileForm.country) && (
                    <p className="text-xs text-black font-bold mt-1">Format: {getPhoneInfo(profileForm.country)?.format}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-black font-bold mb-2">Service Areas</label>
                  <input
                    type="text"
                    value={profileForm.serviceAreas}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, serviceAreas: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g., Lagos, Abuja, Port Harcourt"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black font-bold mb-2">Country <span className="text-red-500">*</span></label>
                    <select
                      value={profileForm.country}
                      onChange={(e) => {
                        const selectedCountry = africanCountries.find(c => c.name === e.target.value)
                        setAvailableProfileCities(selectedCountry?.states || selectedCountry?.cities || [])
                        setProfileForm(prev => ({ ...prev, country: e.target.value, city: '' }))
                      }}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-800 text-black dark:text-white border-black dark:border-gray-600 font-semibold"
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
                    <label className="block text-sm font-medium text-black font-bold mb-2">City/State <span className="text-red-500">*</span></label>
                    <select
                      value={profileForm.city}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-800 text-black dark:text-white border-black dark:border-gray-600 font-semibold disabled:bg-gray-100 dark:disabled:bg-gray-700"
                      disabled={!profileForm.country}
                    >
                      <option value="">Select City/State</option>
                      {availableProfileCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bank Account Section */}
                <div className="mt-8 pt-6 border-t-2 border-emerald-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">🏦 Bank Account (For Payouts)</h3>
                  <p className="text-sm text-black font-bold mb-4">Add your bank account details to receive payouts and payments</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black font-bold mb-2">Account Name</label>
                      <input
                        type="text"
                        value={profileForm.bankAccountName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, bankAccountName: e.target.value }))}
                        placeholder="Account holder name"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black font-bold mb-2">Account Number</label>
                      <input
                        type="text"
                        value={profileForm.bankAccountNumber}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                        placeholder="Bank account number"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black font-bold mb-2">Bank Name</label>
                      <input
                        type="text"
                        value={profileForm.bankName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, bankName: e.target.value }))}
                        placeholder="Bank name"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black font-bold mb-2">Bank Code</label>
                      <input
                        type="text"
                        value={profileForm.bankCode}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, bankCode: e.target.value }))}
                        placeholder="Bank code"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black font-bold mb-2">Bank Country</label>
                      <input
                        type="text"
                        value={profileForm.bankCountry}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, bankCountry: e.target.value }))}
                        placeholder="Country"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleProfileUpdate}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-bold transition"
                >
                  💾 Save Profile Changes
                </button>
              </div>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="w-full">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔧</span>
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">Your projects appear on Find Installers page</h3>
                  <p className="text-sm text-blue-700">All projects you add here automatically appear on the "Find Installers" page so potential customers can see your completed work and expertise.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6 overflow-x-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl md:text-2xl font-bold whitespace-nowrap">My Projects</h2>
                <button
                  onClick={() => setShowAddProject(!showAddProject)}
                  className="bg-emerald-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-emerald-700 whitespace-nowrap text-sm md:text-base"
                >
                  {showAddProject ? 'Cancel' : 'Add Project'}
                </button>
              </div>

              {showAddProject && (
                <div className="border-t pt-4 space-y-4 overflow-x-hidden">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-black font-bold mb-2">Project Title *</label>
                    <input
                      type="text"
                      value={projectForm.title}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                      placeholder="e.g., 5kW Solar Installation for Residential Home"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-black font-bold mb-2">Description *</label>
                    <textarea
                      value={projectForm.description}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                      placeholder="Describe the project scope, challenges, and solutions..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-black font-bold mb-2">Category</label>
                      <select
                        value={projectForm.category}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                      >
                        <option value="solar">Solar</option>
                        <option value="wind">Wind</option>
                        <option value="inverters">Inverters</option>
                        <option value="batteries">Batteries</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-black font-bold mb-2">Location</label>
                      <input
                        type="text"
                        value={projectForm.location}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                        placeholder="City, State"
                      />
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-black font-bold mb-2">Completion Date</label>
                      <input
                        type="date"
                        value={projectForm.completedDate}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, completedDate: e.target.value }))}
                        className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-black font-bold mb-2">Project Images & Videos (Max 10)</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleProjectImageSelect}
                      disabled={uploadingImages}
                      className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm disabled:opacity-50"
                    />
                    <p className="text-xs text-black font-bold mt-1">{uploadingImages ? 'Uploading...' : 'Upload up to 10 images and videos (JPG, PNG, MP4, WebM)'}</p>
                    {projectForm.media.length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 gap-2 mt-3">
                        {projectForm.media.map((media, index) => {
                          // ✅ Support both File objects (before upload) and string URLs (after upload)
                          const isFile = media instanceof File
                          const isVideoMedia = isVideo(media)
                          const previewSrc = getPreviewSource(media)
                          const displayUrl = isFile ? previewSrc : getCleanS3Url(previewSrc)
                          
                          return (
                            <div key={index} className="relative aspect-square bg-gray-100 rounded overflow-hidden min-h-[80px]">
                              {isVideoMedia ? (
                                // ✅ For videos, show playable video (not just icon)
                                <video
                                  src={`${displayUrl}?v=${Date.now()}`}
                                  controls
                                  className="w-full h-full object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                  onError={() => {
                                    console.warn(`Video failed to load: ${displayUrl}`);
                                  }}
                                />
                              ) : (
                                // ✅ For images, show preview with error handling
                                <img
                                  src={`${displayUrl}?v=${Date.now()}`}
                                  alt={`Project ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.warn(`Image failed to load: ${displayUrl}`);
                                    const img = e.target as HTMLImageElement;
                                    img.style.display = 'none';
                                    const parent = img.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #f3f4f6;"><span style="font-size: 1.5em;">📷</span></div>';
                                    }
                                  }}
                                />
                              )}
                              <button
                                onClick={() => removeProjectImage(index)}
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAddProject}
                    className="w-full bg-emerald-600 text-white py-2 md:py-3 rounded-lg hover:bg-emerald-700 font-bold text-sm md:text-base"
                  >
                    Add Project
                  </button>
                </div>
              )}
            </div>

            {/* Projects List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.length === 0 ? (
                <div className="col-span-2 text-center py-12 bg-white rounded-lg shadow-md">
                  <div className="text-6xl mb-4">📸</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Projects Yet</h3>
                  <p className="text-black font-bold mb-4">Showcase your work by adding your first project</p>
                  <button
                    onClick={() => setShowAddProject(true)}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
                  >
                    Add Project
                  </button>
                </div>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                    {/* Project Images Gallery */}
                    {project.images && project.images.length > 0 ? (
                      <div className="space-y-2 p-4 bg-gray-50 max-h-96 overflow-y-auto">
                        <h4 className="font-bold text-sm text-black font-bold mb-3">🖼️ Project Images ({project.images.length})</h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {project.images.map((image, imgIndex) => (
                            <div key={imgIndex} className="relative group aspect-square min-h-[80px] bg-gray-100 rounded overflow-hidden">
                              {image?.startsWith('data:') || image?.startsWith('blob:') ? (
                                // ✅ Local blob previews
                                <img 
                                  src={image} 
                                  alt={`Project ${imgIndex + 1}`} 
                                  className="w-full h-full object-cover rounded"
                                  onError={(e) => {
                                    console.warn(`Image preview failed: ${image}`);
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : isVideoUrl(image) ? (
                                // ✅ For videos, show playable video tag (not gray box)
                                <video 
                                  src={`${image}?v=${Date.now()}`}
                                  controls
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.warn(`Video failed to load: ${image}`);
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #f3f4f6;"><span style="font-size: 1.5em;">🎥</span></div>';
                                    }
                                  }}
                                />
                              ) : (
                                // ✅ For images, use cache-busting timestamp
                                <img 
                                  src={`${image}?v=${Date.now()}`}
                                  alt={`Project ${imgIndex + 1}`} 
                                  className="w-full h-full object-cover rounded"
                                  onError={(e) => {
                                    console.warn(`Image failed to load: ${image}`);
                                    const img = e.currentTarget;
                                    img.style.display = 'none';
                                    const parent = img.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #f3f4f6;"><span style="font-size: 1.5em;">📷</span></div>';
                                    }
                                  }}
                                />
                              )}
                              <button
                                onClick={() => handleDeleteProjectImage(project.id, imgIndex)}
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold opacity-0 group-hover:opacity-100 transition flex items-center justify-center hover:bg-red-600"
                                title="Delete image"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-20 bg-gray-100 flex items-center justify-center text-black font-bold">No images</div>
                    )}

                    {/* Project Info */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded">{project.category}</span>
                        <span className="text-xs text-black font-bold">{new Date(project.completedDate).toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-bold text-lg mb-2">{project.title}</h3>
                      <p className="text-black font-bold text-sm mb-2 line-clamp-2">{project.description}</p>
                      <p className="text-sm text-black font-bold mb-4">📍 {project.location}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            // Copy the public URL for this project to share
                            const projectUrl = `${window.location.origin}/installers`;
                            navigator.clipboard.writeText(projectUrl);
                            alert('Find Installers page link copied! Your project will appear there once it syncs.');
                          }}
                          className="flex-1 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 font-bold text-sm transition"
                        >
                          👥 Share to Find Installers
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          disabled={deletingProjectId === project.id}
                          className="flex-1 bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 font-bold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⭐</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Reviews Yet</h3>
              <p className="text-black font-bold">Complete projects to receive customer reviews</p>
            </div>
          </div>
        )}

        {/* Quotations Tab */}
        {activeTab === 'quotations' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h2 className="text-2xl font-bold">Quotations</h2>
              <button
                type="button"
                disabled
                title="Quotation composer will be enabled in the next update"
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded font-bold cursor-not-allowed"
              >
                + Create New Quotation (Coming Soon)
              </button>
            </div>
            
            {loadingQuotations ? (
              <p className="text-center py-12 text-black font-bold">Loading quotations...</p>
            ) : quotations && quotations.length > 0 ? (
              <div className="space-y-4">
                {quotations.map((quote: any) => (
                  <div key={quote.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{quote.description}</h3>
                        <p className="text-sm text-black font-bold">To: {quote.customer?.firstName || 'Customer'}</p>
                        <p className="text-sm text-black font-bold mt-1">Created: {new Date(quote.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{formatPrice(Number(quote.totalAmount || 0))}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold mt-2 ${
                          quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {quote.status?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Quotations Yet</h3>
                <p className="text-black font-bold">Create your first quotation to get started</p>
              </div>
            )}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">Projects & Jobs</h2>

            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Assigned Service Requests</h3>
              {loadingAssignedRequests ? (
                <p className="text-sm text-black font-bold">Loading assigned requests...</p>
              ) : assignedRequests.length === 0 ? (
                <p className="text-sm text-black font-bold">No service requests assigned to you yet.</p>
              ) : (
                <div className="space-y-3">
                  {assignedRequests.map((req: any) => (
                    <div key={req.id} className="border border-emerald-100 rounded-lg p-4 bg-emerald-50/40">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-900">{req.serviceType}</p>
                          <p className="text-sm text-black font-bold">{req.fullName} • {req.email}</p>
                          <p className="text-sm text-black whitespace-pre-line mt-1">{req.message}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 font-bold">
                          {String(req.status || '').replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {loadingJobs ? (
              <p className="text-center py-12 text-black font-bold">Loading projects...</p>
            ) : jobs && jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job: any) => (
                  <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">{job.title}</h3>
                        <p className="text-sm text-black font-bold mt-1">Customer: {job.customer?.firstName} {job.customer?.lastName}</p>
                        <p className="text-sm text-black font-bold">Location: {job.location || 'Not specified'}</p>
                        <div className="flex gap-4 mt-3 text-sm">
                          <span className="text-black font-bold"><strong>Amount:</strong> ₦{job.quotedAmount?.toLocaleString()}</span>
                          <span className="text-black font-bold"><strong>Start:</strong> {job.scheduledStartDate ? new Date(job.scheduledStartDate).toLocaleDateString() : 'Not scheduled'}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 ${
                          job.status === 'completed' ? 'bg-green-100 text-green-800' :
                          job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          job.status === 'accepted' || job.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                          job.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-black'
                        }`}>
                          {job.status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <p className={`text-sm font-bold ${
                          job.paymentStatus === 'completed' ? 'text-green-600' :
                          job.paymentStatus === 'partial' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          Payment: {job.paymentStatus?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔨</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Jobs Yet</h3>
                <p className="text-black font-bold">Accept quotations or create service packages to start projects</p>
              </div>
            )}
          </div>
        )}

        {/* Swap & Resell Tab */}
        {activeTab === 'resale' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6">🔄 Swap & Resell Products</h2>
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-6">
              <p className="text-blue-900 font-bold dark:text-blue-100">
                💡 As an installer, you can sell or trade in equipment and tools. Manage your resale and trade-in listings directly from your account.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-900 dark:bg-slate-900 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-orange-600 dark:text-orange-100 mb-3">💰 Direct Resale</h3>
                <ul className="space-y-2 text-sm text-orange-900 dark:text-orange-200 font-bold">
                  <li>✓ Sell equipment and tools</li>
                  <li>✓ Set your own price</li>
                  <li>✓ Admin verification</li>
                  <li>✓ Get paid when sold</li>
                </ul>
                <button
                  onClick={() => router.push('/account?tab=swap')}
                  className="w-full mt-4 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-950"
                >
                  Start Selling
                </button>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-blue-600 dark:text-blue-100 mb-3">🔄 Trade-In Program</h3>
                <ul className="space-y-2 text-sm text-blue-900 dark:text-blue-200 font-bold">
                  <li>✓ Trade for upgrades</li>
                  <li>✓ Get fair market value</li>
                  <li>✓ Expert evaluation</li>
                  <li>✓ Use credit towards new items</li>
                </ul>
                <button
                  onClick={() => router.push('/account?tab=swap')}
                  className="w-full mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
                >
                  Start Trading In
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-slate-900 dark:bg-slate-900 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-orange-700 dark:text-orange-100 mb-3"> Sell My Product</h3>
                <ResaleForm />
              </div>
              <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-blue-700 dark:text-blue-100 mb-3"> Trade-In Product</h3>
                <TradeInForm />
              </div>
            </div>
          </div>
        )}
        </div>
      </DashboardLayout>
    </div>
  )
}





