import type { NextApiRequest, NextApiResponse } from 'next'

type EmailPayload = {
  to: string
  subject: string
  html: string
  text?: string
  metadata?: Record<string, any>
}

const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3/mail/send'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const payload = req.body as EmailPayload
  if (!payload?.to || !payload?.subject || !payload?.html) {
    return res.status(400).json({ error: 'Missing required email fields' })
  }

  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@renewablezmart.com'
  const fromName = process.env.SENDGRID_FROM_NAME || 'RenewableZmart'

  if (!apiKey) {
    return res.status(200).json({ sent: false, error: 'SendGrid API key not configured' })
  }

  try {
    const response = await fetch(SENDGRID_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: payload.to }],
            subject: payload.subject,
          },
        ],
        from: { email: fromEmail, name: fromName },
        content: [
          { type: 'text/html', value: payload.html },
          ...(payload.text ? [{ type: 'text/plain', value: payload.text }] : []),
        ],
        custom_args: payload.metadata || {},
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return res.status(200).json({ sent: false, error: text || `HTTP ${response.status}` })
    }

    return res.status(200).json({ sent: true })
  } catch (error) {
    return res.status(200).json({
      sent: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
