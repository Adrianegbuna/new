/**
 * Safe Promise-based Paystack Loader
 * Based on proven pattern - loads only https://js.paystack.co/v1/inline.js
 * Ensures script loads once and PaystackPop is available
 */

export function loadPaystack(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false)
    }

    // If already loaded, resolve immediately
    if (window.PaystackPop) {
      console.log('[PAYSTACK-LOADER] PaystackPop already loaded')
      return resolve(true)
    }

    // Check if script already exists
    const existing = document.querySelector(
      'script[src="https://js.paystack.co/v1/inline.js"]'
    )

    if (existing) {
      console.log('[PAYSTACK-LOADER] Script exists, waiting for load...')
      const script = existing as HTMLScriptElement
      script.onload = () => {
        setTimeout(() => resolve(window.PaystackPop ? true : false), 500)
      }
      script.onerror = () => resolve(false)
      return
    }

    // Create and append script
    console.log('[PAYSTACK-LOADER] Creating new script...')
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true

    script.onload = () => {
      console.log('[PAYSTACK-LOADER] Script loaded')
      setTimeout(() => resolve(window.PaystackPop ? true : false), 500)
    }

    script.onerror = () => {
      console.error('[PAYSTACK-LOADER] Script failed to load')
      resolve(false)
    }

    document.body.appendChild(script)
  })
}
