'use server'

import { createClient } from '@/lib/supabase/server'

export type ActivityState = { error: string } | null

const CONTACT_TYPES = new Set(['call', 'whatsapp', 'email', 'site_visit', 'meeting'])

export async function addActivityAction(
  leadId: string,
  prevState: ActivityState,
  formData: FormData
): Promise<ActivityState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const activity_type = formData.get('activity_type') as string
  const description = formData.get('description') as string
  const scheduledAtRaw = formData.get('scheduled_at') as string

  if (!activity_type) return { error: 'Activity type is required' }
  if (activity_type !== 'status_change' && !description?.trim()) {
    return { error: 'Description is required' }
  }

  const scheduled_at =
    activity_type === 'follow_up_scheduled' && scheduledAtRaw ? scheduledAtRaw : null

  const { error: insertError } = await supabase.from('lead_activities').insert({
    lead_id: leadId,
    activity_type,
    description: description?.trim() || null,
    performed_by: user.id,
    scheduled_at,
  })

  if (insertError) return { error: insertError.message }

  // Update last_contacted_at if this is a contact activity
  if (CONTACT_TYPES.has(activity_type)) {
    await supabase
      .from('leads')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', leadId)
  }

  return null
}

export async function changeStatusAction(
  leadId: string,
  prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const newStatus = formData.get('newStatus') as string
  if (!newStatus) return { error: 'Status is required' }

  // Get current lead status
  const { data: lead } = await supabase
    .from('leads')
    .select('status')
    .eq('id', leadId)
    .single()

  const oldStatus = lead?.status ?? 'unknown'

  const { error: updateError } = await supabase
    .from('leads')
    .update({ status: newStatus })
    .eq('id', leadId)

  if (updateError) return { error: updateError.message }

  await supabase.from('lead_activities').insert({
    lead_id: leadId,
    activity_type: 'status_change',
    description: `Status changed from ${oldStatus} to ${newStatus}`,
    performed_by: user.id,
  })

  return null
}

export async function updateScoreAction(
  leadId: string,
  prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const newScore = formData.get('newScore') as string
  if (!newScore) return { error: 'Score is required' }

  const { error } = await supabase.from('leads').update({ score: newScore }).eq('id', leadId)

  if (error) return { error: error.message }

  return null
}
