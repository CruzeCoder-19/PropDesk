'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── State types ───────────────────────────────────────────────────────────────

export type OrgState      = { error: string } | { success: true } | null
export type ProfileState  = { error: string } | { success: true } | null
export type PasswordState = { error: string } | { success: true } | null
export type SmsState      = { error: string } | { success: true } | null

// ── Shared helper ─────────────────────────────────────────────────────────────

async function getActorProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return null

  return { supabase, userId: user.id, orgId: profile.organization_id as string, role: profile.role as string }
}

// ── 1. Update organisation ────────────────────────────────────────────────────

export async function updateOrgAction(
  _prevState: OrgState,
  formData: FormData,
): Promise<OrgState> {
  const actor = await getActorProfile()
  if (!actor) return { error: 'Not authenticated' }
  if (actor.role !== 'admin') return { error: 'Only admins can update organisation settings' }

  const { supabase, orgId } = actor

  const fields = {
    name:          (formData.get('name')          as string)?.trim() || undefined,
    address:       (formData.get('address')        as string)?.trim() || undefined,
    city:          (formData.get('city')           as string)?.trim() || undefined,
    state:         (formData.get('state')          as string)?.trim() || undefined,
    gst_number:    (formData.get('gst_number')     as string)?.trim() || undefined,
    rera_number:   (formData.get('rera_number')    as string)?.trim() || undefined,
    contact_email: (formData.get('contact_email')  as string)?.trim() || undefined,
    contact_phone: (formData.get('contact_phone')  as string)?.trim() || undefined,
    logo_url:      (formData.get('logo_url')       as string)?.trim() || undefined,
    updated_at:    new Date().toISOString(),
  }

  if (!fields.name) return { error: 'Organisation name is required' }

  const { error } = await supabase
    .from('organizations')
    .update(fields)
    .eq('id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

// ── 2. Update profile ─────────────────────────────────────────────────────────

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const actor = await getActorProfile()
  if (!actor) return { error: 'Not authenticated' }

  const { supabase, userId } = actor

  const fields = {
    full_name:  (formData.get('full_name')  as string)?.trim() || undefined,
    phone:      (formData.get('phone')      as string)?.trim() || undefined,
    avatar_url: (formData.get('avatar_url') as string)?.trim() || undefined,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

// ── 3. Change password ────────────────────────────────────────────────────────

export async function changePasswordAction(
  _prevState: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const actor = await getActorProfile()
  if (!actor) return { error: 'Not authenticated' }

  const newPassword     = (formData.get('new_password')     as string) ?? ''
  const confirmPassword = (formData.get('confirm_password') as string) ?? ''

  if (newPassword.length < 8) return { error: 'Password must be at least 8 characters' }
  if (newPassword !== confirmPassword) return { error: 'Passwords do not match' }

  const { supabase } = actor
  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) return { error: error.message }

  return { success: true }
}

// ── 4. Save SMS integration settings ─────────────────────────────────────────

export async function saveSmsSettingsAction(
  _prevState: SmsState,
  formData: FormData,
): Promise<SmsState> {
  const actor = await getActorProfile()
  if (!actor) return { error: 'Not authenticated' }
  if (actor.role !== 'admin' && actor.role !== 'sales_manager') {
    return { error: 'Not authorized' }
  }

  const { orgId } = actor
  const admin = createAdminClient()

  const smsProvider  = (formData.get('sms_provider')  as string) ?? 'msg91'
  const smsApiKey    = (formData.get('sms_api_key')   as string)?.trim() ?? ''
  const smsSenderId  = (formData.get('sms_sender_id') as string)?.trim() ?? ''

  // Read-merge-upsert: preserve existing settings (e.g. whatsapp)
  const { data: current } = await admin
    .from('organization_settings')
    .select('settings')
    .eq('organization_id', orgId)
    .single()

  const existing = (current?.settings ?? {}) as Record<string, unknown>
  const merged   = {
    ...existing,
    sms: { provider: smsProvider, api_key: smsApiKey, sender_id: smsSenderId },
  }

  const { error } = await admin
    .from('organization_settings')
    .upsert(
      { organization_id: orgId, settings: merged, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id' },
    )

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  return { success: true }
}
