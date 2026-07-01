import Head from 'next/head'
import Header from '@/components/layout/Header'
import Link from 'next/link'

export default function HelpCenter() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Head>
        <title>Help Center - RenewableZmart</title>
        <meta name="description" content="Get help with your orders and account" />
      </Head>
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
            </div>
            <p className="text-gray-900 font-bold">How can we help you today?</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Link href="/faq">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">❓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">FAQs</h3>
                    <p className="text-sm text-gray-900 font-bold">Find quick answers to common questions</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/help#place-order">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🛒</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Place an Order</h3>
                    <p className="text-sm text-gray-900 font-bold">Learn how to browse products and complete your purchase</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/help#payment">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">💳</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Payment Options</h3>
                    <p className="text-sm text-gray-900 font-bold">View available payment methods and Pay Small Small plans</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/orders">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📦</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Track an Order</h3>
                    <p className="text-sm text-gray-900 font-bold">Check the status of your order and delivery</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/help#cancel-order">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">❌</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Cancel an Order</h3>
                    <p className="text-sm text-gray-900 font-bold">Learn how to cancel or modify your order</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/help#returns">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">↩️</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Returns & Refunds</h3>
                    <p className="text-sm text-gray-900 font-bold">Information about our return policy and refund process</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="space-y-6">
            <div id="place-order" className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">How to Place an Order</h2>
              <div className="space-y-4 text-gray-900 font-semibold">
                <div>
                  <h3 className="font-semibold mb-2">1. Browse Products</h3>
                  <p className="text-sm">Navigate through our categories or use the search bar to find the renewable energy products you need.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">2. Add to Cart</h3>
                  <p className="text-sm">Click "Add to Cart" on any product. Review your cart by clicking the cart icon in the header.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">3. Checkout</h3>
                  <p className="text-sm">Click "Proceed to Checkout", fill in your delivery details, and choose your payment method.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">4. Complete Payment</h3>
                  <p className="text-sm">Select from our payment options including Pay Small Small for flexible installments.</p>
                </div>
              </div>
            </div>

            <div id="payment" className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Payment Options</h2>
              <div className="space-y-4 text-gray-900 font-semibold">
                <div>
                  <h3 className="font-semibold mb-2">Full Payment</h3>
                  <p className="text-sm">Pay the complete amount using credit/debit cards, bank transfer, or bank deposit.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Pay Small Small (Installments)</h3>
                  <p className="text-sm">Current installment rules:</p>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li>50% upfront payment is required for all Pay Small Small plans</li>
                    <li>NGN 750,000 - NGN 1,500,000: balance spread across 3 months</li>
                    <li>Below NGN 750,000 or above NGN 1,500,000: balance spread across 6 months</li>
                    <li>0% interest and no hidden charges</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Supported Payment Methods</h3>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    <li>Paystack (cards and bank transfer)</li>
                    <li>Bank deposit</li>
                  </ul>
                </div>
              </div>
            </div>

            <div id="track" className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Track an Order</h2>
              <div className="space-y-4 text-gray-900 font-semibold">
                <p className="text-sm">Track your order status and delivery progress in real-time.</p>
                <div>
                  <h3 className="font-semibold mb-2">How to Track:</h3>
                  <ol className="list-decimal list-inside text-sm space-y-2">
                    <li>Visit the <Link href="/track-order" className="text-blue-600 hover:underline">Track Order</Link> page</li>
                    <li>Enter your Order ID (found in your confirmation email)</li>
                    <li>Click "Track Order" to see real-time status</li>
                  </ol>
                </div>
              </div>
            </div>

            <div id="cancel-order" className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Cancel an Order</h2>
              <div className="space-y-4 text-gray-900 font-semibold">
                <p className="text-sm">Orders can be cancelled within 24 hours of placement if they have not been shipped.</p>
                <div>
                  <h3 className="font-semibold mb-2">How to Cancel:</h3>
                  <ol className="list-decimal list-inside text-sm space-y-2">
                    <li>Go to <Link href="/orders" className="text-blue-600 hover:underline">My Orders</Link></li>
                    <li>Find the order you want to cancel</li>
                    <li>Click "Cancel Order" button</li>
                    <li>Provide a reason for cancellation</li>
                    <li>Confirm cancellation</li>
                  </ol>
                </div>
              </div>
            </div>

            <div id="returns" className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Returns & Refunds</h2>
              <div className="space-y-4 text-gray-900 font-semibold">
                <p className="text-sm">We offer a 14-day return policy for unused products in original packaging.</p>
                <p className="text-sm bg-blue-50 border-l-4 border-blue-400 p-3">
                  <strong>Refund Timeline:</strong> 7-14 business days after approval.
                </p>
              </div>
            </div>

            <div id="contact" className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
              <div className="space-y-3 text-black font-bold">
                <p className="text-sm">
                  <strong>Email:</strong> <a href="mailto:support@renewablezmart.com" className="text-blue-600 hover:underline">support@renewablezmart.com</a>
                </p>
                <p className="text-sm">
                  <strong>Phone:</strong> <a href="tel:+2349022298109" className="text-blue-600 hover:underline">+234 902 229 8109</a>
                </p>
                <p className="text-sm">
                  <strong>Hours:</strong> Monday - Friday: 9:00 AM - 6:00 PM (WAT)
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
