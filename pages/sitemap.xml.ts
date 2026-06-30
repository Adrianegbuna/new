import type { GetServerSideProps } from 'next'

const SITE_URL = 'https://renewablezmart.com'

const STATIC_PATHS = [
  '/',
  '/about',
  '/products',
  '/deals',
  '/flash-deals',
  '/stores',
  '/stores/all',
  '/marketplace',
  '/cart',
  '/wishlist',
  '/track-order',
  '/returns',
  '/service-requests',
  '/installers',
  '/installers/all',
  '/projects',
  '/calculator',
  '/swap-sell',
  '/swap-resale',
  '/login',
  '/register',
  '/orders',
  '/messages',
  '/notifications',
  '/account-details',
  '/help',
  '/faq',
  '/safety-center',
  '/report-vendor',
  '/vendors',
  '/dealers',
  '/ev-stores',
  '/services',
  '/shop',
  '/terms',
  '/privacy',
  '/intellectual-property',
  '/disputes',
  '/contact-admin',
  '/sitemap',
]

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const buildSitemapXml = () => {
  const now = new Date().toISOString()
  const urls = Array.from(new Set(STATIC_PATHS))
    .map((path) => {
      const loc = `${SITE_URL}${path}`
      return [
        '<url>',
        `<loc>${escapeXml(loc)}</loc>`,
        `<lastmod>${now}</lastmod>`,
        '<changefreq>daily</changefreq>',
        '<priority>0.7</priority>',
        '</url>',
      ].join('')
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const xml = buildSitemapXml()
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(xml)
  res.end()

  return { props: {} }
}

export default function SitemapXml() {
  return null
}

