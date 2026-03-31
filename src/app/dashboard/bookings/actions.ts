'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createWhatsAppClient } from '@/lib/whatsapp/client'

export type BookingActionState =
  | { error: string; field?: string }
  | { success: true; bookingId: string }
  | null

export type SimpleActionState =
  | { error: string; field?: string }
  | { success: true }
  | null

// ── Create Booking ─────────────────────────────────────────────────────────────

interface MilestoneInsert {
  milestone_name: string
  milestone_order: number
  amount_due: number
  due_date: string | null
}

export async function createBookingAction(
  prevState: BookingActionState,
  formData: FormData
): Promise<BookingActionState> {
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
  const orgId = profile.organization_id

  const clientMode = formData.get('client_mode') as 'lead' | 'new'
  const unitId = formData.get('unit_id') as string
  const bookingDate = (formData.get('booking_date') as string) || new Date().toISOString().slice(0, 10)
  const agreementValue = parseFloat(formData.get('agreement_value') as string)
  const gstAmount = parseFloat(formData.get('gst_amount') as string) || 0
  const totalAmount = parseFloat(formData.get('total_amount') as string)
  const paymentPlan = (formData.get('payment_plan') as string) || 'construction_linked'
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!unitId) return { error: 'Unit is required' }
  if (isNaN(agreementValue) || agreementValue <= 0) return { error: 'Valid agreement value is required' }
  if (isNaN(totalAmount) || totalAmount <= 0) return { error: 'Valid total amount is required' }

  // ── Resolve client_profile_id ───────────────────────────────────────────────
  let clientProfileId: string

  if (clientMode === 'lead') {
    const leadId = formData.get('lead_id') as string
    if (!leadId) return { error: 'Lead is required' }

    const { data: lead } = await supabase
      .from('leads')
      .select('id, name, phone, email')
      .eq('id', leadId)
      .single()
    if (!lead) return { error: 'Lead not found' }

    // Check if a client profile already exists with this email
    if (lead.email) {
      const admin = createAdminClient()
      const { data: existingUser } = await admin.auth.admin.getUserById(lead.email)
        .catch(() => ({ data: null })) as { data: { user?: { id: string } } | null }
      // getUserById doesn't work with email; use listUsers with filter
      const { data: usersData } = await admin.auth.admin.listUsers()
      const existingAuthUser = usersData?.users?.find((u) => u.email === lead.email)
      if (existingAuthUser) {
        clientProfileId = existingAuthUser.id
      } else {
        // Create new auth user for lead
        const { data: newUser, error: createError } = await admin.auth.admin.createUser({
          email: lead.email,
          password: crypto.randomUUID(),
          email_confirm: true,
        })
        if (createError || !newUser.user) return { error: 'Failed to create client account: ' + (createError?.message ?? '') }
        clientProfileId = newUser.user.id
        await admin
          .from('profiles')
          .update({ full_name: lead.name, phone: lead.phone, role: 'client', organization_id: orgId })
          .eq('id', clientProfileId)
      }
    } else {
      // No email on lead — create a placeholder email-based account
      const placeholderEmail = `lead-${leadId}@propdesk.internal`
      const admin = createAdminClient()
      const { data: usersData } = await admin.auth.admin.listUsers()
      const existingAuthUser = usersData?.users?.find((u) => u.email === placeholderEmail)
      if (existingAuthUser) {
        clientProfileId = existingAuthUser.id
      } else {
        const { data: newUser, error: createError } = await admin.auth.admin.createUser({
          email: placeholderEmail,
          password: crypto.randomUUID(),
          email_confirm: true,
        })
        if (createError || !newUser.user) return { error: 'Failed to create client account: ' + (createError?.message ?? '') }
        clientProfileId = newUser.user.id
        await admin
          .from('profiles')
          .update({ full_name: lead.name, phone: lead.phone, role: 'client', organization_id: orgId })
          .eq('id', clientProfileId)
      }
    }
  } else {
    // New client
    const newName = (formData.get('new_client_name') as string)?.trim()
    const newPhone = (formData.get('new_client_phone') as string)?.trim()
    const newEmail = (formData.get('new_client_email') as string)?.trim()
    if (!newName) return { error: 'Client name is required', field: 'new_client_name' }
    if (!newPhone) return { error: 'Client phone is required', field: 'new_client_phone' }
    if (!newEmail) return { error: 'Client email is required', field: 'new_client_email' }

    const admin = createAdminClient()
    const { data: usersData } = await admin.auth.admin.listUsers()
    const existingAuthUser = usersData?.users?.find((u) => u.email === newEmail)
    if (existingAuthUser) {
      clientProfileId = existingAuthUser.id
    } else {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: newEmail,
        password: crypto.randomUUID(),
        email_confirm: true,
      })
      if (createError || !newUser.user) return { error: 'Failed to create client account: ' + (createError?.message ?? '') }
      clientProfileId = newUser.user.id
      await admin
        .from('profiles')
        .update({ full_name: newName, phone: newPhone, role: 'client', organization_id: orgId })
        .eq('id', clientProfileId)
    }
  }

  // ── Verify unit belongs to org ──────────────────────────────────────────────
  const { data: unit } = await supabase
    .from('units')
    .select('id, project:projects!inner(organization_id)')
    .eq('id', unitId)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((unit?.project as any)?.organization_id !== orgId) return { error: 'Unit not found' }

  // ── Parse milestones ────────────────────────────────────────────────────────
  const milestonesJson = formData.get('milestones_json') as string
  let milestones: MilestoneInsert[] = []
  if (milestonesJson) {
    try {
      milestones = JSON.parse(milestonesJson) as MilestoneInsert[]
    } catch {
      return { error: 'Invalid milestones data' }
    }
  }

  // ── Insert booking ──────────────────────────────────────────────────────────
  const leadIdForBooking = clientMode === 'lead' ? (formData.get('lead_id') as string) || null : null

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      unit_id: unitId,
      lead_id: leadIdForBooking,
      organization_id: orgId,
      client_profile_id: clientProfileId,
      booking_date: bookingDate,
      agreement_value: agreementValue,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      payment_plan: paymentPlan,
      status: 'token_paid',
      notes,
    })
    .select('id')
    .single()

  if (bookingError) return { error: bookingError.message }
  const bookingId = booking.id

  // ── Insert milestones ───────────────────────────────────────────────────────
  if (milestones.length > 0) {
    const { error: msError } = await supabase.from('payment_milestones').insert(
      milestones.map((m) => ({
        booking_id: bookingId,
        milestone_name: m.milestone_name,
        milestone_order: m.milestone_order,
        amount_due: m.amount_due,
        due_date: m.due_date || null,
        status: 'upcoming' as const,
      }))
    )
    if (msError) return { error: msError.message }
  }

  // ── Update unit status → booked ─────────────────────────────────────────────
  await supabase.from('units').update({ status: 'booked' }).eq('id', unitId)

  // ── Update lead status → won ────────────────────────────────────────────────
  if (leadIdForBooking) {
    await supabase.from('leads').update({ status: 'won' }).eq('id', leadIdForBooking)
  }

  // ── Fire-and-forget WhatsApp booking confirmation ───────────────────────────
  const adminClient = createAdminClient()
  const [{ data: clientData }, { data: unitData }] = await Promise.all([
    adminClient.from('profiles').select('full_name, phone').eq('id', clientProfileId).single(),
    adminClient.from('units').select('unit_number, project:projects!project_id(name)').eq('id', unitId).single(),
  ])

  void createWhatsAppClient(orgId)
    .then((wa) => {
      if (clientData?.phone) {
        return wa.sendBookingConfirmation(
          clientData.phone,
          clientData.full_name ?? 'Client',
          unitData?.unit_number ?? '',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (unitData?.project as any)?.name ?? '',
          { orgId, bookingId }
        )
      }
    })
    .catch(() => { /* WhatsApp failure must not affect booking success */ })

  return { success: true, bookingId }
}

