import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    let { slug } = req.query
    
    // Handle slug being an array (can happen with Next.js routing)
    if (Array.isArray(slug)) {
      slug = slug.join('/')
    }
    
    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' })
    }

    // Ensure slug is properly encoded when forwarding to backend
    const encodedSlug = encodeURIComponent(slug as string)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://renewablezmart-backend.onrender.com/api'
    const backendUrl = `${apiUrl}/stores/slug/${encodedSlug}`
    
    console.log('🔍 Proxying store slug request')
    console.log('   Raw slug:', { slug, isArray: Array.isArray(slug) })
    console.log('   Encoded slug:', encodedSlug)
    console.log('   Backend URL:', backendUrl)
    
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`❌ Backend returned ${response.status}: ${response.statusText}`)
      const errorData = await response.text()
      console.error('Backend error response:', errorData.substring(0, 200))
      return res.status(response.status).json({ error: 'Failed to fetch store from backend' })
    }

    const data = await response.json()
    console.log('✅ Store fetched:', {
      name: data.name,
      productsCount: data.products?.length || 0,
    })
    
    res.status(response.status).json(data)
  } catch (error) {
    console.error('❌ Proxy error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error details:', errorMessage)
    res.status(500).json({ error: 'Failed to fetch store', details: errorMessage })
  }
}
