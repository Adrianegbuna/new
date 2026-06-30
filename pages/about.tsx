import Head from 'next/head'
import Header from '../components/Header'
import Link from 'next/link'
import { useState, useEffect } from 'react'

interface Stats {
  products: number
  vendors: number
  installers: number
  customers: number
  stores: number
}

export default function About() {
  const [stats, setStats] = useState<Stats>({
    products: 0,
    vendors: 0,
    installers: 0,
    customers: 0,
    stores: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { getApiBaseUrl } = await import('@/lib/apiConfig')
        const baseUrl = getApiBaseUrl()
        const response = await fetch(`${baseUrl}/admin/stats/public`)
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <>
      <Head>
        <title>About Us - RenewableZmart</title>
        <meta name="description" content="Learn about RenewableZmart - Your trusted marketplace for sustainable energy products and certified installers across Africa." />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="container mx-auto px-4 py-12" style={{ fontFamily: "'Century Gothic', 'CenturyGothic', 'AppleGothic', sans-serif" }}>
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">RenewableZmart</span>
            </h1>
            <p className="text-xl text-gray-900 font-bold max-w-4xl mx-auto leading-relaxed">
                Powered by <span className="font-semibold text-emerald-600">Vemakt International Ltd</span>, we are Nigeria's pioneering marketplace exclusively dedicated to renewable energy solutions. Our platform eliminates the stress and uncertainty of traditional in person bargaining by bringing verified Dealers and consumers together in a transparent digital space where affordability meets reliability.
            </p>
          </div>

          {/* Introduction Section */}
          <div className="bg-white rounded-lg shadow-xl p-8 md:p-12 mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">About RenewableZmart</h2>
            <div className="space-y-4 text-gray-900 leading-relaxed font-semibold">
              <p>
                RenewableZmart is Nigeria's first purpose built digital marketplace focused exclusively on clean energy commerce. We've created a platform that removes traditional barriers: unclear pricing, fragmented supplier networks, and inefficient negotiation processes, making it simple to access inverters, batteries, solar panels, solar lights, solar home systems, and professional installation services.
              </p>
              <p>
                Through our innovative Pay Small Small payment plans, structured pricing transparency, and rigorous vendor verification, we enable households, businesses, and institutions to transition to sustainable energy without heavy upfront costs. Our standardized processes create a secure environment that supports vendor growth while ensuring consumers can confidently invest in energy independence.
              </p>
              <p>
                By establishing this trusted ecosystem, RenewableZmart drives widespread adoption of clean energy solutions for personal resilience, social progress, economic development, and environmental protection.
              </p>
            </div>
          </div>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-black leading-relaxed">
                To be the pioneering and leading renewable energy marketplace that transforms how consumers and vendors engage, making clean energy affordable, accessible, and free from the inefficiencies of traditional in person negotiation.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-black leading-relaxed">
                To provide a trusted digital marketplace in Nigeria exclusively serving the renewable energy sector, connecting verified vendors and consumers, removing negotiation barriers, promoting affordability through innovative payment solutions like Pay Small Small, and supporting widespread adoption of sustainable energy for personal, social, economic, and environmental resilience.
              </p>
            </div>
          </div>

          {/* What We Do */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-xl p-8 md:p-12 mb-16 text-white">
            <h2 className="text-3xl font-bold mb-6 text-center">What We Offer</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-5xl mb-4">🏪</div>
                <h3 className="text-xl font-bold mb-2">Verified Vendor Network</h3>
                <p className="text-emerald-50">
                  Showcasing quality inverters, batteries, solar panels, solar lights, and solar home systems from rigorously verified suppliers with transparent pricing, eliminating uncertainty.
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4">🔧</div>
                <h3 className="text-xl font-bold mb-2">Professional Installation</h3>
                <p className="text-emerald-50">
                  Certified, experienced technicians providing expert setup and maintenance for complete energy system deployment with confidence.
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-4">💳</div>
                <h3 className="text-xl font-bold mb-2">Pay Small Small Plans</h3>
                <p className="text-emerald-50">
                  Structured installment options removing heavy upfront costs, making clean energy accessible without financial strain.
                </p>
              </div>
            </div>
          </div>

          {/* Why Choose Us */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Why Choose RenewableZmart?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">No Negotiation Stress</h3>
                <p className="text-sm text-gray-900 font-bold">Eliminating traditional in person bargaining hassles with clear, upfront pricing on all products.</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Rigorous Verification</h3>
                <p className="text-sm text-gray-900 font-bold">Thoroughly vetted suppliers ensuring genuine, high performance energy solutions.</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Standardized Processes</h3>
                <p className="text-sm text-black font-bold">Streamlined purchasing with consistent procedures creating secure, efficient transactions.</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Round the Clock Support</h3>
                <p className="text-sm text-gray-900 font-bold">Dedicated assistance available whenever you need help with your energy journey.</p>
              </div>
            </div>
          </div>

          {/* Our Values */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Core Values</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-emerald-600 mb-3">🌱 Sustainability</h3>
                <p className="text-gray-900 font-bold">
                  We're committed to promoting clean energy solutions that reduce carbon footprint and protect our environment for future generations.
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-blue-600 mb-3">🤝 Trust & Integrity</h3>
                <p className="text-black font-bold">
                  We build lasting relationships through transparency, honesty, and delivering on our promises to customers and partners.
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-purple-600 mb-3">💡 Innovation</h3>
                <p className="text-black font-bold">
                  We continuously improve our platform and services to provide the best renewable energy marketplace experience.
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-orange-600 mb-3">👥 Customer First</h3>
                <p className="text-black font-bold">
                  Your satisfaction is our priority. We go above and beyond to ensure you have a seamless shopping experience.
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-teal-600 mb-3">✅ Quality Assurance</h3>
                <p className="text-black font-bold">
                  We maintain high standards for all products and services on our platform through rigorous vendor verification.
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-indigo-600 mb-3">♤️ Accessibility</h3>
                <p className="text-black font-bold">
                  Making renewable energy affordable and accessible to everyone through flexible payment options and competitive pricing.
                </p>
              </div>
            </div>
          </div>

          {/* Contact CTA */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Go Solar?</h2>
            <p className="text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who have made the switch to clean, renewable energy with RenewableZmart.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/" className="bg-white text-emerald-600 px-8 py-3 rounded-lg font-bold hover:bg-emerald-50 transition">
                Browse Products
              </Link>
              <Link href="/installers" className="bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold hover:bg-emerald-800 transition border-2 border-white">
                Find Installer
              </Link>
              <a href="tel:+2349022298109" className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-900 transition">
                ☎️ Call Us: +234 902 229 8109
              </a>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-12 text-center">
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">✏️ Email</h3>
                <a href="mailto:support@renewablezmart.com" className="text-emerald-600 hover:text-emerald-700">
                  support@renewablezmart.com
                </a>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">☎️ Phone</h3>
                <a href="tel:+2349022298109" className="text-emerald-600 hover:text-emerald-700">
                  +234 902 229 8109
                </a>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">📍 Location</h3>
                <p className="text-black font-bold">Serving All African Countries</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}