// ── Record Payment ─────────────────────────────────────────────────────────────

export async function recordPaymentAction(
  milestoneId: string,
  prevState: SimpleActionState,
  formData: FormData
): Promise<SimpleActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const paid_amount = parseFloat(formData.get('paid_amount') as string)
  const paid_date = (formData.get('paid_date') as string) || null
  const receipt_url = (formData.get('receipt_url') as string)?.trim() || null

  if (isNaN(paid_amount) || paid_amount <= 0) return { error: 'Valid amount is required' }

  const { error } = await supabase
    .from('payment_milestones')
    .update({ status: 'paid', paid_amount, paid_date, receipt_url })
    .eq('id', milestoneId)

  if (error) return { error: error.message }

  return { success: true }
}

// ── Change Booking Status ──────────────────────────────────────────────────────

export async function changeBookingStatusAction(
  bookingId: string,
  prevState: SimpleActionState,
  formData: FormData
): Promise<SimpleActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const status = formData.get('status') as string
  if (!status) return { error: 'Status is required' }

  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)

  if (error) return { error: error.message }

  return { success: true }
}

// ── Upload Booking Document ────────────────────────────────────────────────────

export async function uploadBookingDocumentAction(
  bookingId: string,
  prevState: SimpleActionState,
  formData: FormData
): Promise<SimpleActionState> {
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

  // Verify booking belongs to org
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('organization_id', profile.organization_id)
    .single()
  if (!booking) return { error: 'Booking not found' }

  const document_type = formData.get('document_type') as string
  const file_name = formData.get('file_name') as string
  const file_url = formData.get('file_url') as string
  const file_size_kb = formData.get('file_size_kb')
    ? parseInt(formData.get('file_size_kb') as string, 10)
    : null
  const visible_to_client = formData.get('visible_to_client') === 'true'

  if (!document_type || !file_name || !file_url) return { error: 'Missing document fields' }

  const { error } = await supabase.from('documents').insert({
    booking_id: bookingId,
    organization_id: profile.organization_id,
    uploaded_by: user.id,
    document_type,
    file_name,
    file_url,
    file_size_kb,
    visible_to_client,
  })

  if (error) return { error: error.message }

  return { success: true }
}
