import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function NotFound() {
  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <h1 className="text-8xl font-bold text-black mb-4">404</h1>
            <h2 className="text-3xl font-bold text-black mb-4">Page Not Found</h2>
            <p className="text-black font-bold text-lg mb-8">
              Sorry, the page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="space-y-4">
            <Link href="/">
              <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition">
                Go to Home
              </button>
            </Link>
            <Link href="/shop">
              <button className="w-full bg-slate-900 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-lg transition">
                Browse Products
              </button>
            </Link>
            <Link href="/contact-admin">
              <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-lg transition">
                Contact Support
              </button>
            </Link>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-400">
            <p className="text-black font-bold text-sm mb-4">Popular Pages:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/shop">
                <span className="text-black font-bold text-sm bg-white px-3 py-2 rounded hover:bg-gray-200 cursor-pointer">
                  Shop
                </span>
              </Link>
              <Link href="/about">
                <span className="text-black font-bold text-sm bg-white px-3 py-2 rounded hover:bg-gray-200 cursor-pointer">
                  About
                </span>
              </Link>
              <Link href="/help">
                <span className="text-black font-bold text-sm bg-white px-3 py-2 rounded hover:bg-gray-200 cursor-pointer">
                  Help
                </span>
              </Link>
              <Link href="/installers">
                <span className="text-black font-bold text-sm bg-white px-3 py-2 rounded hover:bg-gray-200 cursor-pointer">
                  Installers
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}



