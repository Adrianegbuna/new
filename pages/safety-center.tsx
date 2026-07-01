import Link from 'next/link'
import Header from "@/components/layout/Header";

const protectCards = [
  {
    title: 'Protect your data',
    description: 'Use strong passwords and avoid sharing personal details in messages.',
    icon: '🔒',
  },
  {
    title: 'Protect your account',
    description: 'Enable secure login habits and log out on shared devices.',
    icon: '🛡️',
  },
  {
    title: 'Protect your payment',
    description: 'Always pay through RenewableZmart checkout to stay protected.',
    icon: '💳',
  },
]

const scamCards = [
  {
    title: 'Recognize scams',
    description: 'Be wary of requests to pay outside the platform.',
    icon: '⚠️',
  },
  {
    title: 'Recognize scam emails',
    description: 'Check sender addresses and avoid suspicious links.',
    icon: '✉️',
  },
  {
    title: 'Recognize scam messages',
    description: 'Don’t share OTPs, passwords, or bank details.',
    icon: '💬',
  },
]

const safetyTips = [
  'Review product details, specifications, and vendor ratings.',
  'Confirm warranty and return details for high‑value items.',
  'Keep communication and payments on the platform.',
  'Report suspicious listings or vendor behavior quickly.',
]

export default function SafetyCenter() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-[#f4fff8] via-white to-[#f7fafc]">
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-600">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="max-w-2xl text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-100 font-semibold">Safety Center</p>
                <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-tight">
                  Stay safe while shopping on RenewableZmart
                </h1>
                <p className="mt-4 text-lg text-emerald-50 leading-relaxed">
                  We are committed to creating a trusted marketplace. Learn how we protect your information and how you can stay safe from scams.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/report-vendor" className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-white text-emerald-800 font-bold shadow hover:shadow-lg transition">
                    Report suspicious activity
                  </Link>
                  <Link href="/help#contact" className="inline-flex items-center justify-center px-5 py-3 rounded-full border border-emerald-100 text-white font-bold hover:bg-emerald-700 transition">
                    Contact Support
                  </Link>
                </div>
              </div>
              <div className="relative w-full max-w-xs sm:max-w-sm">
                <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-emerald-400/30 blur-2xl" />
                <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-green-300/30 blur-2xl" />
                <div className="bg-white/10 border border-white/20 rounded-3xl p-6 backdrop-blur">
                  <div className="h-36 w-36 mx-auto rounded-3xl bg-white/20 flex items-center justify-center text-6xl">
                    ✅
                  </div>
                  <p className="mt-4 text-center text-emerald-50 font-semibold">
                    Security you can trust
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-10 space-y-12">
            <section>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Protect your information</h2>
                <div className="text-sm text-emerald-700 font-semibold">Updated March 2026</div>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {protectCards.map((card) => (
                  <div key={card.title} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl">
                        {card.icon}
                      </div>
                      <span className="text-emerald-500 text-xl">›</span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-gray-900">{card.title}</h3>
                    <p className="mt-2 text-sm text-gray-600">{card.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">Stay safe from scammers</h2>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {scamCards.map((card) => (
                  <div key={card.title} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl">
                        {card.icon}
                      </div>
                      <span className="text-emerald-500 text-xl">›</span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-gray-900">{card.title}</h3>
                    <p className="mt-2 text-sm text-gray-600">{card.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl bg-emerald-50 border border-emerald-100 p-6">
                <h3 className="text-xl font-bold text-emerald-900">Quick safety checklist</h3>
                <ul className="mt-4 space-y-3 text-emerald-900 text-sm">
                  {safetyTips.map((tip) => (
                    <li key={tip} className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-600" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900">Need help fast?</h3>
                <p className="mt-3 text-sm text-gray-600">
                  Reach our support team for urgent safety concerns.
                </p>
                <div className="mt-5 space-y-3">
                  <Link href="/help#contact" className="block w-full text-center px-4 py-3 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition">
                    Contact Support
                  </Link>
                  <Link href="/report-vendor" className="block w-full text-center px-4 py-3 rounded-full border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50 transition">
                    Report a listing
                  </Link>
                  <a href="mailto:support@renewablezmart.com" className="block text-center text-sm text-gray-600 hover:text-emerald-700">
                    support@renewablezmart.com
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
