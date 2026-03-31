'use server'

import { createClient } from '@/lib/supabase/server'

export type UnitActionState = { error: string; field?: string } | { success: true } | null

export type ProjectActionState =
  | { error: string; field?: string }
  | { success: true; projectId: string }
  | null

// ── Block Unit ───────────────────────────────────────────────────────────────

export async function blockUnitAction(
  unitId: string,
  prevState: UnitActionState,
  _formData: FormData
): Promise<UnitActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('units')
    .update({
      status: 'blocked',
      blocked_by: user.id,
      blocked_at: new Date().toISOString(),
    })
    .eq('id', unitId)
    .eq('status', 'available')
    .select('id')

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'Unit is no longer available' }

  return { success: true }
}

// ── Release Block ────────────────────────────────────────────────────────────

export async function releaseBlockAction(
  unitId: string,
  prevState: UnitActionState,
  _formData: FormData
): Promise<UnitActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('units')
    .update({ status: 'available', blocked_by: null, blocked_at: null })
    .eq('id', unitId)
    .eq('status', 'blocked')
    .select('id')

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'Unit is not currently blocked' }

  return { success: true }
}

// ── Update Notes ─────────────────────────────────────────────────────────────

export async function updateUnitNotesAction(
  unitId: string,
  prevState: UnitActionState,
  formData: FormData
): Promise<UnitActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const notes = (formData.get('notes') as string)?.trim() || null

  const { error } = await supabase.from('units').update({ notes }).eq('id', unitId)

  if (error) return { error: error.message }

  return { success: true }
}

// ── Add Unit ─────────────────────────────────────────────────────────────────

export async function addUnitAction(
  projectId: string,
  prevState: UnitActionState,
  formData: FormData
): Promise<UnitActionState> {
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
  if (!profile?.organization_id) return { error: 'No organization' }

  // Verify project belongs to org
  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()
  if (project?.organization_id !== profile.organization_id) return { error: 'Project not found' }

  const unit_number = (formData.get('unit_number') as string)?.trim()
  if (!unit_number) return { error: 'Unit number is required', field: 'unit_number' }

  const floorRaw = formData.get('floor') as string
  const floor = floorRaw?.trim() ? parseInt(floorRaw, 10) : null
  const block = (formData.get('block') as string)?.trim() || null
  const type = (formData.get('type') as string)?.trim() || ''
  const facing = (formData.get('facing') as string)?.trim() || null
  const parking_included = formData.get('parking_included') === 'on'

  const carpetRaw = formData.get('carpet_area_sqft') as string
  const carpet_area_sqft = carpetRaw?.trim() ? parseFloat(carpetRaw) : null
  const superRaw = formData.get('super_buildup_area_sqft') as string
  const super_buildup_area_sqft = superRaw?.trim() ? parseFloat(superRaw) : null
  const baseRaw = formData.get('base_price') as string
  const base_price = baseRaw?.trim() ? parseFloat(baseRaw) : null
  const totalRaw = formData.get('total_price') as string
  const total_price = totalRaw?.trim() ? parseFloat(totalRaw) : null

  const { error } = await supabase.from('units').insert({
    project_id: projectId,
    unit_number,
    floor,
    block,
    type,
    carpet_area_sqft,
    super_buildup_area_sqft,
    base_price,
    total_price,
    facing,
    parking_included,
    status: 'available',
  })

  if (error) return { error: error.message }

  return { success: true }
}

// ── Mark as Registered ───────────────────────────────────────────────────────

export async function markAsRegisteredAction(
  unitId: string,
  bookingId: string,
  prevState: UnitActionState,
  _formData: FormData
): Promise<UnitActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch booking to get client_profile_id
  const { data: booking } = await supabase
    .from('bookings')
    .select('client_profile_id')
    .eq('id', bookingId)
    .single()
  if (!booking) return { error: 'Booking not found' }

  // Update booking status
  const { error: bookingError } = await supabase
    .from('bookings')
    .update({ status: 'registered' })
    .eq('id', bookingId)
  if (bookingError) return { error: bookingError.message }

  // Update unit status
  const { error: unitError } = await supabase
    .from('units')
    .update({
      status: 'sold',
      sold_at: new Date().toISOString(),
      sold_to: booking.client_profile_id,
    })
    .eq('id', unitId)
  if (unitError) return { error: unitError.message }

  return { success: true }
}

// ── Bulk Add Units ────────────────────────────────────────────────────────────

interface BulkUnitRow {
  unit_number: string
  floor: number | null
  block: string | null
  type: string
  super_buildup_area_sqft: number | null
  base_price: number | null
  total_price: number | null
  parking_included: boolean
}

export async function bulkAddUnitsAction(
  projectId: string,
  prevState: UnitActionState,
  formData: FormData
): Promise<UnitActionState> {
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
  if (!profile?.organization_id) return { error: 'No organization' }

  // Verify project belongs to org
  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .single()
  if (project?.organization_id !== profile.organization_id) return { error: 'Project not found' }

  const unitsJson = formData.get('units_json') as string
  if (!unitsJson) return { error: 'No units provided' }

  let rows: BulkUnitRow[]
  try {
    rows = JSON.parse(unitsJson) as BulkUnitRow[]
  } catch {
    return { error: 'Invalid units data' }
  }

  if (!rows.length) return { error: 'No units to insert' }

  const { error } = await supabase.from('units').insert(
    rows.map((r) => ({
      project_id: projectId,
      unit_number: r.unit_number,
      floor: r.floor,
      block: r.block,
      type: r.type,
      super_buildup_area_sqft: r.super_buildup_area_sqft,
      base_price: r.base_price,
      total_price: r.total_price,
      facing: null,
      parking_included: r.parking_included,
      status: 'available' as const,
    }))
  )

  if (error) return { error: error.message }

  return { success: true }
}

// ── Create Project ────────────────────────────────────────────────────────────

export async function createProjectAction(
  prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
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
  if (!profile?.organization_id) return { error: 'No organization' }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Project name is required', field: 'name' }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const type = (formData.get('type') as string) || 'apartment'
  const status = (formData.get('status') as string) || 'upcoming'
  const address = (formData.get('address') as string)?.trim() || null
  const city = (formData.get('city') as string)?.trim() || null
  const rera_id = (formData.get('rera_id') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const brochure_url = (formData.get('brochure_url') as string)?.trim() || null

  const { data, error } = await supabase
    .from('projects')
    .insert({
      organization_id: profile.organization_id,
      name,
      slug,
      type,
      status,
      address,
      city,
      rera_id,
      description,
      brochure_url,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'A project with this name already exists' }
    return { error: error.message }
  }

  return { success: true, projectId: data.id }
}
