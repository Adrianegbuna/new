import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/products/all-vendor`
    
    console.log('Fetching all products from:', backendUrl)
    
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    console.log('Vendor products fetched:', data?.length || 0)
    
    res.status(response.status).json(data)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
}
