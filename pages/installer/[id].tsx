import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { getFallbackImage, getVideoMimeType, isVideoUrl } from '@/lib/imageUtils'
import { getProjectMedia } from '@/lib/projectMedia'
import { openVideoFullscreen } from '@/lib/videoFullscreen'
import { useAuthStore } from '@/store/authStore'

interface InstallerProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  businessName?: string
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
}

interface Project {
  id: number
  title: string
  description: string
  category: string
  location: string
  completedDate: string
  images?: any[]
  videos?: any[]
  media?: any[]
}

interface Review {
  id: number
  customerName: string
  rating: number
  comment: string
  date: string
  projectTitle?: string
}

export default function InstallerProfile() {
  const router = useRouter()
  const { id } = router.query
  const { user, token, isHydrated } = useAuthStore()
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'about' | 'projects' | 'reviews'>('about')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  const [reviewEligibility, setReviewEligibility] = useState<{ checked: boolean; allowed: boolean; reason?: string }>({
    checked: false,
    allowed: false,
  })
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    projectType: 'solar'
  })
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: ''
  })

  useEffect(() => {
    if (id) {
      fetchInstallerProfile()
      fetchProjects()
      fetchReviews()
    }
  }, [id])

  useEffect(() => {
    if (!isHydrated || !user || !token || !id) {
      return
    }
    setReviewEligibility({ checked: false, allowed: false })
  }, [isHydrated, user, token, id])

  const matchesInstaller = (job: any, installerId: string) => {
    const candidates = [job?.installerId, job?.installer_id, job?.installer?.id]
    return candidates.some((candidate) => candidate && String(candidate) === installerId)
  }

  const ensureReviewEligibility = async () => {
    if (!isHydrated) {
      return { allowed: false, reason: 'Checking login status. Please try again.' }
    }

    if (!user || !token) {
      return { allowed: false, reason: 'Please login to leave a review.' }
    }

    if (!id) {
      return { allowed: false, reason: 'Unable to find this installer.' }
    }

    if (reviewEligibility.checked) {
      return reviewEligibility
    }

    setCheckingEligibility(true)
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/jobs/customer/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to verify completion status')
      }

      const data = await response.json()
      const jobs = Array.isArray(data) ? data : []
      const installerId = String(id)
      const hasCompletedJob = jobs.some((job: any) => {
        if (!matchesInstaller(job, installerId)) return false
        const status = String(job?.status || '').toLowerCase()
        return status === 'completed' || status === 'done' || status === 'finished'
      })

      const eligibility = {
        checked: true,
        allowed: hasCompletedJob,
        reason: hasCompletedJob ? undefined : 'Reviews are available after successful completion.',
      }
      setReviewEligibility(eligibility)
      return eligibility
    } catch (error) {
      const eligibility = {
        checked: true,
        allowed: false,
        reason: 'Unable to verify completion yet. Please try again shortly.',
      }
      setReviewEligibility(eligibility)
      return eligibility
    } finally {
      setCheckingEligibility(false)
    }
  }

  const fetchInstallerProfile = async () => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/installers/${id}`)
      if (response.ok) {
        const data = await response.json()
        setInstaller(data)
      }
    } catch (error) {
      console.error('Error fetching installer:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/installers/${id}/projects`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchReviews = async () => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/installers/${id}/reviews`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    }
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/installers/${id}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactForm)
      })

      if (response.ok) {
        alert('Your inquiry has been sent! The installer will contact you soon.')
        setShowContactModal(false)
        setContactForm({
          name: '',
          email: '',
          phone: '',
          message: '',
          projectType: 'solar'
        })
      } else {
        alert('Failed to send inquiry. Please try again.')
      }
    } catch (error) {
      console.error('Error sending inquiry:', error)
      alert('Failed to send inquiry. Please try again.')
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const eligibility = await ensureReviewEligibility()
    if (!eligibility.allowed) {
      alert(eligibility.reason || 'Please login to leave a review')
      if (!user || !token) {
        router.push('/login')
      }
      return
    }

    if (reviewForm.rating === 0) {
      alert('Please select a rating (1-5 stars)')
      return
    }

    console.log('Submitting installer review:', reviewForm)

    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/installers/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating: reviewForm.rating,
          comment: reviewForm.comment
        })
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        alert('Review submitted successfully!')
        setShowReviewForm(false)
        setReviewForm({ rating: 0, comment: '' })
        fetchReviews()
      } else {
        const error = await response.json()
        console.error('API Error:', error)
        alert(`Failed to submit review: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      alert(`Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const renderStars = (rating: number, interactive: boolean = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`text-2xl ${star <= rating ? 'text-orange-500' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:scale-110 transition' : 'cursor-default'}`}
            onClick={(e) => {
              e.preventDefault()
              if (interactive && onChange) {
                onChange(star)
              }
            }}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">Loading installer profile...</div>
        </div>
      </div>
    )
  }

  if (!installer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl text-red-600">Installer not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{installer.businessName || `${installer.firstName} ${installer.lastName}`} - RenewableZmart</title>
        <meta name="description" content={installer.bio || `Professional installer with ${installer.yearsOfExperience} years of experience`} />
      </Head>
      <Header />

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-black font-bold">
            <Link href="/" className="hover:text-emerald-600">Home</Link>
            <span>/</span>
            <Link href="/installers" className="hover:text-emerald-600">Installers</Link>
            <span>/</span>
            <span className="text-black">{installer.businessName || `${installer.firstName} ${installer.lastName}`}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-5xl font-bold overflow-hidden">
                {installer.profilePhoto ? (
                  <img src={installer.profilePhoto} alt={installer.firstName} className="w-full h-full object-cover" />
                ) : (
                  <span>{installer.firstName[0]}{installer.lastName[0]}</span>
                )}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-4xl font-bold text-black mb-2">
                    {installer.businessName || `${installer.firstName} ${installer.lastName}`}
                  </h1>
                  {installer.verified === true && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-blue-100 text-blue-800 text-xs md:text-sm px-3 py-1 rounded-full flex items-center gap-1">
                        ✓ Verified Professional
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(installer.rating || 0))}
                      <span className="font-semibold text-sm">{installer.rating?.toFixed(1)}</span>
                      <span className="text-black font-bold text-sm">({reviews.length} reviews)</span>
                    </div>
                    <span className="text-black font-bold hidden sm:block">•</span>
                    <span className="text-black font-bold text-sm">📍 {installer.city}, {installer.country}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm text-black font-bold mb-4">
                    <span>✅ {installer.completedProjects || 0} Projects Completed</span>
                    <span>📅 {installer.yearsOfExperience} Years Experience</span>
                  </div>
                  <p className="text-black font-bold leading-relaxed text-sm md:text-base">
                    {installer.bio}
                  </p>
                </div>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="bg-blue-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2 whitespace-nowrap text-sm md:text-base w-full md:w-auto"
                >
                  ❓ Send Inquiry
                </button>
              </div>

              {/* Specialties */}
              {installer.specialties && installer.specialties.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold text-black mb-2">Specialties:</h3>
                  <div className="flex flex-wrap gap-2">
                    {installer.specialties.map((specialty, index) => (
                      <span key={index} className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Areas */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-bold text-black mb-2">Service Areas:</h3>
                  <p className="text-black font-bold">{installer.serviceAreas}</p>
                </div>
                <div>
                  <h3 className="font-bold text-black mb-2">Certifications:</h3>
                  <p className="text-black font-bold text-sm">{installer.certifications}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('about')}
              className={`px-6 py-4 font-semibold ${activeTab === 'about' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-black font-bold hover:text-black'}`}
            >
              About
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-6 py-4 font-semibold ${activeTab === 'projects' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-black font-bold hover:text-black'}`}
            >
              Projects ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-6 py-4 font-semibold ${activeTab === 'reviews' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-black font-bold hover:text-black'}`}
            >
              Reviews ({reviews.length})
            </button>
          </div>
        </div>

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-black mb-6">Professional Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-black mb-2">Service Details</h3>
                <div className="space-y-2 text-black font-bold">
                  <p>📍 {installer.city}, {installer.country}</p>
                  <p>🔧 {installer.serviceAreas}</p>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-black mb-2">Experience & Credentials</h3>
                <div className="space-y-2 text-black font-bold">
                  <p>📅 {installer.yearsOfExperience} years in the industry</p>
                  <p>✅ {installer.completedProjects || 0} successful projects</p>
                  <p>⭐ {installer.rating?.toFixed(1)} average rating</p>
                </div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">💬 To contact this installer, use the "Send Message" button at the top. Your message will be sent to their inbox within the app.</p>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-md">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-base sm:text-xl font-black text-black mb-2">No Projects Yet</h3>
                <p className="text-sm sm:text-base font-black text-black">This installer hasn't added any projects yet</p>
              </div>
            ) : (
              projects.map((project, index) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="h-56 bg-gray-200 relative overflow-hidden">
                    {(() => {
                      const media = getProjectMedia(project)
                      if (!media.previewUrl) {
                        return (
                          <div className="w-full h-full flex items-center justify-center text-6xl">
                            🔧
                          </div>
                        )
                      }

                      if (media.previewIsVideo) {
                        return (
                          <video
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            playsInline
                            controls={false}
                            loop
                            preload="auto"
                            poster={media.images?.[0] || getFallbackImage('Video')}
                            onClick={(event) => {
                              event.stopPropagation()
                              openVideoFullscreen(event.currentTarget)
                            }}
                            onError={() => {
                              console.warn(`Video preview failed: ${media.previewUrl}`)
                            }}
                          >
                            <source src={media.previewUrl} type={getVideoMimeType(media.previewUrl)} />
                            Your browser does not support the video tag.
                          </video>
                        )
                      }

                      return (
                        <img 
                          src={media.previewUrl} 
                          alt={project.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn(`Image preview failed: ${media.previewUrl}`);
                            ;(e.target as HTMLImageElement).src = getFallbackImage('Project')
                          }}
                        />
                      )
                    })()}
                    {(() => {
                      const media = getProjectMedia(project)
                      return media.all.length > 1 ? (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                        +{media.all.length - 1} items
                      </div>
                      ) : null
                    })()}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded">{project.category}</span>
                      <span className="text-xs text-black font-bold">{new Date(project.completedDate).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{project.title}</h3>
                    <p className="text-black font-medium text-sm mb-2 line-clamp-2">{project.description}</p>
                    <p className="text-sm text-black font-bold">📍 {project.location}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold">Customer Reviews</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center">
                      {renderStars(Math.round(installer?.rating || 0))}
                    </div>
                    <span className="text-xl font-semibold">{installer?.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-black font-bold">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (checkingEligibility) {
                      alert('Checking completion status. Please wait.')
                      return
                    }
                    const eligibility = await ensureReviewEligibility()
                    if (!eligibility.allowed) {
                      alert(eligibility.reason || 'Please login to write a review')
                      if (!user || !token) {
                        router.push('/login')
                      }
                      return
                    }
                    setShowReviewForm(!showReviewForm)
                  }}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-semibold"
                >
                  {showReviewForm ? 'Cancel' : '✍️ Write Review'}
                </button>
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <form onSubmit={handleSubmitReview} className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h4 className="font-bold text-lg mb-4">Share Your Experience</h4>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-black font-semibold mb-2">Your Rating</label>
                    {renderStars(reviewForm.rating, true, (rating) => setReviewForm(prev => ({ ...prev, rating })))}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-black font-semibold mb-2">Your Review</label>
                    <textarea
                      required
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Tell us about your experience with this installer..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-semibold"
                  >
                    Submit Review
                  </button>
                </form>
              )}
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-md">
                <div className="text-6xl mb-4">⭐</div>
                <h3 className="text-base sm:text-xl font-black text-black mb-2">No Reviews Yet</h3>
                <p className="text-sm sm:text-base font-black text-black">Be the first to review this installer</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div 
                  key={review.id} 
                  className="bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all duration-200 hover:shadow-lg border-2 border-gray-200"
                  onClick={(e) => {
                    // Toggle review highlight on click - grey to green
                    const element = e.currentTarget as HTMLElement;
                    if (element) {
                      element.classList.toggle('border-green-500');
                      element.classList.toggle('bg-green-50');
                      element.classList.toggle('border-gray-200');
                      element.classList.toggle('bg-white');
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{review.customerName}</h3>
                      {review.projectTitle && (
                        <p className="text-sm text-black font-bold">{review.projectTitle}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {renderStars(review.rating)}
                      <p className="text-xs text-black font-bold mt-1">{new Date(review.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-black font-bold leading-relaxed">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Project Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedProject(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{selectedProject.title}</h2>
              <button onClick={() => setSelectedProject(null)} className="text-3xl text-black hover:text-black">×</button>
            </div>
            <div className="p-6">
              {getProjectMedia(selectedProject).all.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {getProjectMedia(selectedProject).all.map((mediaUrl, index) => (
                    <div key={index} className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                      {isVideoUrl(mediaUrl) ? (
                        <video 
                          controls 
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                          poster={getFallbackImage('Video')}
                          onError={() => {
                            console.warn(`Video failed to load: ${mediaUrl}`);
                          }}
                        >
                          <source src={mediaUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <img 
                          src={mediaUrl} 
                          alt={`${selectedProject.title} ${index + 1}`} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn(`Image failed to load: ${mediaUrl}`);
                            ;(e.target as HTMLImageElement).src = getFallbackImage('Project')
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-semibold">{selectedProject.category}</span>
                  <span className="text-black font-bold">📍 {selectedProject.location}</span>
                  <span className="text-black font-bold">📅 {new Date(selectedProject.completedDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Project Description</h3>
                  <p className="text-black font-bold leading-relaxed">{selectedProject.description}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedProject(null)
                    setShowContactModal(true)
                  }}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-semibold"
                >
                  Request Similar Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal - Send Inquiry */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowContactModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-blue-600 text-white p-4 rounded-t-lg">
              <h2 className="text-2xl font-bold">Contact Installer</h2>
              <p className="text-sm font-semibold">Interested in {installer.firstName}'s services?</p>
            </div>
            <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
              <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-blue-900">
                ℹ️ Your request will be sent to the installer. For urgent help, use the in-app chat button.
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Your Email *</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Project Type</label>
                <select
                  value={contactForm.projectType}
                  onChange={(e) => setContactForm(prev => ({ ...prev, projectType: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="solar">Solar Installation</option>
                  <option value="inverter">Inverter Setup</option>
                  <option value="battery">Battery Storage</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Message *</label>
                <textarea
                  required
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Tell the installer about your project..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 bg-gray-200 text-black py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-semibold"
                >
                  Send Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

