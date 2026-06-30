import { NextApiRequest, NextApiResponse } from 'next';

// Helper to get backend base URL
function getBackendBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://renewablezmart-backend.onrender.com/api';
  return apiUrl.replace('/api', '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  
  if (!path || typeof path !== 'string') {
    console.error('Missing path parameter');
    return res.status(400).json({ error: 'Path parameter required' });
  }

  try {
    // Decode the path if it's URL encoded
    const decodedPath = decodeURIComponent(path);
    
    // Ensure path doesn't try to go outside uploads
    if (decodedPath.includes('..')) {
      console.error('[Image Proxy] Path traversal attempt:', decodedPath);
      return res.status(400).json({ error: 'Invalid path' });
    }

    // Ensure path starts with /
    const normalizedPath = decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}`;
    
    let baseUrl = getBackendBaseUrl();
    // Remove trailing slash to avoid double slashes
    baseUrl = baseUrl.replace(/\/$/, '');
    const backendUrl = `${baseUrl}${normalizedPath}`;
    
    console.log('[Image Proxy] Decoded path:', decodedPath);
    console.log('[Image Proxy] Normalized path:', normalizedPath);
    console.log('[Image Proxy] Base URL:', baseUrl);
    console.log('[Image Proxy] Full backend URL:', backendUrl);
    
    const response = await fetch(backendUrl);
    
    console.log('[Image Proxy] Backend status:', response.status);
    
    if (!response.ok) {
      console.error(`[Image Proxy] Backend returned ${response.status} for ${backendUrl}`);
      return res.status(response.status).json({ error: 'Not found' });
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();
    
    console.log('[Image Proxy] Serving image, size:', buffer.byteLength, 'bytes');
    
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.end(Buffer.from(buffer));
  } catch (error) {
    console.error('[Image Proxy] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch image' });
  }
}
