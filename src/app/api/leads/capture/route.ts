import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createWhatsAppClient } from '@/lib/whatsapp/client'
import crypto from 'crypto'

export const runtime = 'nodejs'

const VALID_SOURCES = [
  'website', 'facebook', 'instagram', 'google_ads', 'referral',
  'walk_in', 'justdial', '99acres', 'magicbricks', 'other',
] as const

// POST /api/leads/capture
// Header: X-API-Key: <org api_key>
// Body: { name, phone, email?, source?, project_slug?,
//         utm_source?, utm_medium?, utm_campaign?, organization_slug }
export async function POST(req: NextRequest) {
  // 1. Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, phone, organization_slug, email, source, project_slug,
          utm_source, utm_medium, utm_campaign } = body as Record<string, string | undefined>

  // 2. Validate required fields
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
  }
  if (!phone?.trim()) {
    return NextResponse.json({ error: 'Missing required field: phone' }, { status: 400 })
  }
  if (!organization_slug?.trim()) {
    return NextResponse.json({ error: 'Missing required field: organization_slug' }, { status: 400 })
  }

  // 3. Check API key header
  const providedKey = req.headers.get('x-api-key')
  if (!providedKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  const admin = createAdminClient()

  // 4. Look up org by slug
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('id, api_key')
    .eq('slug', organization_slug.trim())
    .single()

  if (orgErr || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // 5. Verify API key using constant-time comparison
  const a = Buffer.from(providedKey)
  const b = Buffer.from(org.api_key as string)
  const isValid = a.length === b.length && crypto.timingSafeEqual(a, b)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  // 6. Resolve project if slug provided (also fetch name + brochure_url for WhatsApp)
  let projectId: string | null = null
  let project: { id: string; name: string | null; brochure_url: string | null } | null = null
  if (project_slug?.trim()) {
    const { data: projectData, error: projectErr } = await admin
      .from('projects')
      .select('id, name, brochure_url')
      .eq('organization_id', org.id)
      .eq('slug', project_slug.trim())
      .single()

    if (projectErr || !projectData) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    project = projectData as { id: string; name: string | null; brochure_url: string | null }
    projectId = project.id
  }

  // 7. Validate source (fall back to 'website' if unknown)
  const resolvedSource = VALID_SOURCES.includes(source as typeof VALID_SOURCES[number])
    ? (source as string)
    : 'website'

  // 8. Insert lead
  const { data: lead, error: insertErr } = await admin
    .from('leads')
    .insert({
      organization_id: org.id,
      project_id:      projectId,
      name:            name.trim(),
      phone:           phone.trim(),
      email:           email?.trim() ?? null,
      source:          resolvedSource,
      status:          'new',
      score:           'cold',
      utm_source:      utm_source ?? null,
      utm_medium:      utm_medium ?? null,
      utm_campaign:    utm_campaign ?? null,
    })
    .select('id')
    .single()

  if (insertErr || !lead) {
    console.error('[leads/capture] insert error:', insertErr?.message)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  // 9. Fire-and-forget WhatsApp thank-you (and brochure if project has one)
  void createWhatsAppClient(org.id as string)
    .then(async (wa) => {
      await wa.sendThankYou(phone.trim(), name.trim(), { orgId: org.id as string })
      if (project?.brochure_url) {
        await wa.sendBrochure(
          phone.trim(),
          project.brochure_url,
          project.name ?? '',
          { orgId: org.id as string }
        )
      }
    })
    .catch((e) => console.error('[leads/capture] WhatsApp error:', e))

  return NextResponse.json({ success: true, lead_id: lead.id })
}
