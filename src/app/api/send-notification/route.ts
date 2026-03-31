import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// POST /api/send-notification
// Body: { notificationId: string }
//
// Reads the notification record, dispatches the message (currently console-logged),
// and marks the notification as 'sent'.
//
// ── MSG91 Integration (TODO) ────────────────────────────────────────────────
// To integrate MSG91, replace the console.log block below with:
//
//   const MSG91_AUTH_KEY  = process.env.MSG91_AUTH_KEY   // e.g. "425431AaBC..."
//   const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID // e.g. "6487f0a7d6fc0..."
//
//   const response = await fetch('https://api.msg91.com/api/v5/flow/', {
//     method: 'POST',
//     headers: {
//       'authkey': MSG91_AUTH_KEY!,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       template_id: MSG91_TEMPLATE_ID,
//       recipients: [
//         {
//           mobiles: `91${clientPhone}`,   // country code prefix
//           // Template variable substitutions:
//           client_name:    variables.client_name,
//           amount:         variables.amount,
//           unit_number:    variables.unit_number,
//           milestone_name: variables.milestone_name,
//           due_date:       variables.due_date,
//           org_name:       variables.org_name,
//         },
//       ],
//     }),
//   })
//
//   if (!response.ok) throw new Error(`MSG91 error: ${await response.text()}`)
//
// Alternatively, for Twilio:
//   import twilio from 'twilio'
//   const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
//   await client.messages.create({
//     body: notification.message_text,
//     from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
//     to:   `whatsapp:+91${clientPhone}`,
//   })
// ────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth: only logged-in staff may trigger manual sends
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let notificationId: string
  try {
    const body = await req.json()
    notificationId = body.notificationId
    if (!notificationId) throw new Error('missing notificationId')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch the notification + related client profile
  const { data: notification, error: fetchErr } = await admin
    .from('notifications')
    .select(`
      id, type, channel, message_text, status, organization_id,
      client:profiles!client_profile_id(full_name, phone),
      milestone:payment_milestones!milestone_id(milestone_name, amount_due, due_date),
      booking:bookings!booking_id(
        unit:units!unit_id(unit_number),
        org:organizations!organization_id(name)
      )
    `)
    .eq('id', notificationId)
    .single()

  if (fetchErr || !notification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  if (notification.status === 'sent') {
    return NextResponse.json({ error: 'Already sent' }, { status: 409 })
  }

  // Verify the caller belongs to the same organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (
    !profile ||
    profile.organization_id !== notification.organization_id ||
    !['admin', 'sales_manager'].includes(profile.role)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client  = (notification as any).client as { full_name: string | null; phone: string | null } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const booking = (notification as any).booking as {
    unit: { unit_number: string } | null
    org:  { name: string } | null
  } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const milestone = (notification as any).milestone as {
    milestone_name: string
    amount_due: number
    due_date: string | null
  } | null

  const clientPhone = client?.phone ?? null

  // ── Dispatch ────────────────────────────────────────────────────────────────
  // TODO: Replace this block with MSG91 / Twilio call (see comments above).
  console.log('[send-notification] Dispatching notification:', {
    id:          notificationId,
    type:        notification.type,
    channel:     notification.channel,
    to_phone:    clientPhone,
    to_name:     client?.full_name,
    unit:        booking?.unit?.unit_number,
    org:         booking?.org?.name,
    milestone:   milestone?.milestone_name,
    due_date:    milestone?.due_date,
    message:     notification.message_text,
  })
  // ────────────────────────────────────────────────────────────────────────────

  // Mark as sent
  const { error: updateErr } = await admin
    .from('notifications')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Notification sent' })
}
