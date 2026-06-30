import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams()
    if (req.query.country) queryParams.append('country', req.query.country as string)
    if (req.query.category) queryParams.append('category', req.query.category as string)
    if (req.query.search) queryParams.append('search', req.query.search as string)

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/stores${queryParams.toString() ? '?' + queryParams.toString() : ''}` 
    
    console.log('Proxying to:', backendUrl)
    
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    console.log('Backend response:', data)
    
    res.status(response.status).json(data)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({ error: 'Failed to fetch stores' })
  }
}
