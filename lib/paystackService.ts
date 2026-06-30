/**
 * Safe Paystack Payment Service
 * Uses Inline API with proper error handling and cart clearing protection
 * Cart clearing happens ONLY after backend verification succeeds
 */

import { loadPaystack } from './paystackLoader'

export interface PaymentConfig {
  publicKey: string
  amount: number
  email: string
  reference: string
  orderId?: string  // ✅ Optional - order created AFTER payment verification
  customerName: string
  onSuccess: (reference: string) => void
  onError: (error: any) => void
}

export class PaystackPaymentService {
  /**
   * Initialize and open Paystack payment dialog with Inline API
   * Waits for script to load before attempting payment
   */
  static async initializePayment(config: PaymentConfig): Promise<void> {
    try {
      console.log('[PAYSTACK] Initializing payment with Inline API...')
      
      // Ensure Paystack Inline API script is loaded
      const ready = await loadPaystack().catch(() => false)

      if (!ready || !window.PaystackPop) {
        throw new Error('Payment system failed to load. Please refresh the page.')
      }

      console.log('[PAYSTACK] Opening payment modal...')
      const handler = window.PaystackPop.setup({
        key: config.publicKey,
        email: config.email,
        amount: Math.round(config.amount * 100),
        currency: 'NGN',
        ref: config.reference,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        onClose: () => {
          console.log('[PAYSTACK] Payment closed by user')
          config.onError({
            type: 'PAYMENT_CANCELLED',
            message: 'Payment dialog was closed'
          })
        },
        callback: (response: any) => {
          console.log('[PAYSTACK] Payment callback, reference:', response.reference)
          // onSuccess called after backend verification in cart.tsx
          config.onSuccess(response.reference)
        }
      })

      handler.openIframe()
    } catch (error: any) {
      console.error('[PAYSTACK] Error:', error.message)
      config.onError(error)
    }
  }
}
