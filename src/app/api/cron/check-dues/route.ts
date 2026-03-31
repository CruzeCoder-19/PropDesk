import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createWhatsAppClient } from '@/lib/whatsapp/client'
import { formatINR } from '@/lib/format'

export const runtime = 'nodejs'

// Vercel Cron / external scheduler calls:  GET /api/cron/check-dues
// Secured with Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]         // "YYYY-MM-DD"

  const sevenDaysLater = new Date(today)
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
  const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0]

  let dueSent = 0
  let overdueSent = 0
  const errors: string[] = []

  // ── 1. upcoming → due (due_date within next 7 days) ────────────────────────
  const { data: dueMilestones, error: dueErr } = await admin
    .from('payment_milestones')
    .select(`
      id, milestone_name, amount_due, due_date,
      booking:bookings!booking_id(
        id, organization_id, client_profile_id,
        client:profiles!client_profile_id(full_name, phone),
        unit:units!unit_id(unit_number),
        org:organizations!organization_id(name)
      )
    `)
    .eq('status', 'upcoming')
    .gte('due_date', todayStr)
    .lte('due_date', sevenDaysLaterStr)

  if (dueErr) {
    errors.push(`fetch due milestones: ${dueErr.message}`)
  } else {
    for (const m of dueMilestones ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const booking = (m as any).booking as {
        id: string
        organization_id: string
        client_profile_id: string
        client: { full_name: string | null; phone: string | null } | null
        unit: { unit_number: string } | null
        org: { name: string } | null
      } | null

      if (!booking) continue

      // Update milestone status to 'due'
      const { error: updateErr } = await admin
        .from('payment_milestones')
        .update({ status: 'due' })
        .eq('id', m.id)
        .eq('status', 'upcoming')   // guard against race

      if (updateErr) {
        errors.push(`update due ${m.id}: ${updateErr.message}`)
        continue
      }

      const clientName = booking.client?.full_name ?? 'Valued Customer'
      const unitNumber = booking.unit?.unit_number ?? 'your unit'
      const orgName    = booking.org?.name ?? 'PropDesk'
      const dueDate    = new Date(m.due_date as string).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
      const amount = formatINR(Number(m.amount_due))

      const messageText =
        `Dear ${clientName}, your payment of ${amount} for ${unitNumber}` +
        ` (${m.milestone_name as string}) is due on ${dueDate}.` +
        ` Please arrange payment. — ${orgName}`

      const { data: notif, error: notifErr } = await admin.from('notifications').insert({
        organization_id:   booking.organization_id,
        booking_id:        booking.id,
        milestone_id:      m.id,
        client_profile_id: booking.client_profile_id,
        type:              'dues_reminder',
        channel:           'whatsapp',
        message_text:      messageText,
        status:            'pending',
      }).select('id').single()

      if (notifErr) {
        errors.push(`insert notification (due) ${m.id}: ${notifErr.message}`)
      } else {
        dueSent++
        void createWhatsAppClient(booking.organization_id)
          .then((wa) => wa.sendDueReminder(
            booking.client?.phone ?? '',
            clientName, amount, dueDate, unitNumber,
            { existingNotifId: notif!.id }
          ))
          .catch((e) => errors.push(`whatsapp due ${m.id}: ${String(e)}`))
      }
    }
  }

  // ── 2. upcoming/due → overdue (due_date in the past) ───────────────────────
  const { data: overdueMilestones, error: overdueErr } = await admin
    .from('payment_milestones')
    .select(`
      id, milestone_name, amount_due, due_date,
      booking:bookings!booking_id(
        id, organization_id, client_profile_id,
        client:profiles!client_profile_id(full_name, phone),
        unit:units!unit_id(unit_number),
        org:organizations!organization_id(name)
      )
    `)
    .in('status', ['upcoming', 'due'])
    .lt('due_date', todayStr)

  if (overdueErr) {
    errors.push(`fetch overdue milestones: ${overdueErr.message}`)
  } else {
    for (const m of overdueMilestones ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const booking = (m as any).booking as {
        id: string
        organization_id: string
        client_profile_id: string
        client: { full_name: string | null; phone: string | null } | null
        unit: { unit_number: string } | null
        org: { name: string } | null
      } | null

      if (!booking) continue

      // Update milestone status to 'overdue'
      const { error: updateErr } = await admin
        .from('payment_milestones')
        .update({ status: 'overdue' })
        .eq('id', m.id)
        .in('status', ['upcoming', 'due'])   // guard against race

      if (updateErr) {
        errors.push(`update overdue ${m.id}: ${updateErr.message}`)
        continue
      }

      const clientName = booking.client?.full_name ?? 'Valued Customer'
      const unitNumber = booking.unit?.unit_number ?? 'your unit'
      const orgName    = booking.org?.name ?? 'PropDesk'
      const dueDate    = new Date(m.due_date as string).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
      const amount = formatINR(Number(m.amount_due))

      const messageText =
        `OVERDUE ALERT: Dear ${clientName}, your payment of ${amount} for ${unitNumber}` +
        ` (${m.milestone_name as string}) was due on ${dueDate} and is now overdue.` +
        ` Please pay immediately to avoid delays. — ${orgName}`

      const { data: notif, error: notifErr } = await admin.from('notifications').insert({
        organization_id:   booking.organization_id,
        booking_id:        booking.id,
        milestone_id:      m.id,
        client_profile_id: booking.client_profile_id,
        type:              'overdue_alert',
        channel:           'whatsapp',
        message_text:      messageText,
        status:            'pending',
      }).select('id').single()

      if (notifErr) {
        errors.push(`insert notification (overdue) ${m.id}: ${notifErr.message}`)
      } else {
        overdueSent++
        void createWhatsAppClient(booking.organization_id)
          .then((wa) => wa.sendDueReminder(
            booking.client?.phone ?? '',
            clientName, amount, dueDate, unitNumber,
            { existingNotifId: notif!.id }
          ))
          .catch((e) => errors.push(`whatsapp overdue ${m.id}: ${String(e)}`))
      }
    }
  }

  return NextResponse.json({
    ok: true,
    due_notifications_created: dueSent,
    overdue_notifications_created: overdueSent,
    errors: errors.length > 0 ? errors : undefined,
  })
}
