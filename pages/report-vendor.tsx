import { useState } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Link from 'next/link'
import { validateEmail } from '@/lib/emailValidation'

export default function ReportVendor() {
  const [formData, setFormData] = useState({
    reporterName: '',
    reporterEmail: '',
    reporterPhone: '',
    reportedUserType: '',
    vendorName: '',
    vendorStore: '',
    orderId: '',
    complaintType: '',
    description: '',
    evidence: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate email
    const emailValidation = validateEmail(formData.reporterEmail)
    if (!emailValidation.isValid) {
      alert(emailValidation.error || 'Invalid email address')
      return
    }
    
    setLoading(true)

    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
      // Reset form
      setFormData({
        reporterName: '',
        reporterEmail: '',
        reporterPhone: '',
        reportedUserType: '',
        vendorName: '',
        vendorStore: '',
        orderId: '',
        complaintType: '',
        description: '',
        evidence: ''
      })
    }, 1500)
  }

  return (
    <>
      <Head>
        <title>Report - RenewableZmart</title>
        <meta name="description" content="Report misconduct or issues on RenewableZmart" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="container mx-auto px-4 py-12" style={{ fontFamily: "'Century Gothic', 'CenturyGothic', 'AppleGothic', sans-serif" }}>
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Report</h1>
            <p className="text-xl text-black max-w-3xl mx-auto">
              Help us maintain quality standards by reporting misconduct, fraudulent activities, or policy violations
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Success Message */}
            {submitted && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8 animate-fade-in">
                <div className="flex items-start gap-4">
                  <svg className="w-8 h-8 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-bold text-green-900 mb-2">Report Submitted Successfully</h3>
                    <p className="text-green-800">
                      Thank you for bringing this to our attention. Our compliance team will review your report within 24-48 hours. 
                      You will receive updates via email at <span className="font-semibold">{formData.reporterEmail}</span>.
                    </p>
                    <p className="text-green-700 mt-2 text-sm">
                      Reference Number: <span className="font-mono font-bold">RV{Date.now().toString().slice(-8)}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Confidential</h3>
                <p className="text-sm text-black">Your report is handled with strict confidentiality</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Fast Response</h3>
                <p className="text-sm text-black">We review all reports within 24-48 hours</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Action Taken</h3>
                <p className="text-sm text-black">Verified reports lead to immediate action</p>
              </div>
            </div>

            {/* Report Form */}
            <div className="bg-white rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Your Report</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Reporter Information */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Your Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="reporterName"
                        value={formData.reporterName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Your Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="reporterEmail"
                        value={formData.reporterEmail}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Your Phone Number
                      </label>
                      <input
                        type="tel"
                        name="reporterPhone"
                        value={formData.reporterPhone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-500"
                        placeholder="+234 XXX XXX XXXX"
                      />
                    </div>
                  </div>
                </div>

                {/* User Type Selection */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Who are you reporting?</h3>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      User Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="reportedUserType"
                      value={formData.reportedUserType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                      required
                    >
                      <option value="">Select who you want to report</option>
                      <option value="vendor">Vendor</option>
                      <option value="installer">Installer</option>
                      <option value="customer">Customer</option>
                    </select>
                    <p className="text-xs text-black mt-2">
                      Select the type of user you are reporting. This helps us route your report to the correct team.
                    </p>
                  </div>
                </div>

                {/* Vendor Information */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {formData.reportedUserType === 'vendor' && 'Vendor Information'}
                    {formData.reportedUserType === 'installer' && 'Installer Information'}
                    {formData.reportedUserType === 'customer' && 'Customer Information'}
                    {!formData.reportedUserType && 'User Information'}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        {formData.reportedUserType === 'vendor' && 'Vendor/Store Name'}
                        {formData.reportedUserType === 'installer' && 'Installer Name'}
                        {formData.reportedUserType === 'customer' && 'Customer Name'}
                        {!formData.reportedUserType && 'Name'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="vendorName"
                        value={formData.vendorName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        {formData.reportedUserType === 'vendor' && 'Store URL or ID'}
                        {formData.reportedUserType === 'installer' && 'Profile URL or ID'}
                        {formData.reportedUserType === 'customer' && 'User ID or Email'}
                        {!formData.reportedUserType && 'Store/Profile URL or ID'}
                      </label>
                      <input
                        type="text"
                        name="vendorStore"
                        value={formData.vendorStore}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-500"
                        placeholder={
                          formData.reportedUserType === 'vendor' ? 'e.g., /store/vendor-name or Store ID' :
                          formData.reportedUserType === 'installer' ? 'e.g., /installer/123 or Installer ID' :
                          formData.reportedUserType === 'customer' ? 'e.g., customer@example.com or User ID' :
                          'e.g., URL or ID'
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Order ID (if applicable)
                      </label>
                      <input
                        type="text"
                        name="orderId"
                        value={formData.orderId}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-500"
                        placeholder="Enter order ID if you have one"
                      />
                    </div>
                  </div>
                </div>

                {/* Complaint Details */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Complaint Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Type of Complaint <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="complaintType"
                        value={formData.complaintType}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-500"
                        required
                      >
                        <option value="">Select complaint type</option>
                        <option value="fake-products">Fake/Counterfeit Products</option>
                        <option value="poor-quality">Poor Quality Products</option>
                        <option value="non-delivery">Non-delivery of Products</option>
                        <option value="wrong-item">Wrong Item Delivered</option>
                        <option value="damaged-goods">Damaged Goods</option>
                        <option value="poor-service">Poor Customer Service</option>
                        <option value="false-advertising">False Advertising/Misleading Info</option>
                        <option value="overcharging">Overcharging/Hidden Fees</option>
                        <option value="refund-issue">Refund/Return Issues</option>
                        <option value="harassment">Harassment/Unprofessional Conduct</option>
                        <option value="fraud">Fraud/Scam Activity</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Detailed Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={6}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-500"
                        placeholder="Please provide a detailed description of the issue, including dates, amounts, and any relevant information..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Evidence/Supporting Documents
                      </label>
                      <textarea
                        name="evidence"
                        value={formData.evidence}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-500"
                        placeholder="Describe any evidence you have (screenshots, receipts, emails, etc.). You can also email evidence to reports@renewablezmart.com with your reference number."
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Link href="/help" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                    ? Back to Help Center
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-red-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            </div>

            {/* Additional Info */}
            <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 mb-3">What Happens Next?</h3>
              <ul className="space-y-2 text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  <span>Your report is immediately logged in our system with a unique reference number</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  <span>Our compliance team reviews the report within 24-48 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  <span>We may contact you for additional information if needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">4.</span>
                  <span>Action is taken against the vendor if violations are confirmed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">5.</span>
                  <span>You receive email updates on the status of your report</span>
                </li>
              </ul>
            </div>

            {/* Contact Support */}
            <div className="mt-6 text-center">
              <p className="text-black mb-4">Need immediate assistance?</p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href="tel:+2349022298109" className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition">
                  ☎️ Call: +234 902 229 8109
                </a>
                <a href="mailto:reports@renewablezmart.com" className="bg-white text-emerald-600 border-2 border-emerald-600 px-6 py-3 rounded-lg font-bold hover:bg-emerald-50 transition">
                  ✏️ Email: reports@renewablezmart.com
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}




