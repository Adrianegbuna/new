import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import Header from "@/components/layout/Header";
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { getFallbackImage, getImageUrl, getVideoMimeType } from '@/lib/imageUtils'
import { getProjectMedia } from '@/lib/projectMedia'
import styles from '@/styles/installers.module.css'

interface Installer {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  certifications: string
  yearsOfExperience: number
  serviceAreas: string
  country?: string
  city?: string
  bio?: string
  profilePhoto?: string
  rating?: number
  completedProjects?: number
  completedJobs?: number
  verified?: boolean
  profileImage?: string
  companyName?: string
}

interface Project {
  id: number
  title: string
  description?: string
  serviceCategory?: string
  images?: any[]
  videos?: any[]
  media?: any[]
  completedDate?: string
  installerId: number
  installer?: Installer
}

export default function Installers() {
  const [installers, setInstallers] = useState<Installer[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeVideo, setActiveVideo] = useState<{ src: string; title: string; poster?: string } | null>(null)
  const [selectedCountry, setSelectedCountry] = useState('Nigeria')
  const [selectedCity, setSelectedCity] = useState('Lagos')
  const [resetToAllView, setResetToAllView] = useState(false)
  const activeVideoRef = useRef<HTMLVideoElement | null>(null)
  const installersPreviewCount = 10

  const shuffleList = <T,>(items: T[]) => {
    const array = [...items]
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  useEffect(() => {
    const syncLocation = () => {
      const forceAllMarketplace = typeof window !== 'undefined'
        ? sessionStorage.getItem('renewablezmart_force_all_marketplace') === '1'
        : false
      const navEntry = typeof window !== 'undefined'
        ? (window.performance.getEntriesByType('navigation')[0] as any)
        : null
      const isReload = navEntry?.type === 'reload'
      const shouldResetToAll = forceAllMarketplace || isReload

      setResetToAllView(shouldResetToAll)
      if (shouldResetToAll) {
        setSelectedCountry('')
        setSelectedCity('')
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('renewablezmart_force_all_marketplace')
        }
        return
      }

      const savedLocation = typeof window !== 'undefined' ? localStorage.getItem('renewablezmart_location') : null
      if (!savedLocation) return
      try {
        const { country, city } = JSON.parse(savedLocation)
        setSelectedCountry(String(country || 'Nigeria'))
        setSelectedCity(String(city || 'Lagos'))
      } catch (locationError) {
        setSelectedCountry('Nigeria')
        setSelectedCity('Lagos')
      }
    }
    syncLocation()
    window.addEventListener('locationChanged', syncLocation)

    const fetchAllInstallerProjects = async (installerList: Installer[], apiBase: string) => {
      try {
        setProjectsLoading(true)
        setProjects([])

        const projectsPromises = installerList.map(async (installer) => {
          try {
            const response = await fetch(`${apiBase}/installers/${installer.id}/projects`)
            if (!response.ok) return []
            const installerProjects = await response.json()
            if (!Array.isArray(installerProjects)) return []
            const mappedProjects = installerProjects.map((p: any) => ({ ...p, installer }))
            if (mappedProjects.length > 0) {
              setProjects((prev) => [...prev, ...shuffleList(mappedProjects)])
            }
            return mappedProjects
          } catch (fetchError) {
            console.error(`Error fetching projects for installer ${installer.id}:`, fetchError)
            return []
          }
        })

        await Promise.all(projectsPromises)
      } catch (projectsError) {
        console.error('Error fetching projects:', projectsError)
      } finally {
        setProjectsLoading(false)
      }
    }

    const fetchInstallers = async () => {
      try {
        const apiBase = getApiBaseUrl()
        const response = await fetch(`${apiBase}/installers`)
        if (!response.ok) {
          setInstallers([])
          setProjectsLoading(false)
          return
        }

        const data = await response.json()
        if (!Array.isArray(data)) {
          setInstallers([])
          setProjectsLoading(false)
          return
        }

        const shuffled = shuffleList(data)
        setInstallers(shuffled)
        fetchAllInstallerProjects(shuffled, apiBase)
      } catch (fetchError) {
        setError('Failed to load installers. Please try again.')
        setProjectsLoading(false)
      } finally {
        setLoading(false)
      }
    }

    fetchInstallers()
    return () => {
      window.removeEventListener('locationChanged', syncLocation)
    }
  }, [])

  useEffect(() => {
    if (!activeVideo) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveVideo(null)
      }
    }

    window.addEventListener('keydown', onEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onEscape)
    }
  }, [activeVideo])

  const openVideoViewer = (src: string, title: string, poster?: string) => {
    if (!src) return
    setActiveVideo({ src, title, poster })
  }

  const requestVideoFullscreen = () => {
    const videoElement = activeVideoRef.current as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void
      webkitRequestFullscreen?: () => Promise<void> | void
    }
    if (!videoElement) return

    if (videoElement.requestFullscreen) {
      videoElement.requestFullscreen().catch(() => {
        // Ignore fullscreen errors (browser policy/device restrictions).
      })
      return
    }

    if (videoElement.webkitEnterFullscreen) {
      try {
        videoElement.webkitEnterFullscreen()
      } catch {
        // Ignore unsupported iOS fullscreen fallback.
      }
      return
    }

    if (videoElement.webkitRequestFullscreen) {
      try {
        videoElement.webkitRequestFullscreen()
      } catch {
        // Ignore unsupported fullscreen fallback.
      }
    }
  }

  const filteredInstallers = installers.filter((installer) => {
    if (resetToAllView) return true
    const installerCountry = String(installer.country || '').toLowerCase().trim()
    const installerCity = String(installer.city || '').toLowerCase().trim()
    const selectedCountryValue = String(selectedCountry || '').toLowerCase().trim()
    const selectedCityValue = String(selectedCity || '').toLowerCase().trim()
    const matchesCountry = !selectedCountryValue || !installerCountry || installerCountry === selectedCountryValue
    const matchesCity = !selectedCityValue || !installerCity || installerCity === selectedCityValue
    return matchesCountry && matchesCity
  })
  const visibleInstallers = filteredInstallers.slice(0, installersPreviewCount)
  const filteredInstallerIds = new Set(filteredInstallers.map((installer) => installer.id))
  const filteredProjects = projects.filter((project) => filteredInstallerIds.has(project.installerId))

  const normalizeImagePath = (value?: string) => String(value || '').trim().replace(/\\/g, '/')
  const resolveInstallerImage = (installer: Installer) => {
    const raw = normalizeImagePath(installer.profilePhoto || installer.profileImage || '')
    if (!raw) return ''
    return getImageUrl(raw)
  }

  return (
    <div className={styles.installersContainer}>
      <Head>
        <title>Find Professional Installers - RenewableZmart</title>
        <meta name="description" content="Connect with certified solar installation professionals across Africa" />
      </Head>
      <Header />

      <main>
        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-900 font-bold">Loading installers...</div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">&#9888;</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Installers</h3>
              <p className="text-gray-900 font-bold mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                Try Again
              </button>
            </div>
          ) : installers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">&#128230;</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No installers in database</h3>
              <p className="text-gray-900 font-bold mb-6">There are currently no registered installers. Please check back later.</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                Refresh
              </button>
            </div>
          ) : (
            <>
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-black">Professional Installers</h2>
                  {filteredInstallers.length > installersPreviewCount && (
                    <Link href="/installers/all" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                      See more
                    </Link>
                  )}
                </div>

                <div
                  className="flex overflow-x-auto overflow-y-hidden quick-tabs-scroll scroll-smooth touch-pan-x snap-x snap-mandatory gap-3 sm:gap-4 pb-1"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {visibleInstallers.map((installer) => (
                    <Link href={`/installer/${installer.id}`} key={installer.id}>
                      <div className="group flex flex-col items-center text-center rounded-xl p-2 sm:p-3 hover:bg-white transition shrink-0 min-w-[96px] snap-start">
                        <div className="relative">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[3px] bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-600 shadow-sm">
                            <div className="w-full h-full rounded-full bg-white p-[2px]">
                              <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                                {(() => {
                                  const imageUrl = resolveInstallerImage(installer)
                                  const initials = `${installer.firstName?.[0] || ''}${installer.lastName?.[0] || ''}`.toUpperCase() || 'IN'
                                  if (!imageUrl) {
                                    return <span className="text-lg font-bold text-emerald-700">{initials}</span>
                                  }
                                  return (
                                    <img
                                      src={imageUrl}
                                      alt={installer.firstName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.src = getFallbackImage('Installer')
                                      }}
                                    />
                                  )
                                })()}
                              </div>
                            </div>
                          </div>
                          {installer.verified === true && (
                            <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center shadow">
                              <svg
                                viewBox="0 0 20 20"
                                aria-hidden="true"
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M4 10l4 4 8-8" />
                              </svg>
                            </span>
                          )}
                        </div>

                        <h3 className="mt-2 text-xs sm:text-sm font-bold text-blue-950 group-hover:text-blue-950 transition line-clamp-1 w-full" style={{ color: '#172554', fontWeight: 700 }}>
                          {installer.firstName} {installer.lastName}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {projectsLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-900 font-bold">Loading projects...</div>
                </div>
              ) : filteredProjects.length > 0 ? (
                <div>
                  <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch">
                    {filteredProjects.map((project, index) => (
                      <div
                        key={project.id}
                        className="bg-white rounded-lg shadow-md hover:shadow-xl transition overflow-hidden group cursor-pointer"
                        onClick={(event) => {
                          const target = event.target as HTMLElement
                          if (target.closest('[data-video-interactive="true"]')) return
                          window.location.href = `/installer/${project.installerId}`
                        }}
                      >
                        {(() => {
                          const media = getProjectMedia(project)
                          return (
                            <div className="h-48 bg-gray-200 overflow-hidden relative">
                              {!media.previewUrl ? (
                                <img
                                  src={getFallbackImage('Project')}
                                  alt="Project placeholder"
                                  className="w-full h-full object-cover"
                                />
                              ) : media.previewIsVideo ? (
                                <div
                                  className="relative w-full h-full"
                                  data-video-interactive="true"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openVideoViewer(media.previewUrl, project.title, media.images[0] || getFallbackImage('Video'))
                                  }}
                                  onTouchStart={(e) => e.stopPropagation()}
                                >
                                  <video
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    muted
                                    playsInline
                                    controls={false}
                                    loop
                                    preload="auto"
                                    poster={media.images[0] || getFallbackImage('Video')}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openVideoViewer(media.previewUrl, project.title, media.images[0] || getFallbackImage('Video'))
                                    }}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onError={() => {
                                      console.warn(`Video preview failed: ${media.previewUrl}`)
                                    }}
                                  >
                                    <source src={media.previewUrl} type={getVideoMimeType(media.previewUrl)} />
                                    Your browser does not support the video tag.
                                  </video>
                                  <button
                                    type="button"
                                    data-video-interactive="true"
                                    aria-label="Open video in fullscreen viewer"
                                    className="absolute inset-0 w-full h-full bg-transparent"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openVideoViewer(media.previewUrl, project.title, media.images[0] || getFallbackImage('Video'))
                                    }}
                                  />
                                </div>
                              ) : (
                                <img
                                  src={media.previewUrl}
                                  alt={project.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition"
                                  onError={(e) => {
                                    ;(e.currentTarget as HTMLImageElement).src = getFallbackImage('Project')
                                  }}
                                />
                              )}

                              {media.all.length > 1 ? (
                                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                                  +{media.all.length - 1} items
                                </div>
                              ) : null}
                            </div>
                          )
                        })()}

                        <div className="p-4">
                          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{project.title}</h3>

                          {project.serviceCategory && (
                            <p className="text-sm text-emerald-600 font-semibold mb-2">{project.serviceCategory}</p>
                          )}

                          {project.description && (
                            <p className="text-sm text-gray-800 dark:text-gray-200 mb-3 line-clamp-2 font-semibold">{project.description}</p>
                          )}

                          {project.completedDate && (
                            <p className="text-xs text-gray-800 dark:text-gray-200 mb-3 font-semibold">
                              Completed: {new Date(project.completedDate).toLocaleDateString()}
                            </p>
                          )}

                          {project.installer && (
                            <div className="border-t pt-3 mt-3">
                              <p className="text-sm font-bold text-gray-900">
                                By: {project.installer.firstName} {project.installer.lastName}
                              </p>
                              <p className="text-xs text-gray-800 dark:text-gray-200 font-semibold">
                                Location: {project.installer.city || project.installer.country || 'Nigeria'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>

      {activeVideo && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 p-3 sm:p-6 flex items-center justify-center"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-sm sm:text-base font-semibold line-clamp-1 pr-3">{activeVideo.title}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={requestVideoFullscreen}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm px-3 py-2 rounded"
                >
                  Fullscreen
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVideo(null)}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm px-3 py-2 rounded"
                >
                  Close
                </button>
              </div>
            </div>
            <video
              ref={activeVideoRef}
              className="w-full max-h-[82vh] rounded-md bg-black"
              src={activeVideo.src}
              poster={activeVideo.poster}
              controls
              autoPlay
              playsInline
              preload="auto"
            >
              <source src={activeVideo.src} type={getVideoMimeType(activeVideo.src)} />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </div>
  )
}
