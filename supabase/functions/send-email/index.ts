import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const brevoApiKey = Deno.env.get('BREVO_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface EmailRequest {
  toEmail: string
  toName: string
  subject: string
  htmlContent: string
}

async function sendEmailViaBrevo(options: EmailRequest) {
  if (!brevoApiKey) {
    throw new Error('BREVO_API_KEY not configured')
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': brevoApiKey
    },
    body: JSON.stringify({
      to: [{ email: options.toEmail, name: options.toName }],
      sender: { email: 'noreply@contractorhq.co.nz', name: 'Contractor Hub' },
      subject: options.subject,
      htmlContent: options.htmlContent
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Brevo error: ${JSON.stringify(errorData)}`)
  }

  return { success: true }
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const body = await req.json()
    const { toEmail, toName, subject, htmlContent, type } = body

    if (!toEmail || !subject || !htmlContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send email via Brevo
    await sendEmailViaBrevo({
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
