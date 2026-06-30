import { useState } from 'react'
import Header from '../components/Header'
import Link from 'next/link'

export default function Terms() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-black text-lg">
              Last updated: January 2, 2026
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
            
            {/* Acceptance */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-black leading-relaxed">
                By accessing and using the RenewableZmart website, mobile applications, and services (collectively, the "Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this Service.
              </p>
            </section>

            {/* Use License */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Use License</h2>
              <p className="text-black mb-3">RenewableZmart grants you a limited, non-exclusive, non-transferable license to:</p>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>Access and use our Service for lawful purposes</li>
                <li>View content for personal, non-commercial use</li>
                <li>Create an account and conduct transactions</li>
              </ul>
              <p className="text-black mt-3">You agree NOT to:</p>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>Modify, copy, or distribute content without permission</li>
                <li>Remove any proprietary notices or labels</li>
                <li>Use the Service for commercial purposes without authorization</li>
                <li>Access the Service through automated means (bots, scrapers)</li>
                <li>Attempt to gain unauthorized access</li>
                <li>Transmit malicious code or harmful content</li>
              </ul>
            </section>

            {/* Account Registration */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Account Registration</h2>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3">Account Creation</h3>
              <p className="text-black">
                To use certain features, you must create an account by providing accurate, complete, and current information. You are responsible for maintaining the confidentiality of your password and account information.
              </p>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-4">Account Responsibility</h3>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>You are responsible for all activities under your account</li>
                <li>You must immediately notify us of unauthorized access</li>
                <li>You agree not to share your account credentials</li>
                <li>You must be at least 18 years old to create an account</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-4">Vendor and Installer Accounts</h3>
              <p className="text-black">
                If you register as a vendor or installer, you agree to provide accurate business and professional information. We may verify your credentials and reject applications that fail verification.
              </p>
            </section>

            {/* Product Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Product Information and Pricing</h2>
              
              <h3 className="text-lg font-bold text-gray-900 mb-3">Accuracy</h3>
              <p className="text-black">
                We strive to provide accurate product descriptions, images, and pricing. However, we do not warrant that all product descriptions, pricing, availability, or other content is accurate, complete, reliable, current, or error-free. If a product is listed at an incorrect price, we reserve the right to refuse or cancel any orders.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Price Changes</h3>
              <p className="text-black">
                We reserve the right to modify prices at any time. Price changes apply to new orders placed after the change is posted.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Product Availability</h3>
              <p className="text-black">
                Products are subject to availability. We reserve the right to limit quantities and discontinue products at our discretion.
              </p>
            </section>

            {/* Orders and Transactions */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Orders and Transactions</h2>
              
              <h3 className="text-lg font-bold text-gray-900 mb-3">Order Acceptance</h3>
              <p className="text-black">
                Your order is an offer to purchase. We reserve the right to refuse, cancel, or limit any order for any reason, including suspected fraud or violation of these terms.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Payment</h3>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>You authorize us to charge your payment method for orders placed</li>
                <li>Payment processing is handled by Paystack</li>
                <li>You are responsible for ensuring payment information is accurate</li>
                <li>All prices are in Nigerian Naira (NGN) unless otherwise specified</li>
                <li>Applicable taxes and fees will be added to your order</li>
              </ul>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Shipping and Delivery</h3>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>Delivery timeframes are estimates and not guarantees</li>
                <li>Risk of loss passes to you upon delivery</li>
                <li>You are responsible for receiving deliveries</li>
                <li>Shipping costs will be calculated and displayed before checkout</li>
              </ul>
            </section>

            {/* Returns and Refunds */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Returns and Refunds</h2>
              
              <p className="text-black mb-3">Our return and refund policy is as follows:</p>
              
              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Return Eligibility</h3>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>Items must be returned within 14 days of purchase</li>
                <li>Items must be unused and in original packaging</li>
                <li>Proof of purchase (order confirmation) is required</li>
                <li>Some items may be non-returnable (as indicated in product listing)</li>
              </ul>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Return Process</h3>
              <ol className="list-decimal list-inside text-black space-y-2">
                <li>Contact customer support with your order number</li>
                <li>Receive return authorization and shipping instructions</li>
                <li>Ship the item to the address provided (at your expense)</li>
                <li>We will inspect the item upon receipt</li>
                <li>Refund will be processed within 7-10 business days</li>
              </ol>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Refunds</h3>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>Refunds will be credited to the original payment method</li>
                <li>Refund processing may take 7-10 business days</li>
                <li>Shipping costs are non-refundable unless return is due to our error</li>
                <li>Damaged items due to improper handling are not eligible for refund</li>
              </ul>
            </section>

            {/* Vendor and Installer Terms */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Vendor and Installer Terms</h2>
              
              <h3 className="text-lg font-bold text-gray-900 mb-3">Vendor Obligations</h3>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>Provide accurate product descriptions and images</li>
                <li>Maintain adequate inventory of listed products</li>
                <li>Respond to customer inquiries within 24 hours</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Maintain professional conduct and communication</li>
                <li>Fulfill orders as described</li>
              </ul>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Installer Obligations</h3>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>Provide services as agreed with customers</li>
                <li>Maintain certifications and professional qualifications</li>
                <li>Carry appropriate insurance coverage</li>
                <li>Follow all safety standards and regulations</li>
                <li>Provide professional and courteous service</li>
                <li>Complete work within agreed timelines</li>
              </ul>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Commission and Fees</h3>
              <p className="text-black">
                Vendors and installers agree to pay applicable fees and commissions as displayed in their account settings. Fees may be deducted from customer payments or billed separately.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Suspension and Termination</h3>
              <p className="text-black">
                We may suspend or terminate vendor and installer accounts for violation of these terms, poor performance, fraud, or other legitimate reasons. Account suspension will result in inability to process new orders and transactions.
              </p>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Intellectual Property Rights</h2>
              
              <p className="text-black mb-3">
                All content on the Service, including text, graphics, logos, images, and software, is the property of RenewableZmart or its content suppliers and is protected by international copyright laws.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">User Content</h3>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>You retain ownership of content you create (reviews, images, etc.)</li>
                <li>You grant RenewableZmart a license to use, reproduce, and display your content</li>
                <li>You represent that your content does not infringe third-party rights</li>
                <li>You are responsible for your content and its accuracy</li>
              </ul>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Prohibited Uses</h3>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>Do not reproduce, duplicate, or copy content for commercial purposes</li>
                <li>Do not modify, adapt, or translate content</li>
                <li>Do not reverse engineer or decompile our software</li>
                <li>Do not use our trademarks or branding without permission</li>
              </ul>
            </section>

            {/* User Conduct */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. User Conduct</h2>
              
              <p className="text-black mb-3">You agree not to use the Service to:</p>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Harass, threaten, or discriminate against others</li>
                <li>Post false, misleading, or defamatory content</li>
                <li>Engage in fraudulent or deceptive practices</li>
                <li>Attempt to gain unauthorized system access</li>
                <li>Disrupt service availability or functionality</li>
                <li>Spam or send unsolicited communications</li>
                <li>Engage in money laundering or terrorist financing</li>
                <li>Circumvent security measures</li>
              </ul>
            </section>

            {/* Disclaimers */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Disclaimers</h2>
              
              <h3 className="text-lg font-bold text-gray-900 mb-3">"As-Is" Service</h3>
              <p className="text-black">
                The Service is provided "AS IS" without warranties of any kind, either express or implied. We disclaim all warranties including fitness for a particular purpose, merchantability, and non-infringement.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">No Guarantees</h3>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>We do not guarantee uninterrupted or error-free service</li>
                <li>We do not warrant that defects will be corrected</li>
                <li>We do not guarantee specific results from the Service</li>
              </ul>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Third-Party Content</h3>
              <p className="text-black">
                We are not responsible for third-party content, websites, or services linked from our Service. Your use of third-party services is at your own risk and subject to their terms.
              </p>
            </section>

            {/* Limitations of Liability */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Limitations of Liability</h2>
              
              <p className="text-black mb-3">
                TO THE FULLEST EXTENT PERMITTED BY LAW, RENEWABLEZMART SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc list-inside text-black space-y-2">
                <li>Lost profits or revenue</li>
                <li>Loss of data or business interruption</li>
                <li>Indirect, incidental, or consequential damages</li>
                <li>Damages beyond the amount paid to us</li>
              </ul>

              <p className="text-black mt-3">
                Some jurisdictions do not allow limitations of liability, so this limitation may not apply to you.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Indemnification</h2>
              
              <p className="text-black">
                You agree to indemnify, defend, and hold harmless RenewableZmart and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from:
              </p>
              <ul className="list-disc list-inside text-black space-y-2 mt-3">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of laws or regulations</li>
                <li>Your infringement of third-party rights</li>
                <li>Your content or user-generated content</li>
              </ul>
            </section>

            {/* Dispute Resolution */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Dispute Resolution</h2>
              
              <h3 className="text-lg font-bold text-gray-900 mb-3">Informal Resolution</h3>
              <p className="text-black">
                Before initiating formal proceedings, you agree to contact us to attempt to resolve disputes informally. Please provide detailed information about your dispute.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Governing Law</h3>
              <p className="text-black">
                These Terms shall be governed by the laws of Nigeria, without regard to conflicts of law principles.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-4">Jurisdiction</h3>
              <p className="text-black">
                You agree to submit to the jurisdiction of Nigerian courts for any legal proceedings.
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Termination</h2>
              
              <p className="text-black">
                We may terminate or suspend your account and access to the Service at any time, with or without cause, and without notice. Upon termination, your right to use the Service immediately ceases.
              </p>

              <p className="text-black mt-3">
                Sections that should survive termination, including Intellectual Property Rights, Limitations of Liability, and Governing Law, will continue in effect.
              </p>
            </section>

            {/* Modifications */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Modifications to Terms</h2>
              
              <p className="text-black">
                We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the Service following the posting of revised Terms means you accept and agree to the changes.
              </p>
            </section>

            {/* Severability */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Severability</h2>
              
              <p className="text-black">
                If any provision of these Terms is found to be invalid or unenforceable, that provision shall be removed and the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">17. Contact Us</h2>
              
              <p className="text-black mb-3">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-black"><strong>Email:</strong> support@renewablezmart.com</p>
                <p className="text-black mt-2"><strong>Address:</strong> Nigeria</p>
                <p className="text-black mt-2"><strong>Contact:</strong> Through the RenewableZmart platform</p>
              </div>
            </section>

          </div>

          {/* Footer Links */}
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/" className="text-green-600 hover:text-green-700 font-semibold">
              Back to Home
            </Link>
            <span className="text-black">|</span>
            <Link href="/privacy" className="text-green-600 hover:text-green-700 font-semibold">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}




