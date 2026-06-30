import { useState, ChangeEvent, FormEvent, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Header from '../components/Header'
import PasswordInput from '../components/PasswordInput'
import { validateEmail } from '@/lib/emailValidation'
import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/lib/api-client'

interface FormState {
  email: string
  password: string
  otpCode: string
  rememberMe: boolean
}

interface Errors {
  [key: string]: string
}

export default function Login() {
  const router = useRouter()
  const { setUser, setToken } = useAuthStore()
  const [formData, setFormData] = useState<FormState>({ email: '', password: '', otpCode: '', rememberMe: false })
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mfaToken, setMfaToken] = useState<string | null>(null)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value } as FormState)
    if (errors[name]) setErrors({ ...errors, [name]: '' })
  }

  const validateForm = () => {
    const newErrors: Errors = {}
    if (!mfaToken) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required'
      } else {
        const emailValidation = validateEmail(formData.email)
        if (!emailValidation.isValid) {
          newErrors.email = emailValidation.error || 'Invalid email'
        }
      }
      if (!formData.password) newErrors.password = 'Password is required'
    } else if (!formData.otpCode.trim()) {
      newErrors.otpCode = 'MFA code is required'
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
      // Login with backend JWT auth
      if (!mfaToken) {
        const response = await apiClient.post('/auth/login', {
          email: formData.email,
          password: formData.password,
        })

        if (response.data?.requiresMfa && response.data?.mfaToken) {
          setMfaToken(response.data.mfaToken)
          setMessage('Enter your 6-digit authenticator code (or backup code) to finish login.')
          setLoading(false)
          return
        }

        const { user, accessToken } = response.data
        const { setUser, setToken } = useAuthStore.getState()
        setUser(user)
        setToken(accessToken)
        if (typeof window !== 'undefined' && accessToken) {
          localStorage.setItem('accessToken', accessToken)
        }

        setMessage('Login successful! Redirecting...')
        setFormData({ email: '', password: '', otpCode: '', rememberMe: false })
        setErrors({})

        const redirectUrl = user.role === 'admin' ? '/admin-dashboard' : '/'
        setTimeout(() => {
          router.push(redirectUrl)
        }, 1500)
      } else {
        const verifyResponse = await apiClient.post('/mfa/verify-login', {
          mfaToken,
          code: formData.otpCode,
        })

        const { user, accessToken } = verifyResponse.data
        const { setUser, setToken } = useAuthStore.getState()
        setUser(user)
        setToken(accessToken)
        if (typeof window !== 'undefined' && accessToken) {
          localStorage.setItem('accessToken', accessToken)
        }
        setMessage('MFA verified. Redirecting...')
        setFormData({ email: '', password: '', otpCode: '', rememberMe: false })
        setErrors({})
        setMfaToken(null)
        const redirectUrl = user.role === 'admin' ? '/admin-dashboard' : '/'
        setTimeout(() => {
          router.push(redirectUrl)
        }, 1200)
      }
    } catch (error: any) {
      setLoading(false)
      setMessage('')
      const errorMessage = error.response?.data?.message || error.message || 'Login failed. Please check your credentials.'
      setErrors({ form: errorMessage })
      console.error('[Login] Error:', errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-8 rounded-t-lg">
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-teal-50">Login to your RenewableZmart account</p>
          </div>
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-b-lg p-8">
            {errors.form && <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">{errors.form}</div>}
            {message && <div className="mb-6 p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">{message}</div>}
            
            <form id="login-form" onSubmit={handleSubmit} className="relative z-10">
              {!mfaToken && (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${errors.email ? 'border-red-500' : 'border-gray-400'}`} placeholder="your.email@example.com" />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-extrabold text-gray-900 mb-2">Password</label>
                    <PasswordInput
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      error={!!errors.password}
                      className="py-3"
                    />
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                  </div>
                </>
              )}
              {mfaToken && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">MFA Code</label>
                  <input
                    type="text"
                    name="otpCode"
                    value={formData.otpCode}
                    onChange={handleChange}
                    className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold ${errors.otpCode ? 'border-red-500' : 'border-gray-400'}`}
                    placeholder="123456 or backup code"
                  />
                  {errors.otpCode && <p className="text-red-500 text-sm mt-1">{errors.otpCode}</p>}
                </div>
              )}
              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleChange} className="w-4 h-4" />
                  <span className="text-sm text-gray-900 font-semibold">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-teal-600 hover:underline">Forgot password?</Link>
              </div>
              <button
                type="submit"
                form="login-form"
                disabled={loading}
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition mb-4 pointer-events-auto"
              >
                {loading ? 'Processing...' : (mfaToken ? 'Verify MFA' : 'Login')}
              </button>
            </form>
            
            <div className="mt-6 text-center text-sm text-gray-900 font-bold dark:text-white">
              Don't have an account? <Link href="/register" className="text-teal-600 font-semibold hover:underline">Register now</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



