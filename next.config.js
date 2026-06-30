/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Optimize images for performance
  images: {
    domains: ['localhost', 'images.unsplash.com', 'renewablezmart-backend.onrender.com', 'res.cloudinary.com', 'renewablezmart.s3.eu-west-2.amazonaws.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://renewablezmart-backend.onrender.com/api',
  },
  // Enable compression for faster downloads
  compress: true,
  // Optimize bundles
  webpack: (config, { isServer }) => {
    return config;
  },
  // Security headers to prevent XSS, clickjacking, and MIME sniffing + performance caching
  async headers() {
    return [
      {
        // Service Worker should not be cached to ensure updates
        source: '/service-worker.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        // Cache static assets for 1 year
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache images for 1 year
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache fonts for 1 year
        source: '/:path*.{woff,woff2,ttf,eot}',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // HTML pages - revalidate frequently
        source: '/:path*.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'accelerometer=(), camera=(), microphone=(), geolocation=(self), usb=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' http: https: blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: https://js.paystack.co https://api.paystack.co https://checkout.paystack.com https://*.paystack.co https://paystack.com https://cdn.jsdelivr.net; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' http: https: https://js.paystack.co https://api.paystack.co https://checkout.paystack.com https://*.paystack.co https://paystack.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' http: https: https://fonts.googleapis.com https://*.paystack.co https://paystack.com https://cdn.jsdelivr.net; style-src-elem 'self' 'unsafe-inline' http: https: https://fonts.googleapis.com https://*.paystack.co https://paystack.com https://cdn.jsdelivr.net; font-src 'self' data: http: https: https://fonts.gstatic.com; img-src 'self' data: http: https: blob: https://renewablezmart.s3.eu-west-2.amazonaws.com; frame-src 'self' http: https: https://checkout.paystack.com https://*.paystack.co https://paystack.com; connect-src 'self' http: https: ws: wss: blob: https://api.paystack.co https://*.paystack.co https://paystack.com https://renewablezmart-backend.onrender.com http://localhost:4000 http://192.168.100.20:4000 https://flagcdn.com https://res.cloudinary.com https://renewablezmart.s3.eu-west-2.amazonaws.com; media-src 'self' http: https: blob: https://renewablezmart.s3.eu-west-2.amazonaws.com; object-src 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
    ];
  },
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@components', '@lib'],
  },
}
module.exports = nextConfig
