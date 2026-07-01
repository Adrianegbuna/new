import Head from 'next/head';
import Link from 'next/link';
import Header from '@/components/layout/Header';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - RenewableZmart</title>
        <meta name="description" content="Privacy Policy for RenewableZmart e-commerce platform. Learn how we collect, use, and protect your personal data in compliance with NDPR and global standards." />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Privacy Policy - RenewableZmart" />
        <meta property="og:description" content="Comprehensive privacy policy covering Nigeria's NDPR and global data protection standards." />
      </Head>

      <Header />
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header Section */}
          <div className="bg-green-600 text-white -mx-4 -mt-12 mb-12 py-12 px-4 rounded-b-lg">
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-lg text-green-100">
              Protecting your data with professional standards and full compliance
            </p>
            <p className="text-sm text-green-200 mt-4">
              <strong>Effective Date:</strong> January 10, 2026 | <strong>Last Updated:</strong> January 10, 2026
            </p>
          </div>

          {/* Table of Contents */}
          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded mb-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Table of Contents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><a href="#intro" className="text-green-600 hover:underline text-sm">1. Introduction & Commitment</a></div>
              <div><a href="#collect" className="text-green-600 hover:underline text-sm">2. Information We Collect</a></div>
              <div><a href="#use" className="text-green-600 hover:underline text-sm">3. How We Use Information</a></div>
              <div><a href="#share" className="text-green-600 hover:underline text-sm">4. How We Share Information</a></div>
              <div><a href="#security" className="text-green-600 hover:underline text-sm">5. Data Security</a></div>
              <div><a href="#rights" className="text-green-600 hover:underline text-sm">6. Your Rights & Choices</a></div>
              <div><a href="#children" className="text-green-600 hover:underline text-sm">7. Children's Privacy</a></div>
              <div><a href="#contact" className="text-green-600 hover:underline text-sm">Contact Us</a></div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
            
            {/* Section 1: Introduction */}
            <section id="intro">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction & Commitment to Privacy</h2>
              <p className="text-black mb-4">
                RenewableZmart ("we," "us," "our," or "Company") is committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy outlines how we collect, use, disclose, and safeguard your information when you visit our website and mobile application (collectively, the "Platform").
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 my-4 rounded">
                <p className="text-sm font-semibold text-blue-900 mb-2">Governing Laws & Standards:</p>
                <ul className="text-sm text-blue-800 space-y-1 ml-4">
                  <li>🇳🇴 Nigeria Data Protection Regulation (NDPR) 2019</li>
                  <li>🇨🇳 General Data Protection Regulation (GDPR) - EU compliance</li>
                  <li>🇳🇴 Nigeria's Consumer Protection Framework</li>
                  <li>🌐 Global Data Protection Best Practices</li>
                </ul>
              </div>
            </section>

            {/* Section 2: Information Collection */}
            <section id="collect">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-6">2.1 Information You Provide Directly</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Account Registration & Profile Information</h4>
                  <ul className="text-black ml-4 space-y-1 text-sm list-disc list-inside">
                    <li>Full name, email address, phone number</li>
                    <li>Residential and business addresses</li>
                    <li>Date of birth (for age verification)</li>
                    <li>Government-issued ID information</li>
                    <li>Business registration number (CAC - for vendors)</li>
                    <li>Bank account details (for payment purposes)</li>
                    <li>BVN (Bank Verification Number) - optional</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Payment Information</h4>
                  <ul className="text-black ml-4 space-y-1 text-sm list-disc list-inside">
                    <li>Credit/debit card details (processed by Paystack only)</li>
                    <li>Payment history and transaction records</li>
                    <li>Billing address</li>
                    <li>Cheque information (for installment plans)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Communication & Support</h4>
                  <ul className="text-black ml-4 space-y-1 text-sm list-disc list-inside">
                    <li>Messages, inquiries, and feedback</li>
                    <li>Customer service correspondence</li>
                    <li>Support tickets and chat histories</li>
                    <li>Reviews and testimonials</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-3 mt-6">2.2 Information Collected Automatically</h3>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <p className="text-black text-sm font-semibold mb-2">We collect certain information automatically:</p>
                <ul className="text-black ml-4 space-y-1 text-sm list-disc list-inside">
                  <li>Device type, OS, browser type, IP address</li>
                  <li>Pages visited, search queries, click patterns</li>
                  <li>Page load times, Web Vitals, performance metrics</li>
                  <li>Cookies and session tokens for authentication</li>
                  <li>Location data (with your explicit consent)</li>
                </ul>
              </div>
            </section>

            {/* Section 3: How We Use Information */}
            <section id="use">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="text-green-600 font-bold text-xl">✓</span>
                  <div>
                    <h4 className="font-bold text-gray-900">Service Delivery</h4>
                    <p className="text-black text-sm">Processing orders, payments, deliveries, and customer support</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-600 font-bold text-xl">✓</span>
                  <div>
                    <h4 className="font-bold text-gray-900">Verification & Compliance</h4>
                    <p className="text-black text-sm">Identity verification, BVN validation, KYC checks, fraud prevention</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-600 font-bold text-xl">✓</span>
                  <div>
                    <h4 className="font-bold text-gray-900">Platform Improvement</h4>
                    <p className="text-black text-sm">Analyzing user behavior, testing features, optimizing performance</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-600 font-bold text-xl">✓</span>
                  <div>
                    <h4 className="font-bold text-gray-900">Security & Monitoring</h4>
                    <p className="text-black text-sm">Tracking errors, monitoring security, detecting and preventing misuse</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-600 font-bold text-xl">✓</span>
                  <div>
                    <h4 className="font-bold text-gray-900">Legal Compliance</h4>
                    <p className="text-black text-sm">Responding to government requests and complying with tax requirements</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: How We Share */}
            <section id="share">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How We Share Your Information</h2>
              
              <div className="space-y-4">
                <div className="border-l-4 border-green-600 bg-green-50 p-4 rounded">
                  <h4 className="font-bold text-gray-900 mb-2">Service Providers</h4>
                  <p className="text-black font-bold text-sm">Paystack (payments), SendGrid (email), Meilisearch (search), Render (hosting)</p>
                </div>

                <div className="border-l-4 border-blue-600 bg-blue-50 p-4 rounded">
                  <h4 className="font-bold text-gray-900 mb-2">Business Partners</h4>
                  <p className="text-black font-bold text-sm">Vendors and installers to process orders and facilitate services</p>
                </div>

                <div className="border-l-4 border-yellow-600 bg-yellow-50 p-4 rounded">
                  <h4 className="font-bold text-gray-900 mb-2">Legal Requirements</h4>
                  <p className="text-black font-bold text-sm">Government agencies, law enforcement, and regulatory bodies when required by law</p>
                </div>

                <div className="border-l-4 border-purple-600 bg-purple-50 p-4 rounded">
                  <h4 className="font-bold text-gray-900 mb-2">Anonymized Data</h4>
                  <p className="text-black text-sm">We may share aggregated, anonymized data that cannot identify you for research and analytics</p>
                </div>
              </div>
            </section>

            {/* Section 5: Data Security */}
            <section id="security">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security & Protection</h2>
              <p className="text-black mb-4">
                We implement comprehensive security measures to protect your personal data:
              </p>
              
              <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded mb-4">
                <h4 className="font-bold text-gray-900 mb-3">Technical Controls</h4>
                <ul className="text-sm text-black space-y-2 ml-4 list-disc list-inside">
                  <li>End-to-end encryption in transit (TLS 1.2+)</li>
                  <li>Encryption at rest using industry-standard algorithms</li>
                  <li>Secure password hashing with bcrypt</li>
                  <li>HTTP-only cookies for token storage</li>
                  <li>Regular security audits and penetration testing</li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded">
                <h4 className="font-bold text-gray-900 mb-3">Administrative Controls</h4>
                <ul className="text-sm text-black space-y-2 ml-4 list-disc list-inside">
                  <li>Limited access to personal data (need-to-know basis)</li>
                  <li>Employee confidentiality agreements</li>
                  <li>Regular security training for staff</li>
                  <li>Background checks for data access personnel</li>
                  <li>24/7 security monitoring and incident response</li>
                </ul>
              </div>
            </section>

            {/* Cookies and Tracking */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies and Tracking Technologies</h2>
              <p className="text-black leading-relaxed">
                We use cookies and similar tracking technologies to enhance your experience, remember your preferences, and analyze how you use our Service. You can control cookie settings through your browser, though disabling cookies may affect functionality.
              </p>
            </section>

            {/* Section 6: Your Rights */}
            <section id="rights">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Data Rights & Choices</h2>
              <p className="text-black mb-4">
                Under Nigeria's Data Protection Regulation (NDPR) and the GDPR (for EU users), you have important rights:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="border border-gray-200 p-4 rounded hover:shadow-lg transition">
                  <h4 className="font-semibold text-green-600 mb-2">Right of Access</h4>
                  <p className="text-sm text-black">Request a copy of your data (within 30 days)</p>
                </div>

                <div className="border border-gray-200 p-4 rounded hover:shadow-lg transition">
                  <h4 className="font-semibold text-green-600 mb-2">Right to Rectification</h4>
                  <p className="text-sm text-black">Correct inaccurate information</p>
                </div>

                <div className="border border-gray-200 p-4 rounded hover:shadow-lg transition">
                  <h4 className="font-semibold text-green-600 mb-2">Right to Erasure</h4>
                  <p className="text-sm text-black">Request deletion of your data</p>
                </div>

                <div className="border border-gray-200 p-4 rounded hover:shadow-lg transition">
                  <h4 className="font-semibold text-green-600 mb-2">Right to Data Portability</h4>
                  <p className="text-sm text-black">Receive data in machine-readable format</p>
                </div>

                <div className="border border-gray-200 p-4 rounded hover:shadow-lg transition">
                  <h4 className="font-semibold text-green-600 mb-2">Right to Object</h4>
                  <p className="text-sm text-black">Opt-out of certain processing activities</p>
                </div>

                <div className="border border-gray-200 p-4 rounded hover:shadow-lg transition">
                  <h4 className="font-semibold text-green-600 mb-2">Right to Withdraw Consent</h4>
                  <p className="text-sm text-black">Unsubscribe from marketing anytime</p>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
                <h4 className="font-bold text-gray-900 mb-2">How to Exercise Your Rights</h4>
                <ol className="text-sm text-black space-y-2 ml-4 list-decimal list-inside">
                  <li>Email us at <strong>privacy@renewablezmart.com</strong> with "DATA REQUEST" in subject</li>
                  <li>Provide your name, email, account ID, and specific request</li>
                  <li>We will respond within 30 days (or 60 days for complex requests)</li>
                  <li>Identity verification may be required</li>
                </ol>
              </div>
            </section>

            {/* Payment Information */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Payment Information</h2>
              <p className="text-black leading-relaxed">
                Payment processing is handled by Paystack, a PCI DSS compliant payment processor. We do not store full credit card numbers. Paystack handles all payment information according to their own privacy policy.
              </p>
            </section>

            {/* Section 7: Children's Privacy */}
            <section id="children">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Children's Privacy</h2>
              <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
                <p className="text-gray-900 font-bold mb-2">🔞 Age Restriction</p>
                <p className="text-black text-sm">
                  Our Platform is <strong>NOT intended for users under 18 years old.</strong> We do not knowingly collect personal information from children. If we discover we have collected data from someone under 18, we will delete it immediately.
                </p>
              </div>
            </section>

            {/* Additional Sections */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies & Tracking Technologies</h2>
              <p className="text-black mb-3">We use cookies for:</p>
              <ul className="list-disc list-inside text-black space-y-2">
                <li><strong>Authentication:</strong> HTTP-only secure cookies (30-90 days)</li>
                <li><strong>Preferences:</strong> User settings and language preferences</li>
                <li><strong>Analytics:</strong> Understanding user behavior and improving features</li>
                <li><strong>Security:</strong> Detecting and preventing fraud</li>
              </ul>
              <p className="text-black mt-3 text-sm">You can control cookie settings in our consent banner or browser settings.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Data Retention</h2>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <ul className="text-black text-sm space-y-2">
                  <li><strong>Account Information:</strong> Lifetime + 1 year after closure</li>
                  <li><strong>Transaction Records:</strong> 7 years (tax compliance)</li>
                  <li><strong>Payment Data:</strong> Not stored (Paystack only)</li>
                  <li><strong>Log Files:</strong> 90 days (security audit)</li>
                  <li><strong>Marketing Data:</strong> Until opt-out</li>
                  <li><strong>BVN/CAC Data:</strong> Duration of vendor status + 1 year</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. International Data Transfers</h2>
              <p className="text-black mb-3">
                Your data may be transferred to and processed in Nigeria and other countries. By using our Platform, you consent to such transfers. For EU/UK users, transfers are protected by Standard Contractual Clauses (SCCs).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Third-Party Links</h2>
              <p className="text-black">
                Our Platform may contain links to third-party websites and services. We are <strong>NOT responsible</strong> for their privacy practices. Please review their privacy policies before providing information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Updates to This Privacy Policy</h2>
              <p className="text-black mb-3">
                We may update this Privacy Policy periodically. Material changes will be announced via email and prominent notice on the Platform. Your continued use after changes constitutes acceptance.
              </p>
            </section>

            {/* Contact Section */}
            <section id="contact">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              
              <h3 className="text-lg font-bold text-gray-900 mb-3">Privacy Officer</h3>
              <div className="bg-gray-50 p-6 rounded border border-gray-200 mb-6">
                <p className="text-black mb-2"><strong>Email:</strong> <a href="mailto:privacy@renewablezmart.com" className="text-green-600 hover:underline font-semibold">privacy@renewablezmart.com</a></p>
                <p className="text-black mb-2"><strong>Subject Line:</strong> DATA REQUEST (for data subject requests)</p>
                <p className="text-black"><strong>Response Time:</strong> Within 5 business days</p>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-3">Data Protection Authorities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <p className="font-bold text-gray-900 mb-2">🇳🇴 Nigeria</p>
                  <p className="text-sm text-black font-semibold mb-1">NITDA</p>
                  <p className="text-xs text-gray-900 font-bold">National Information Technology<br />Development Agency</p>
                  <p className="text-xs text-green-600 mt-2 font-semibold">www.nitda.gov.ng</p>
                </div>

                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <p className="font-bold text-gray-900 mb-2">🇨🇿 European Union</p>
                  <p className="text-sm text-black font-semibold mb-1">Your Local DPA</p>
                  <p className="text-xs text-gray-900 font-bold">Your national Data<br />Protection Authority</p>
                  <p className="text-xs text-gray-900 font-bold mt-2">(if you are an EU user)</p>
                </div>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-l-4 border-green-600 p-6 rounded mt-12">
            <p className="text-xs text-gray-900 font-bold mb-2">
              <strong>(c) 2026 RenewableZmart. All rights reserved.</strong>
            </p>
            <p className="text-xs text-gray-900 font-bold mb-3">
              <strong>Version:</strong> 1.0 | <strong>Effective Date:</strong> January 10, 2026 | <strong>Next Review:</strong> January 10, 2027
            </p>
            <p className="text-xs text-black">
              For compliance with NDPR and GDPR regulations
            </p>
          </div>

          {/* Back to Home Link */}
          <div className="mt-12 text-center mb-8">
            <Link href="/">
              <a className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-semibold">
                Back to Home
              </a>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}




