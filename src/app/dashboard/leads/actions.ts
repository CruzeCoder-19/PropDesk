'use server'

import { createClient } from '@/lib/supabase/server'

export type LeadFormState = { error: string; field?: string } | { success: true } | null

export async function createLeadAction(
  prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return { error: 'No organization found' }

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string

  if (!name?.trim()) return { error: 'Name is required', field: 'name' }
  if (!phone?.trim()) return { error: 'Phone is required', field: 'phone' }

  const whatsapp_number = (formData.get('whatsapp_number') as string) || null
  const email = (formData.get('email') as string) || null
  const source = (formData.get('source') as string) || 'other'
  const rawProjectId = formData.get('project_id') as string
  const project_id = rawProjectId && rawProjectId.trim() ? rawProjectId : null
  const rawBudgetMin = formData.get('budget_min') as string
  const rawBudgetMax = formData.get('budget_max') as string
  const budget_min = rawBudgetMin ? Number(rawBudgetMin) : null
  const budget_max = rawBudgetMax ? Number(rawBudgetMax) : null
  const preferred_unit_type = (formData.get('preferred_unit_type') as string) || null
  const notes = (formData.get('notes') as string) || null
  const rawAssignedTo = formData.get('assigned_to') as string
  const assigned_to = rawAssignedTo && rawAssignedTo.trim() ? rawAssignedTo : null

  const { error } = await supabase.from('leads').insert({
    organization_id: profile.organization_id,
    name: name.trim(),
    phone: phone.trim(),
    whatsapp_number,
    email,
    source,
    project_id,
    budget_min,
    budget_max,
    preferred_unit_type,
    notes,
    assigned_to,
    status: 'new',
    score: 'cold',
  })

  if (error) return { error: error.message }

  return { success: true }
}
