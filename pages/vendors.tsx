import Head from 'next/head'
import Header from '../components/Header'
import { useState, useEffect, ChangeEvent, FormEvent } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

interface Store {
  id: string
  name: string
  description: string
  logo: string
  slug: string
  rating: number
  totalReviews: number
  totalSales: number
  categories: string[]
  isVerified: boolean
  owner: {
    firstName: string
    lastName: string
  }
}

interface CurrentUser {
  id: number
  firstName: string
  lastName: string
  email: string
  accountType: string
  businessName?: string
  businessRegNumber?: string
  phone?: string
  token: string
}

interface PreviewItem {
  name: string
  type: string
  url: string
}

export default function VendorsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [message, setMessage] = useState('')
  const [isVerified, setIsVerified] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<PreviewItem[]>([])
  const [formData, setFormData] = useState({
    storeName: '',
    email: '',
    phone: '',
    productName: '',
    category: '',
    price: '',
    description: '',
    stock: ''
  })

  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('renewablezmart_current_user') : null
    if (!user) {
      router.push('/login')
      return
    }

    const userData = JSON.parse(user) as CurrentUser
    setCurrentUser(userData)

    if (userData.accountType !== 'vendor') {
      setMessage('Only Dealer accounts can upload products. Please register as a Dealer.')
      return
    }

    if (!userData.businessRegNumber) {
      setMessage('Please complete your Dealer registration with business details.')
      return
    }

    setIsVerified(true)
    setFormData((prev) => ({
      ...prev,
      storeName: userData.businessName || '',
      email: userData.email,
      phone: userData.phone || ''
    }))
  }, [router])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])

    if (selectedFiles.length > 10) {
      setMessage('Maximum 10 files allowed per upload')
      return
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
    const invalidFiles = selectedFiles.filter((file) => !validTypes.includes(file.type))

    if (invalidFiles.length > 0) {
      setMessage('Only images (JPEG, PNG, WebP) and videos (MP4, WebM, MOV) are allowed')
      return
    }

    const oversizedFiles = selectedFiles.filter((file) => file.size > 50 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      setMessage('Each file must be less than 50MB')
      return
    }

    setFiles(selectedFiles)
    setMessage('')

    const newPreviews: PreviewItem[] = selectedFiles.map((file) => ({
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file)
    }))
    setPreviews(newPreviews)
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!formData.storeName || !formData.email || !formData.productName || !formData.category || !formData.price) {
      setMessage('Please fill in all required fields')
      return
    }

    if (files.length === 0) {
      setMessage('Please upload at least one product image or video')
      return
    }

    setUploading(true)
    setMessage('Uploading product...')

    setTimeout(() => {
      setUploading(false)
      setMessage('Product uploaded successfully! Our team will review and approve it within 24 hours.')
      setFormData({
        storeName: '',
        email: '',
        phone: '',
        productName: '',
        category: '',
        price: '',
        description: '',
        stock: ''
      })
      setFiles([])
      setPreviews([])
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-8 rounded-t-lg">
            <h1 className="text-3xl font-bold mb-2">Dealer Product Upload</h1>
            <p className="text-teal-50">List your solar products on RenewableZmart and reach customers across Africa</p>
            {currentUser && (
              <div className="mt-3 bg-teal-700 rounded p-3">
                <p className="text-sm">
                  <strong>Business:</strong> {currentUser.businessName} 
                  <span className="ml-3">
                    <strong>Reg. No:</strong> {currentUser.businessRegNumber}
                  </span>
                  {isVerified && <span className="ml-3 bg-green-500 text-white px-2 py-1 rounded text-xs">✅ Verified</span>}
                </p>
              </div>
            )}
          </div>

          {currentUser && currentUser.accountType === 'vendor' && !isVerified && (
            <div className="bg-yellow-50 border-2 border-yellow-400 p-6 rounded-b-lg">
              <h3 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">💳 Business Verification Required</h3>
              <p className="text-yellow-800 mb-3">
                Your business registration number <strong>{currentUser.businessRegNumber}</strong> is being verified. 
                You will be able to upload products once verification is complete (usually within 24-48 hours).
              </p>
              <p className="text-sm text-yellow-700">If you have any questions, contact support at support@renewablezmart.com</p>
            </div>
          )}

          {currentUser && currentUser.accountType !== 'vendor' && (
            <div className="bg-red-50 border-2 border-red-400 p-6 rounded-b-lg">
              <h3 className="font-bold text-red-900 mb-2">🏪 Dealer Account Required</h3>
              <p className="text-red-800">Only Dealer accounts can upload products. Please register a Dealer account to access this page.</p>
            </div>
          )}

          {isVerified && (
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-b-lg p-8 mt-0">
              <form onSubmit={handleSubmit}>
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Store Information</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black dark:text-white font-bold mb-2">Store Name <span className="text-red-500">*</span></label>
                      <input type="text" name="storeName" value={formData.storeName} onChange={handleInputChange} className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="Your Store Name" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black dark:text-white font-bold mb-2">Email <span className="text-red-500">*</span></label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="store@example.com" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black dark:text-white font-bold mb-2">Phone Number</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="+234 XXX XXX XXXX" />
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Product Information</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black dark:text-white font-bold mb-2">Product Name <span className="text-red-500">*</span></label>
                      <input type="text" name="productName" value={formData.productName} onChange={handleInputChange} className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="e.g., 300W Monocrystalline Solar Panel" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black dark:text-white font-bold mb-2">Category <span className="text-red-500">*</span></label>
                      <select name="category" value={formData.category} onChange={handleInputChange} className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-black dark:text-white bg-white dark:bg-gray-800 border-black dark:border-gray-600 font-semibold" required>
                        <option value="">Select Category</option>
                        <option value="solar">Solar Panels</option>
                        <option value="inverters">Inverters</option>
                        <option value="batteries">Batteries</option>
                        <option value="accessories">Accessories</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black dark:text-white font-bold mb-2">Price <span className="text-red-500">*</span></label>
                      <input type="number" name="price" value={formData.price as number | string} onChange={handleInputChange} className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="50000" min={0} required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black dark:text-white font-bold mb-2">Stock Quantity</label>
                      <input type="number" name="stock" value={formData.stock as number | string} onChange={handleInputChange} className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="100" min={0} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-black dark:text-white font-bold mb-2">Product Description</label>
                      <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} className="w-full border border-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-black dark:text-white bg-white dark:bg-gray-800 border-black dark:border-gray-600 placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="Describe your product features, specifications, warranty, etc." />
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Product Media</h2>
                  <div>
                    <label className="block text-sm font-bold text-black dark:text-white font-bold mb-2">
                      Upload Photos/Videos <span className="text-red-500">*</span>
                      <span className="text-black dark:text-white font-bold font-normal ml-2">(Max 10 files, 50MB each)</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-400 rounded-lg p-8 text-center hover:border-teal-500 transition">
                      <input type="file" multiple accept="image/jpeg,image/png,image/jpg,image/webp,video/mp4,video/webm,video/quicktime" onChange={handleFileChange} className="hidden" id="file-upload" />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="text-6xl mb-4">📄</div>
                        <p className="text-black dark:text-white font-bold font-bold mb-2">Click to upload or drag and drop</p>
                        <p className="text-sm text-black dark:text-white font-bold">Images: JPEG, PNG, WebP | Videos: MP4, WebM, MOV</p>
                        <p className="text-sm text-black dark:text-white font-bold mt-1">{files.length}/10 files selected</p>
                      </label>
                    </div>
                  </div>

                  {previews.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-bold text-black dark:text-white font-bold mb-3">Selected Files ({previews.length}/10)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {previews.map((preview, index) => (
                          <div key={index} className="relative group aspect-square">
                            <div className="rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 w-full h-full">
                              {preview.type.startsWith('image/') ? (
                                <img src={preview.url} alt={preview.name} className="w-full h-full object-cover" />
                              ) : (
                                <video src={preview.url} className="w-full h-full object-cover" controls />
                              )}
                            </div>
                            <button type="button" onClick={() => removeFile(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">×</button>
                            <p className="text-xs text-black dark:text-white font-bold mt-1 truncate">{preview.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {message && (
                  <div className={`mb-6 p-4 rounded-lg ${
                    message.toLowerCase().includes('success') ? 'bg-green-50 text-green-800 border border-green-200' :
                    message.includes('successfully') ? 'bg-green-50 text-green-800 border border-green-200' :
                    'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-sm text-black dark:text-white font-bold">
                    <span className="text-red-500">*</span> Required fields
                  </p>
                  <button type="submit" disabled={uploading} className="bg-teal-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition">
                    {uploading ? 'Uploading...' : 'Submit Product'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-3">💼 Dealer Guidelines</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✅ All products are subject to approval by RenewableZmart team</li>
              <li>🖼️ High-quality images and videos increase customer trust</li>
              <li>📄 Accurate product descriptions help customers make informed decisions</li>
              <li>💰 Competitive pricing and good stock levels improve sales</li>
              <li>📧 You will be notified via email once your product is approved</li>
              <li>✅ Ensure your business registration number is valid and verified</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}




