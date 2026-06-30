import type { NextApiRequest, NextApiResponse } from 'next'

interface BVNVerificationRequest {
  bvn: string
  firstName?: string
  lastName?: string
}

interface BVNVerificationResponse {
  success: boolean
  verified: boolean
  message: string
  data?: {
    firstName?: string
    lastName?: string
    middleName?: string
    dateOfBirth?: string
    phone?: string
    image?: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BVNVerificationResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, verified: false, message: 'Method not allowed' })
  }

  const { bvn, firstName, lastName } = req.body as BVNVerificationRequest

  // Validate BVN format
  if (!bvn || !/^\d{11}$/.test(bvn)) {
    return res.status(400).json({ 
      success: false, 
      verified: false, 
      message: 'Invalid BVN format. Must be 11 digits.' 
    })
  }

  try {
    // Paystack Identity Verification API - BVN Match
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured')
      return res.status(500).json({
        success: false,
        verified: false,
        message: 'BVN verification service not configured'
      })
    }

    // Call Paystack BVN Match API
    const response = await fetch('https://api.paystack.co/bvn/match', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bvn: bvn,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      })
    })

    const data = await response.json()
    
    // Check if Paystack API call was successful
    if (!response.ok) {
      console.error('Paystack BVN verification error:', data)
      return res.status(response.status).json({
        success: false,
        verified: false,
        message: data.message || 'BVN verification failed'
      })
    }

    // Check verification result
    if (data.status && data.data) {
      const isBlacklisted = data.data.is_blacklisted === true
      const matchResult = data.data.match_result || {}
      
      // Check if BVN is blacklisted
      if (isBlacklisted) {
        return res.status(200).json({
          success: true,
          verified: false,
          message: 'This BVN is blacklisted and cannot be used'
        })
      }

      // Check name matching if provided
      if (firstName && lastName) {
        const firstNameMatch = matchResult.first_name === 'MATCH'
        const lastNameMatch = matchResult.last_name === 'MATCH'
        
        if (!firstNameMatch || !lastNameMatch) {
          return res.status(200).json({
            success: true,
            verified: false,
            message: 'Name does not match BVN records. Please check your details.'
          })
        }
      }

      // Verification successful - return BVN data
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'BVN verified successfully',
        data: {
          firstName: data.data.first_name,
          lastName: data.data.last_name,
          middleName: data.data.middle_name || '',
          dateOfBirth: data.data.formatted_dob || data.data.dob,
          phone: data.data.mobile || data.data.phone_number,
          image: data.data.photo || data.data.image // Base64 encoded image
        }
      })
    } else {
      return res.status(200).json({
        success: true,
        verified: false,
        message: 'BVN verification failed. Please check your details.'
      })
    }

  } catch (error) {
    console.error('BVN verification error:', error)
    return res.status(500).json({
      success: false,
      verified: false,
      message: 'BVN verification service unavailable. Please try again later.'
    })
  }
}
