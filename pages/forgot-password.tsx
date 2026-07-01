import { useState, ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import Header from '@/components/layout/Header'
import { validateEmail } from '@/lib/emailValidation'
import { getApiBaseUrl } from '@/lib/apiConfig'

interface FormState {
  email: string
}

interface Errors {
  [key: string]: string
}

export default function ForgotPassword() {
  const [formData, setFormData] = useState<FormState>({ email: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (errors[name]) setErrors({ ...errors, [name]: '' })
  }

  const validateForm = () => {
    const newErrors: Errors = {}
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else {
      const emailValidation = validateEmail(formData.email)
      if (!emailValidation.isValid) {
        newErrors.email = emailValidation.error || 'Invalid email'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setMessage('')
    
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email })
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitted(true)
        setMessage('Password reset link has been sent to your email!')
        setFormData({ email: '' })
      } else {
        setMessage(data.message || 'Error sending reset link. Please try again.')
      }
    } catch (error: any) {
      setMessage('Error: ' + (error.message || 'Failed to send reset link'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Forgot Password - RenewableZmart</title>
        <meta name="description" content="Reset your RenewableZmart password" />
      </Head>
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
            <p className="text-gray-900 font-bold">Enter your email address and we'll send you a password reset link</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
            {submitted ? (
              <div className="space-y-6">
                {/* Success Message */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-green-900">Check Your Email</h3>
                      <p className="text-sm text-green-700 mt-1">
                        We've sent a password reset link to <strong>{formData.email}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-3 text-sm">
                  <p className="text-gray-900 font-bold">
                    <strong>What to do next:</strong>
                  </p>
                  <ol className="space-y-2 list-decimal list-inside text-black">
                    <li>Check your email inbox</li>
                    <li>Click the "Reset Password" link in the email</li>
                    <li>Create a new password</li>
                    <li>Log in with your new password</li>
                  </ol>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>💡 Tip:</strong> The reset link will expire in 1 hour for security
                  </p>
                </div>

                {/* Resend Option */}
                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-900 font-bold">Didn't receive the email?</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
                  >
                    Try another email address
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-extrabold text-gray-900 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${
                      errors.email
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-400 focus:ring-emerald-500'
                    }`}
                    required
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-2">{errors.email}</p>
                  )}
                </div>

                {/* Message */}
                {message && (
                  <div className={`p-4 rounded-lg text-sm ${
                    message.toLowerCase().includes('success')
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
                </button>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>🔐 Security:</strong> If an account exists with this email, you'll receive a password reset link
                  </p>
                </div>
              </form>
            )}

            {/* Back to Login */}
            <div className="text-center mt-6 pt-6 border-t border-gray-200">
              <p className="text-black text-sm mb-2">
                Remember your password?
              </p>
              <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Back to Login
              </Link>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center text-sm text-black">
            <p>
              Need help?{' '}
              <Link href="/help" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}




