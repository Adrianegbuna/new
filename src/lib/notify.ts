type EmailPayload = {
  to: string
  subject: string
  html: string
  text?: string
  metadata?: Record<string, any>
}

export async function sendEmailNotification(payload: EmailPayload): Promise<{ sent: boolean; error?: string }> {
  const tryBackendSend = async (): Promise<{ sent: boolean; error?: string } | null> => {
    if (typeof window === 'undefined') return null

    const token = localStorage.getItem('accessToken')
    if (!token) return null

    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'http://localhost:5000/api'

    try {
      const response = await fetch(`${apiBase.replace(/\/$/, '')}/email/send-custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        return { sent: false, error: data?.message || data?.error || `HTTP ${response.status}` }
      }

      if (Boolean(data?.success)) {
        return { sent: true }
      }

      return { sent: false, error: data?.message || data?.error || 'Email failed' }
    } catch (error) {
      return { sent: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  const backendResult = await tryBackendSend()
  if (backendResult?.sent) return backendResult

  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      return { sent: false, error: text || backendResult?.error || `HTTP ${response.status}` }
    }

    const data = await response.json()
    if (Boolean(data?.sent)) {
      return { sent: true }
    }
    return { sent: false, error: data?.error || backendResult?.error }
  } catch (error) {
    return { sent: false, error: backendResult?.error || (error instanceof Error ? error.message : String(error)) }
  }
}

export function buildOrderSuccessEmail(params: {
  customerName?: string
  orderId?: string
  orderTotal?: string
  reviewUrl?: string
  refundUrl?: string
}): EmailPayload {
  const subject = 'Your order is confirmed - leave a review or request a refund'
  const reviewLink = params.reviewUrl || ''
  const refundLink = params.refundUrl || ''
  const customerName = params.customerName || 'Customer'
  const orderId = params.orderId || 'N/A'
  const orderTotal = params.orderTotal || ''

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="margin: 0 0 12px;">Thanks for your purchase, ${customerName}!</h2>
      <p style="margin: 0 0 10px;">Your order <strong>${orderId}</strong> has been confirmed${orderTotal ? ` for <strong>${orderTotal}</strong>` : ''}.</p>
      <p style="margin: 0 0 16px;">You can leave a review or request a refund anytime.</p>
      <div style="margin-bottom: 12px;">
        ${reviewLink ? `<a href="${reviewLink}" style="display:inline-block; background:#0f766e; color:#fff; padding:10px 16px; border-radius:8px; text-decoration:none; font-weight:700;">Leave a Review</a>` : ''}
        ${refundLink ? `<a href="${refundLink}" style="display:inline-block; margin-left:10px; background:#f97316; color:#fff; padding:10px 16px; border-radius:8px; text-decoration:none; font-weight:700;">Request a Refund</a>` : ''}
      </div>
      <p style="margin: 0; font-size: 13px; color:#555;">If you need help, reply to this email or contact support.</p>
    </div>
  `

  const text = `Thanks for your purchase, ${customerName}! Order ${orderId} confirmed${orderTotal ? ` for ${orderTotal}` : ''}. Leave a review: ${reviewLink} Request a refund: ${refundLink}`

  return {
    to: '',
    subject,
    html,
    text,
    metadata: { orderId },
  }
}

export function buildOrderPlacedEmail(params: {
  customerName?: string
  orderId?: string
  orderTotal?: string
  ordersUrl?: string
}): EmailPayload {
  const subject = 'Your order has been placed'
  const customerName = params.customerName || 'Customer'
  const orderId = params.orderId || 'N/A'
  const orderTotal = params.orderTotal || ''
  const ordersUrl = params.ordersUrl || ''

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="margin: 0 0 12px;">Order placed successfully!</h2>
      <p style="margin: 0 0 8px;">Hi ${customerName}, your order <strong>${orderId}</strong> is confirmed${orderTotal ? ` for <strong>${orderTotal}</strong>` : ''}.</p>
      <p style="margin: 0 0 16px;">We'll notify you when it ships.</p>
      ${ordersUrl ? `<a href="${ordersUrl}" style="display:inline-block; background:#0f766e; color:#fff; padding:10px 16px; border-radius:8px; text-decoration:none; font-weight:700;">View Orders</a>` : ''}
    </div>
  `

  const text = `Order placed! Order ${orderId} confirmed${orderTotal ? ` for ${orderTotal}` : ''}.`

  return {
    to: '',
    subject,
    html,
    text,
    metadata: { orderId },
  }
}

export function buildShipmentEmail(params: {
  customerName?: string
  orderId?: string
  status?: string
  trackingUrl?: string
}): EmailPayload {
  const subject = `Order update: ${params.status || 'Shipment update'}`
  const customerName = params.customerName || 'Customer'
  const orderId = params.orderId || 'N/A'
  const status = params.status || 'updated'
  const trackingUrl = params.trackingUrl || ''

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="margin: 0 0 12px;">Shipment update</h2>
      <p style="margin: 0 0 8px;">Hi ${customerName}, your order <strong>${orderId}</strong> is now <strong>${status}</strong>.</p>
      ${trackingUrl ? `<a href="${trackingUrl}" style="display:inline-block; background:#2563eb; color:#fff; padding:10px 16px; border-radius:8px; text-decoration:none; font-weight:700;">Track Order</a>` : ''}
    </div>
  `

  const text = `Order ${orderId} is now ${status}.`

  return {
    to: '',
    subject,
    html,
    text,
    metadata: { orderId, status },
  }
}

export function buildRegistrationEmail(params: {
  customerName?: string
  dashboardUrl?: string
}): EmailPayload {
  const subject = 'Welcome to RenewableZmart'
  const customerName = params.customerName || 'Customer'
  const dashboardUrl = params.dashboardUrl || ''

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="margin: 0 0 12px;">Welcome, ${customerName}!</h2>
      <p style="margin: 0 0 12px;">Your account is ready. Start exploring renewable energy products and services today.</p>
      ${dashboardUrl ? `<a href="${dashboardUrl}" style="display:inline-block; background:#0f766e; color:#fff; padding:10px 16px; border-radius:8px; text-decoration:none; font-weight:700;">Go to Dashboard</a>` : ''}
    </div>
  `

  const text = `Welcome to RenewableZmart, ${customerName}!`

  return {
    to: '',
    subject,
    html,
    text,
  }
}

