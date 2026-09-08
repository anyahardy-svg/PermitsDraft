import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const resendApiKey = Deno.env.get('RESEND_API_KEY')

interface EmailRequest {
  toEmail: string
  toName: string
  subject: string
  htmlContent: string
}

function formatEmailAddress(email: string, name?: string) {
  const trimmedEmail = String(email || '').trim()
  const trimmedName = String(name || '').trim()

  if (!trimmedName) {
    return trimmedEmail
  }

  const escapedName = trimmedName.replace(/"/g, '\\"')
  return `"${escapedName}" <${trimmedEmail}>`
}

async function sendEmailViaResend(options: EmailRequest) {
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY not configured')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: formatEmailAddress('noreply@contractorhq.co.nz', 'Contractor Hub'),
      to: [formatEmailAddress(options.toEmail, options.toName)],
      subject: options.subject,
      html: options.htmlContent,
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message = errorData.message || errorData.error || response.statusText
    throw new Error(`Resend error: ${message}`)
  }

  return { success: true }
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const body = await req.json()
    const { toEmail, toName, subject, htmlContent } = body

    if (!toEmail || !subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    await sendEmailViaResend({
      toEmail,
      toName: toName || 'Recipient',
      subject,
      htmlContent
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Email function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
