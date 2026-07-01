import React, { useState } from 'react'
import Link from 'next/link'
import { FaInstagram, FaFacebook, FaXTwitter, FaTiktok, FaYoutube } from 'react-icons/fa6'

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()
  const [openSection, setOpenSection] = useState<'company' | 'service' | 'help' | null>('help')

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    // Placeholder for future navigation
  }

  return (
    <footer className="bg-gray-900 text-gray-300 font-semibold">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Company Info */}
          <div>
            <h3 className="text-green-500 font-bold text-base mb-6 uppercase tracking-wide">Company info</h3>
            <ul className="space-y-3 text-sm">
              <li><a href="#" onClick={handleLinkClick} className="hover:text-white transition cursor-pointer">Affiliate & Influencer Program: Join to Earn</a></li>
              <li><Link href="/about" className="hover:text-white transition">About RenewableZmart</Link></li>
              <li><a href="#" onClick={handleLinkClick} className="hover:text-white transition cursor-pointer">Partner with RenewableZmart</a></li>
              <li><Link href="/help#contact" className="hover:text-white transition">Contact us</Link></li>
              <li><a href="#" onClick={handleLinkClick} className="hover:text-white transition cursor-pointer">Careers</a></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-green-500 font-bold text-base mb-6 uppercase tracking-wide">Customer service</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/help#returns" className="hover:text-white transition">Return and refund policy</Link></li>
              <li><Link href="/intellectual-property" className="hover:text-white transition">Intellectual property policy</Link></li>
              <li><Link href="/help#shipping" className="hover:text-white transition">Shipping info</Link></li>
              <li><Link href="/report-vendor" className="hover:text-white transition">Report</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-green-500 font-bold text-base mb-6 uppercase tracking-wide">Help</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/help" className="hover:text-white transition">Support center & FAQ</Link></li>
              <li><Link href="/safety-center" className="hover:text-white transition">Safety center</Link></li>
              <li><Link href="/help" className="hover:text-white transition">RenewableZmart purchase protection</Link></li>
              <li><Link href="/sitemap" className="hover:text-white transition">Sitemap</Link></li>
            </ul>
          </div>
        </div>

        {/* Mobile Collapsible Footer */}
        <div className="md:hidden border-t border-gray-800 pt-6">
          <div className="divide-y divide-gray-800">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'company' ? null : 'company')}
              className="w-full flex items-center justify-between py-4 text-left"
              aria-expanded={openSection === 'company'}
            >
              <span className="text-white font-bold text-base">Company info</span>
              <span className="text-white text-xl">{openSection === 'company' ? '^' : 'v'}</span>
            </button>
            {openSection === 'company' && (
              <ul className="pb-4 space-y-3 text-sm">
                <li><a href="#" onClick={handleLinkClick} className="hover:text-white transition cursor-pointer">Affiliate & Influencer Program: Join to Earn</a></li>
                <li><Link href="/about" className="hover:text-white transition">About RenewableZmart</Link></li>
                <li><a href="#" onClick={handleLinkClick} className="hover:text-white transition cursor-pointer">Partner with RenewableZmart</a></li>
                <li><Link href="/help#contact" className="hover:text-white transition">Contact us</Link></li>
                <li><a href="#" onClick={handleLinkClick} className="hover:text-white transition cursor-pointer">Careers</a></li>
              </ul>
            )}

            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'service' ? null : 'service')}
              className="w-full flex items-center justify-between py-4 text-left"
              aria-expanded={openSection === 'service'}
            >
              <span className="text-white font-bold text-base">Customer service</span>
              <span className="text-white text-xl">{openSection === 'service' ? '^' : 'v'}</span>
            </button>
            {openSection === 'service' && (
              <ul className="pb-4 space-y-3 text-sm">
                <li><Link href="/help#returns" className="hover:text-white transition">Return and refund policy</Link></li>
                <li><Link href="/intellectual-property" className="hover:text-white transition">Intellectual property policy</Link></li>
                <li><Link href="/help#shipping" className="hover:text-white transition">Shipping info</Link></li>
                <li><Link href="/report-vendor" className="hover:text-white transition">Report</Link></li>
              </ul>
            )}

            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'help' ? null : 'help')}
              className="w-full flex items-center justify-between py-4 text-left"
              aria-expanded={openSection === 'help'}
            >
              <span className="text-white font-bold text-base">Help</span>
              <span className="text-white text-xl">{openSection === 'help' ? '^' : 'v'}</span>
            </button>
            {openSection === 'help' && (
              <ul className="pb-4 space-y-3 text-sm">
                <li><Link href="/help" className="hover:text-white transition">Support center & FAQ</Link></li>
                <li><Link href="/safety-center" className="hover:text-white transition">Safety center</Link></li>
                <li><Link href="/help" className="hover:text-white transition">RenewableZmart purchase protection</Link></li>
                <li><Link href="/sitemap" className="hover:text-white transition">Sitemap</Link></li>
              </ul>
            )}
          </div>

          <div className="border-t border-gray-800 pt-6 mt-4">
            <div className="flex justify-center gap-6 text-2xl">
              <a href="https://instagram.com/renewablezmart" className="text-gray-400 hover:text-pink-500 transition">
                <FaInstagram />
              </a>
              <a href="https://facebook.com/renewablezmart" className="text-gray-400 hover:text-blue-600 transition">
                <FaFacebook />
              </a>
              <a href="https://twitter.com/renewablezmart" className="text-gray-400 hover:text-gray-100 transition">
                <FaXTwitter />
              </a>
              <a href="https://tiktok.com/@renewablezmart" className="text-gray-400 hover:text-white transition">
                <FaTiktok />
              </a>
              <a href="https://youtube.com/renewablezmart" className="text-gray-400 hover:text-red-600 transition">
                <FaYoutube />
              </a>
            </div>
          </div>
        </div>

        {/* Connect with RenewableZmart */}
        <div className="hidden md:block border-t border-gray-800 pt-8">
          <div>
            <h3 className="text-white font-bold text-base mb-4 uppercase tracking-wide">Connect with RenewableZmart</h3>
            <div className="flex gap-6 text-2xl">
              <a href="https://instagram.com/renewablezmart" className="text-gray-400 hover:text-pink-500 transition">
                <FaInstagram />
              </a>
              <a href="https://facebook.com/renewablezmart" className="text-gray-400 hover:text-blue-600 transition">
                <FaFacebook />
              </a>
              <a href="https://twitter.com/renewablezmart" className="text-gray-400 hover:text-gray-100 transition">
                <FaXTwitter />
              </a>
              <a href="https://tiktok.com/@renewablezmart" className="text-gray-400 hover:text-white transition">
                <FaTiktok />
              </a>
              <a href="https://youtube.com/renewablezmart" className="text-gray-400 hover:text-red-600 transition">
                <FaYoutube />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="bg-gray-950 py-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-white font-semibold">
            © RenewableZmart. All rights reserved. | Simplifying Clean Energy Market
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
