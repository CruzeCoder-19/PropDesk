import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export const runtime = 'nodejs'

// GET /api/leads/facebook
// Facebook calls this once to verify the webhook during setup.
// Query params: hub.mode, hub.verify_token, hub.challenge
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode         = params.get('hub.mode')
  const verifyToken  = params.get('hub.verify_token')
  const challenge    = params.get('hub.challenge')

  if (
    mode === 'subscribe' &&
    verifyToken === process.env.FACEBOOK_VERIFY_TOKEN
  ) {
    // Respond with the challenge as plain text — Facebook requires this exact format
    return new Response(challenge ?? '', { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST /api/leads/facebook?org=<org_slug>
// Facebook sends a lead event notification. We process field_data to insert a lead.
// Header: X-Hub-Signature-256: sha256=<hmac>
export async function POST(req: NextRequest) {
  // 1. Read raw body first — required for HMAC; req.json() would consume the stream
  const arrayBuffer = await req.arrayBuffer()
  const rawBody = Buffer.from(arrayBuffer)

  // 2. Verify HMAC signature if FB_APP_SECRET is configured
  const signature = req.headers.get('x-hub-signature-256')
  const appSecret = process.env.FB_APP_SECRET

  if (appSecret) {
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 403 })
    }
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
    const sigBuf  = Buffer.from(signature)
    const expBuf  = Buffer.from(expected)
    const sigValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)
    if (!sigValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
  } else {
    console.warn('[facebook-webhook] FB_APP_SECRET not set — skipping signature verification')
  }

  // 3. Parse payload
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 4. Only handle page-level leadgen events
  if (payload.object !== 'page') {
    return NextResponse.json({ ignored: true })
  }

  // 5. Determine org slug (query param preferred, header fallback)
  const orgSlug = req.nextUrl.searchParams.get('org') ?? req.headers.get('x-org-slug')
  if (!orgSlug) {
    // Return 200 so Facebook does not retry endlessly
    return NextResponse.json({ error: 'org slug required' })
  }

  const admin = createAdminClient()

  // 6. Look up org
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  if (orgErr || !org) {
    console.error('[facebook-webhook] org not found:', orgSlug)
    return NextResponse.json({ error: 'Organization not found' })
  }

  // 7. Process each leadgen change
  const entries = (payload.entry as Array<Record<string, unknown>>) ?? []
  let inserted = 0

  for (const entry of entries) {
    const changes = (entry.changes as Array<Record<string, unknown>>) ?? []
    for (const change of changes) {
      if (change.field !== 'leadgen') continue

      const value = change.value as Record<string, unknown>

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fieldData = value.field_data as Array<{ name: string; values: string[] }> | undefined

      if (!fieldData) {
        // field_data is absent when Facebook sends a notification-only webhook.
        // Fetch the actual lead data via the Graph API:
        //   GET https://graph.facebook.com/v19.0/{leadgen_id}
        //     ?fields=field_data
        //     &access_token=<PAGE_ACCESS_TOKEN>
        // Then parse field_data from that response.
        console.log('[facebook-webhook] field_data absent for leadgen_id:', value.leadgen_id)
        continue
      }

      // Map Facebook field names to our lead fields
      const get = (name: string) =>
        fieldData.find((f) => f.name === name)?.values[0] ?? null

      const fullName = get('full_name') ?? get('first_name')
      const phone    = get('phone_number') ?? get('phone')
      const email    = get('email')

      if (!phone) {
        console.warn('[facebook-webhook] skipping entry with no phone:', value.leadgen_id)
        continue
      }

      const { error: insertErr } = await admin.from('leads').insert({
        organization_id: org.id,
        name:            fullName ?? 'Facebook Lead',
        phone:           phone,
        email:           email ?? null,
        source:          'facebook',
        status:          'new',
        score:           'cold',
      })

      if (insertErr) {
        console.error('[facebook-webhook] insert error:', insertErr.message)
      } else {
        inserted++
      }
    }
  }

  // Always return 200 — Facebook retries on non-200 responses
  return NextResponse.json({ success: true, leads_inserted: inserted })
}
