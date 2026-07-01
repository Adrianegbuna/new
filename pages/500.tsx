import Link from 'next/link'
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function ServerError() {
  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <h1 className="text-8xl font-bold text-black mb-4">500</h1>
            <h2 className="text-3xl font-bold text-black mb-4">Server Error</h2>
            <p className="text-black font-bold text-lg mb-8">
              Oops! Something went wrong on our end. Our team has been notified and we're working to fix it.
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
                Continue Shopping
              </button>
            </Link>
            <Link href="/contact-admin">
              <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-lg transition">
                Report This Issue
              </button>
            </Link>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-400">
            <p className="text-black font-bold text-sm mb-2">Error ID: {new Date().getTime()}</p>
            <p className="text-black font-bold text-xs">Please reference this ID when contacting support</p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}



