import Head from 'next/head'
import { useState, useEffect } from 'react'
import Header from "@/components/layout/Header";
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { getImageUrl, getFallbackImage } from '@/lib/imageUtils'

interface Project {
  id: string | number
  title: string
  description: string
  category: string
  location: string
  completedDate: string
  images: string[]
  videos?: string[]
  installerId?: string
  installerName?: string
  installerPhoto?: string
}

interface InstallerProject extends Project {
  installerId: string
}

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

export default function Projects() {
  const [projects, setProjects] = useState<InstallerProject[]>([])
  const [installers, setInstallers] = useState<Installer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedProject, setSelectedProject] = useState<InstallerProject | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'rating'>('recent')

  const categories = [
    'solar',
    'wind',
    'hydro',
    'biogas',
    'hybrid',
    'battery',
    'inverter',
    'panel',
    'installation',
    'maintenance',
    'other'
  ]

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      const apiBase = getApiBaseUrl()
      
      // Fetch installers once and reuse for projects
      const installersResponse = await fetch(`${apiBase}/installers`)
      if (!installersResponse.ok) {
        console.error('Failed to fetch installers:', installersResponse.status)
        setLoading(false)
        return
      }

      const installersList = await installersResponse.json()
      setInstallers(installersList)
      console.log('Fetched installers:', installersList.length)

      // Fetch projects for each installer
      const allProjects: InstallerProject[] = []

      for (const installer of installersList) {
        try {
          const projectsResponse = await fetch(`${apiBase}/installers/${installer.id}/projects`)
          if (projectsResponse.ok) {
            const installerProjects = await projectsResponse.json()
            console.log(`Fetched ${installerProjects.length} projects for installer ${installer.id}`)
            
            const enrichedProjects = installerProjects.map((project: any) => ({
              ...project,
              installerId: installer.id,
              installerName: `${installer.firstName} ${installer.lastName}`,
              installerPhoto: installer.profilePhoto
            }))
            allProjects.push(...enrichedProjects)
          } else {
            console.warn(`Failed to fetch projects for installer ${installer.id}:`, projectsResponse.status)
          }
        } catch (error) {
          console.error(`Error fetching projects for installer ${installer.id}:`, error)
        }
      }

      console.log('Total projects loaded:', allProjects.length)
      setProjects(allProjects)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique locations from projects
  const uniqueLocations = [
    ...new Set(
      projects
        .map(p => p.location)
        .filter(Boolean)
        .map(loc => loc.trim())
    )
  ].sort()

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.installerName?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory

    const matchesLocation =
      selectedLocation === 'all' || project.location === selectedLocation

    return matchesSearch && matchesCategory && matchesLocation
  })

  // Sort projects
  let sortedProjects = [...filteredProjects]
  if (sortBy === 'recent') {
    sortedProjects.sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime())
  } else if (sortBy === 'popular') {
    // Could add view count or rating
    sortedProjects.sort((a, b) => (b.images?.length || 0) - (a.images?.length || 0))
  }

  const ImagePreview = ({ src, alt }: { src: string; alt: string }) => {
    const [imageError, setImageError] = useState(false)
    const fullImageUrl = getImageUrl(src)
    const fallbackSrc = getFallbackImage(alt)

    return (
      <img
        src={!src || imageError ? fallbackSrc : fullImageUrl}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
        loading="lazy"
      />
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <Head>
        <title>Installed Projects - RenewableZmart</title>
        <meta
          name="description"
          content="Browse completed renewable energy installation projects by certified installers on RenewableZmart"
        />
      </Head>
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-8 sm:py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4 flex items-center gap-3">
              Professional Installers in Nigeria
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/95 font-medium">
              Certified experts to install your solar energy systems
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:py-12">
          {/* Search and Filter Section */}
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8 sm:mb-12">
            <div className="space-y-4 sm:space-y-6">
              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search by name, certification, or location..."
                className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-400 rounded-xl focus:outline-none focus:border-emerald-600 text-base text-gray-900 font-medium placeholder:text-gray-600 dark:placeholder:text-gray-400 dark:text-white dark:bg-gray-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Filter Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-wrap">
                <select
                  className="px-4 sm:px-6 py-2 sm:py-3 border-2 border-gray-400 rounded-xl focus:outline-none focus:border-emerald-600 bg-white text-gray-900 font-semibold text-sm sm:text-base"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <option value="all">All Locations</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>

                <button className="px-4 sm:px-6 py-2 sm:py-3 border-2 border-gray-400 rounded-xl bg-white text-gray-900 font-semibold text-sm sm:text-base hover:border-emerald-600 transition">
                  All Installers
                </button>
              </div>
            </div>
          </div>

          {/* Professional Installers Network Section */}
          {!loading && installers.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Professional Installers Network</h2>
              <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch">
                {installers.slice(0, 10).map((installer) => {
                  const installerProjects = projects.filter(p => String(p.installerId) === String(installer.id))
                  
                  return (
                    <Link key={installer.id} href={`/installer/${installer.id}`}>
                      <div className="bg-white rounded-lg shadow-md hover:shadow-lg overflow-hidden transition cursor-pointer">
                        {/* Green Header - Compact */}
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 h-20 sm:h-24 flex items-center justify-center">
                          {/* Avatar Circle - Overlapping */}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-white flex items-center justify-center shadow-md -mb-8 sm:-mb-10">
                            {installer.profilePhoto ? (
                              <img
                                src={getImageUrl(installer.profilePhoto)}
                                alt={installer.firstName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm sm:text-base font-bold text-white">
                                {installer.firstName.charAt(0)}{installer.lastName.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Content - Compact */}
                        <div className="p-3 sm:p-4 text-center pt-6 sm:pt-8">
                          {/* Name */}
                          <h3 className="font-bold text-gray-900 text-xs sm:text-sm line-clamp-2 mb-2">
                            {installer.firstName} {installer.lastName}
                          </h3>

                          {/* Stats - Project Count */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs sm:text-sm">🛠️</span>
                              <span className="text-xs font-bold text-gray-900">
                                {installer.completedProjects ?? installer.completedJobs ?? installerProjects.length}
                              </span>
                            </div>

                            {/* Location with Pin */}
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs">📍</span>
                              <span className="text-xs text-gray-700 font-semibold line-clamp-1">
                                {installer.city || installer.serviceAreas?.split(',')[0] || 'Nigeria'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Projects Section */}
          <div className="mb-8">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Installer Projects Gallery</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600 bg-white text-gray-900 font-semibold text-sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>

                <select
                  className="px-4 py-2 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600 bg-white text-gray-900 font-semibold text-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                </select>

                <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
                  <button
                    className={`px-3 py-2 rounded text-sm font-bold transition ${
                      viewMode === 'grid'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-transparent text-gray-900 hover:bg-white'
                    }`}
                    onClick={() => setViewMode('grid')}
                  >
                    Grid
                  </button>
                  <button
                    className={`px-3 py-2 rounded text-sm font-bold transition ${
                      viewMode === 'list'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-transparent text-gray-900 hover:bg-white'
                    }`}
                    onClick={() => setViewMode('list')}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-900 font-bold mb-6">
              {loading ? 'Loading...' : `${sortedProjects.length} installed project${sortedProjects.length !== 1 ? 's' : ''} found`}
            </div>

            {/* Projects Display */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              </div>
              <p className="text-gray-900 font-bold mt-4">Loading projects...</p>
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No installed projects found</h3>
              <p className="text-gray-900 font-bold mb-6">
                {searchQuery || selectedCategory !== 'all' || selectedLocation !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No installation projects available yet'}
              </p>
              {(searchQuery || selectedCategory !== 'all' || selectedLocation !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('all')
                    setSelectedLocation('all')
                  }}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            // Grid View - 4 columns on desktop, 3 on tablets, 2 on mobile
            <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch">
              {sortedProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden transform hover:scale-105 duration-300"
                  onClick={() => setSelectedProject(project)}
                >
                  {/* Image */}
                  <div className="h-48 sm:h-56 bg-gray-200 relative overflow-hidden">
                    <ImagePreview src={project.images?.[0]} alt={project.title} />
                    {project.images && project.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-semibold">
                        +{project.images.length - 1}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{project.title}</h3>
                    <p className="text-sm text-black font-semibold mb-3 line-clamp-2">{project.description}</p>

                    <div className="text-xs text-black font-semibold mb-3">
                      Completed: {new Date(project.completedDate).toLocaleDateString()}
                    </div>

                    <div className="border-t pt-3 space-y-1">
                      <div className="text-xs text-black font-semibold">
                        By: {project.installerName || 'Unknown Installer'}
                      </div>
                      <div className="text-xs text-black font-semibold flex items-center gap-1">
                        <span>📍</span>
                        <span>{project.location || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List View
            <div className="space-y-4">
              {sortedProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition cursor-pointer p-4 sm:p-6 flex gap-4"
                  onClick={() => setSelectedProject(project)}
                >
                  {/* Thumbnail */}
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                    <ImagePreview src={project.images?.[0]} alt={project.title} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <div>
                        <div className="text-xs font-semibold text-emerald-600 mb-1">
                          {project.category.toUpperCase()}
                        </div>
                        <h3 className="font-bold text-gray-900 line-clamp-2">{project.title}</h3>
                      </div>
                      <div className="text-xs font-bold text-gray-900 whitespace-nowrap">
                        {new Date(project.completedDate).toLocaleDateString()}
                      </div>
                    </div>

                    <p className="text-sm text-black font-semibold mb-3 line-clamp-2">{project.description}</p>

                    {/* Installer Info and Location */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-sm font-semibold text-black">
                        By: {project.installerName || 'Unknown Installer'}
                      </div>
                      <div className="text-sm text-black font-semibold flex items-center gap-1">
                        <span>📍</span>
                        <span>{project.location || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </main>

      {/* Project Detail Modal */}
      {selectedProject && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 sm:p-6 flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-bold line-clamp-2">{selectedProject.title}</h2>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-2xl sm:text-3xl text-gray-900 hover:text-black font-bold flex-shrink-0"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Media Gallery - Images & Videos */}
              {((selectedProject.images && selectedProject.images.length > 0) || (selectedProject.videos && selectedProject.videos.length > 0)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Display Images */}
                  {selectedProject.images?.map((image, index) => (
                    <div key={`img-${index}`} className="rounded-lg overflow-hidden bg-gray-200 h-48 sm:h-64">
                      <ImagePreview src={image} alt={`${selectedProject.title} ${index + 1}`} />
                    </div>
                  ))}
                  
                  {/* Display Videos */}
                  {selectedProject.videos?.map((video, index) => (
                    <div key={`vid-${index}`} className="rounded-lg overflow-hidden bg-black h-48 sm:h-64">
                      <video
                        src={getImageUrl(video)}
                        controls
                        className="w-full h-full object-contain"
                        poster={selectedProject.images?.[0] ? getImageUrl(selectedProject.images[0]) : undefined}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ))}
                </div>
              )}

              {/* Project Details */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase mb-2">Category</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedProject.category.charAt(0).toUpperCase() + selectedProject.category.slice(1)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-900 uppercase mb-2">Description</p>
                  <p className="text-gray-900 font-semibold whitespace-pre-wrap">{selectedProject.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-900 uppercase mb-2">Location</p>
                    <p className="text-gray-900 font-semibold flex items-center gap-2">
                      <span>📍</span>
                      {selectedProject.location || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 uppercase mb-2">Completed Date</p>
                    <p className="text-gray-900 font-semibold">
                      {new Date(selectedProject.completedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Installer Info */}
                <div className="border-t pt-4">
                  <p className="text-xs font-bold text-gray-900 uppercase mb-3">Installer</p>
                  <Link href={`/installer/${selectedProject.installerId}`}>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      {selectedProject.installerPhoto ? (
                        <img
                          src={selectedProject.installerPhoto}
                          alt={selectedProject.installerName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-lg font-bold text-emerald-600">
                          {selectedProject.installerName?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{selectedProject.installerName || 'Unknown'}</p>
                        <p className="text-sm text-emerald-600 hover:underline">View Profile ?</p>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Link
                    href={`/installer/${selectedProject.installerId}`}
                    className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 transition font-semibold text-center"
                  >
                    View Installer Profile
                  </Link>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="flex-1 bg-gray-200 text-gray-900 px-4 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




