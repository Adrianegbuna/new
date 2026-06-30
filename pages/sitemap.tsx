import Link from 'next/link'
import Header from '../components/Header'

const categoryColumns = [
  {
    title: 'Solar & Power',
    items: [
      'Solar Panels',
      'Inverters',
      'Batteries & Storage',
      'Charge Controllers',
      'Solar Accessories',
      'Cables & Wiring',
      'Mounting & Racks',
      'Power Backup Systems',
    ],
  },
  {
    title: 'Energy Appliances',
    items: [
      'Energy‑Efficient TVs',
      'Refrigerators',
      'Fans & Cooling',
      'Lighting & Bulbs',
      'Pumps & Borehole',
      'Kitchen Appliances',
      'Laundry Appliances',
      'Smart Meters',
    ],
  },
  {
    title: 'Smart Home',
    items: [
      'Security & Surveillance',
      'Smart Locks',
      'Smart Lighting',
      'Smart Plugs',
      'Home Automation',
      'Sensors & Alarms',
      'Networking & Wi‑Fi',
      'Energy Monitors',
    ],
  },
  {
    title: 'EV & Mobility',
    items: [
      'Electric Vehicles',
      'EV Chargers',
      'Charging Cables',
      'EV Batteries',
      'Scooters & Bikes',
      'EV Accessories',
      'Maintenance Kits',
      'Spare Parts',
    ],
  },
]

const sitemapSections = [
  {
    title: 'Shop',
    links: [
      { label: 'Products', href: '/products' },
      { label: 'Deals', href: '/deals' },
      { label: 'Flash Deals', href: '/flash-deals' },
      { label: 'Stores', href: '/stores' },
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'Cart', href: '/cart' },
      { label: 'Wishlist', href: '/wishlist' },
      { label: 'Track Order', href: '/track-order' },
      { label: 'Returns', href: '/returns' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Service Requests', href: '/service-requests' },
      { label: 'Installers', href: '/installers' },
      { label: 'Authorized Dealers', href: '/authorized-dealers' },
      { label: 'Projects', href: '/projects' },
      { label: 'Calculator', href: '/calculator' },
      { label: 'Swap & Sell', href: '/swap-sell' },
      { label: 'Swap & Resale', href: '/swap-resale' },
    ],
  },
  {
    title: 'Accounts',
    links: [
      { label: 'Login', href: '/login' },
      { label: 'Register', href: '/register' },
      { label: 'My Profile', href: '/profile' },
      { label: 'My Orders', href: '/orders' },
      { label: 'Messages', href: '/messages' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Account Details', href: '/account-details' },
      { label: 'Reset Password', href: '/reset-password' },
    ],
  },
  {
    title: 'Help & Safety',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'FAQs', href: '/faq' },
      { label: 'Safety Center', href: '/safety-center' },
      { label: 'Report', href: '/report-vendor' },
      { label: 'Purchase Protection', href: '/help' },
      { label: 'Contact Support', href: '/help#contact' },
      { label: 'Track an Order Help', href: '/help#track' },
      { label: 'Payment Options Help', href: '/help#payment' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About RenewableZmart', href: '/about' },
      { label: 'Vendors', href: '/vendors' },
      { label: 'Dealers', href: '/dealers' },
      { label: 'EV Stores', href: '/ev-stores' },
      { label: 'Installers', href: '/installers' },
      { label: 'Services', href: '/services' },
      { label: 'Shop', href: '/shop' },
    ],
  },
  {
    title: 'Legal & Policies',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Intellectual Property Policy', href: '/intellectual-property' },
      { label: 'Disputes', href: '/disputes' },
      { label: 'Contact Admin', href: '/contact-admin' },
    ],
  },
]

export default function SiteMap() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Sitemap</h1>
            <p className="text-black text-lg">
              Browse categories and jump to any page on RenewableZmart.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Categories</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {categoryColumns.map((column) => (
                  <div key={column.title} className="space-y-3">
                    <Link href="/products" className="text-base font-bold text-gray-900 hover:text-teal-600">
                      {column.title}
                    </Link>
                    <div className="space-y-2">
                      {column.items.map((item) => (
                        <div key={item} className="text-sm text-gray-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Explore</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sitemapSections.map((section) => (
                  <div key={section.title} className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
                    <div className="space-y-2">
                      {section.links.map((link) => (
                        <Link key={link.href} href={link.href} className="block text-sm text-teal-700 hover:underline">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
