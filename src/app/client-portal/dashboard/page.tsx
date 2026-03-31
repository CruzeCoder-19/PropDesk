import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCrores, formatINR } from '@/lib/format'
import { BOOKING_STATUS_BADGE, BOOKING_STATUS_LABELS } from '@/lib/booking-constants'

interface Milestone {
  id: string
  milestone_name: string
  milestone_order: number
  amount_due: number
  due_date: string | null
  status: string
  paid_amount: number | null
  paid_date: string | null
  receipt_url: string | null
}

export default async function ClientDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client-portal/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (supabase as any)
    .from('bookings')
    .select(`
      id, status, agreement_value, total_amount, gst_amount, payment_plan, booking_date,
      unit:units(unit_number, block, floor, type, total_price, project:projects(name)),
      milestones:payment_milestones(
        id, milestone_name, milestone_order, amount_due, due_date,
        status, paid_amount, paid_date, receipt_url
      )
    `)
    .eq('client_profile_id', user.id)
    .order('milestone_order', { referencedTable: 'payment_milestones', ascending: true })
    .single()

  const firstName = (profile?.full_name ?? 'there').split(' ')[0]

  if (!booking) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}</h1>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            No booking found for your account. Please contact your builder.
          </p>
        </div>
      </div>
    )
  }

  const unit = booking.unit as {
    unit_number: string
    block: string | null
    floor: number | null
    type: string
    total_price: number | null
    project: { name: string }
  } | null

  const milestones = (booking.milestones as Milestone[] | null) ?? []
  const sorted = [...milestones].sort((a, b) => a.milestone_order - b.milestone_order)

  const totalPaid = sorted
    .filter((m) => m.status === 'paid')
    .reduce((s, m) => s + (m.paid_amount ?? m.amount_due), 0)
  const totalPending = booking.total_amount - totalPaid
  const paidPercent = booking.total_amount > 0
    ? Math.min(100, Math.round((totalPaid / booking.total_amount) * 100))
    : 0

  const nextDue =
    sorted.find((m) => m.status === 'overdue') ??
    sorted.find((m) => m.status === 'due') ??
    sorted.find((m) => m.status === 'upcoming')

  const recentPayments = [...sorted]
    .filter((m) => m.status === 'paid')
    .sort((a, b) => {
      if (!a.paid_date) return 1
      if (!b.paid_date) return -1
      return new Date(b.paid_date).getTime() - new Date(a.paid_date).getTime()
    })
    .slice(0, 3)

  function floorLabel(floor: number | null) {
    if (floor === null) return null
    return floor === 0 ? 'Ground Floor' : `Floor ${floor}`
  }

  const unitMeta = [unit?.type, floorLabel(unit?.floor ?? null), unit?.block]
    .filter(Boolean)
    .join(' · ')

  const nextDueIsUrgent = nextDue?.status === 'overdue' || nextDue?.status === 'due'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}</h1>

      {/* Property card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
          {unit?.project?.name ?? 'Your Property'}
        </p>
        <p className="text-3xl font-bold text-slate-900 mb-1">{unit?.unit_number ?? '—'}</p>
        {unitMeta && <p className="text-sm text-slate-500 mb-3">{unitMeta}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              BOOKING_STATUS_BADGE[booking.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
          </span>
          {booking.booking_date && (
            <span className="text-xs text-slate-400">
              Booked{' '}
              {new Date(booking.booking_date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
          <span className="text-sm font-semibold text-slate-700">
            {formatCrores(booking.agreement_value)}
          </span>
        </div>
      </div>

      {/* Payment overview */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment Overview</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">Total</p>
            <p className="font-semibold text-slate-900">{formatCrores(booking.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Paid</p>
            <p className="font-semibold text-green-700">{formatCrores(totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Remaining</p>
            <p className="font-semibold text-amber-700">{formatCrores(totalPending)}</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">{paidPercent}% paid</p>
        </div>
      </div>

      {/* Next due */}
      {nextDue && (
        <div
          className={`rounded-xl border p-5 ${
            nextDueIsUrgent
              ? 'border-amber-300 bg-amber-50'
              : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Next Payment Due
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{nextDue.milestone_name}</p>
            <p className="text-lg font-bold text-slate-900">{formatCrores(nextDue.amount_due)}</p>
          </div>
          {nextDue.due_date && (
            <p className="mt-1 text-sm text-slate-500">
              Due:{' '}
              {new Date(nextDue.due_date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}

      {/* Recent payments */}
      {recentPayments.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Payments</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Milestone</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Amount</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Date</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentPayments.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 text-slate-900">{m.milestone_name}</td>
                  <td className="px-4 py-2.5 text-slate-700">{formatINR(m.paid_amount ?? m.amount_due)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    {m.paid_date
                      ? new Date(m.paid_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {m.receipt_url && (
                      <a
                        href={m.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Receipt ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
