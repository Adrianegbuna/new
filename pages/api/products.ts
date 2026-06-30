import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Build query parameters - only include valid ones
    const queryParams = new URLSearchParams()
    const validParams = ['country', 'category', 'subcategory', 'search', 'storeId']
    
    Object.keys(req.query).forEach(key => {
      if (validParams.includes(key) && req.query[key]) {
        const value = req.query[key] as string
        // Sanitize parameter value to prevent injection
        const sanitized = value.replace(/[<>\"']/g, '').trim()
        if (sanitized.length > 0 && sanitized.length <= 100) {
          queryParams.append(key, sanitized)
        }
      }
    })

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/products${queryParams.toString() ? '?' + queryParams.toString() : ''}`
    
    console.log('[PRODUCTS API PROXY] Request to:', backendUrl, 'from:', req.headers.referer || 'unknown')
    
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[PRODUCTS API PROXY] Backend error:', response.status, errorText.substring(0, 200))
    }

    const data = await response.json()
    console.log('[PRODUCTS API PROXY] Response:', Array.isArray(data) ? data.length : 'invalid', 'items')
    
    res.status(response.status).json(data)
  } catch (error) {
    console.error('[PRODUCTS API PROXY] Error:', error instanceof Error ? error.message : String(error))
    res.status(500).json({ error: 'Failed to fetch products', details: process.env.NODE_ENV === 'development' ? String(error) : undefined })
  }
}
