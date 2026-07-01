import Head from 'next/head'
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useState, useEffect } from 'react'
import { getApiBaseUrl } from '@/lib/apiConfig'

export default function DiagnosticsPage() {
  const [apiStatus, setApiStatus] = useState('Loading...')
  const [categories, setCategories] = useState<any[]>([])
  const [error, setError] = useState('')
  const [apiUrl, setApiUrl] = useState('')

  useEffect(() => {
    checkAPI()
  }, [])

  const checkAPI = async () => {
    try {
      const baseUrl = getApiBaseUrl()
      setApiUrl(baseUrl)
      
      const response = await fetch(`${baseUrl}/categories`)
      
      if (!response.ok) {
        setApiStatus(`API Error: ${response.status} ${response.statusText}`)
        setError(`HTTP ${response.status}`)
        return
      }

      const data = await response.json()
      
      if (Array.isArray(data)) {
        setCategories(data)
        setApiStatus(`API Working - ${data.length} categories found`)
      } else {
        setApiStatus(`🔍 API returned non-array response`)
        setError(JSON.stringify(data))
      }
    } catch (err) {
      setApiStatus(`❌ API Connection Failed`)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <>
      <Head>
        <title>RenewableZmart - Diagnostics</title>
      </Head>

      <Header />
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">🔍 Marketplace Diagnostics</h1>

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">API Status</h2>
            <p className="mb-2"><strong>API URL:</strong> {apiUrl || 'Loading...'}</p>
            <p className="mb-4"><strong>Status:</strong> {apiStatus}</p>
            {error && <p className="text-red-600"><strong>Error:</strong> {error}</p>}
          </div>

          {categories.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Categories Found</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => (
                  <div key={cat.id} className="border p-4 rounded">
                    <h3 className="font-semibold text-lg">{cat.icon} {cat.name}</h3>
                    <p className="text-sm text-black mb-2">{cat.description}</p>
                    <p className="text-sm font-medium">
                      📂 Subcategories: {cat.subcategories?.length || 0}
                    </p>
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <ul className="mt-2 text-sm text-black">
                        {cat.subcategories.slice(0, 3).map((sub: any) => (
                          <li key={sub.id}>• {sub.name}</li>
                        ))}
                        {cat.subcategories.length > 3 && (
                          <li>• ... and {cat.subcategories.length - 3} more</li>
                        )}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={checkAPI}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            🔄 Refresh Status
          </button>

          <p className="mt-6 text-sm text-black">
            <a href="/marketplace" className="text-blue-600 hover:underline">↩️ Back to Marketplace</a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}



