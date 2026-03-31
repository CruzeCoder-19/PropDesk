'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createWhatsAppClient } from '@/lib/whatsapp/client'

export type WhatsAppSettingsState =
  | { error: string }
  | { success: true }
  | null

export type TestConnectionState =
  | { error: string }
  | { success: true; message: string }
  | null

async function getOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return null
  if (profile.role === 'salesperson') return null
  return profile.organization_id
}

export async function saveWhatsAppSettings(
  _prevState: WhatsAppSettingsState,
  formData: FormData
): Promise<WhatsAppSettingsState> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Not authorized' }

  const provider   = (formData.get('provider') as string)?.trim() || 'interakt'
  const api_key    = (formData.get('api_key') as string)?.trim() || ''
  const thank_you             = (formData.get('thank_you') as string)?.trim() || ''
  const brochure              = (formData.get('brochure') as string)?.trim() || ''
  const due_reminder          = (formData.get('due_reminder') as string)?.trim() || ''
  const booking_confirmation  = (formData.get('booking_confirmation') as string)?.trim() || ''

  const whatsappSettings = {
    provider,
    api_key,
    templates: { thank_you, brochure, due_reminder, booking_confirmation },
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('organization_settings')
    .upsert(
      {
        organization_id: orgId,
        settings: { whatsapp: whatsappSettings },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings/whatsapp')
  return { success: true }
}

export async function testWhatsAppConnection(
  _prevState: TestConnectionState,
  _formData: FormData
): Promise<TestConnectionState> {
  const orgId = await getOrgId()
  if (!orgId) return { error: 'Not authorized' }

  try {
    const wa = await createWhatsAppClient(orgId)
    await wa.sendThankYou('0000000000', 'Test User', { orgId })
    return { success: true, message: 'Test message logged to console. Check your server logs.' }
  } catch (e) {
    return { error: String(e) }
  }
}
