import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCrores, formatINR } from '@/lib/format'
import {
  MILESTONE_STATUS_BADGE,
  MILESTONE_STATUS_LABELS,
} from '@/lib/booking-constants'

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

export default async function ClientPaymentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client-portal/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (supabase as any)
    .from('bookings')
    .select(`
      id, total_amount,
      milestones:payment_milestones(
        id, milestone_name, milestone_order, amount_due, due_date,
        status, paid_amount, paid_date, receipt_url
      )
    `)
    .eq('client_profile_id', user.id)
    .single()

  if (!booking) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">No booking found for your account.</p>
      </div>
    )
  }

  const milestones = (booking.milestones as Milestone[] | null) ?? []
  const sorted = [...milestones].sort((a, b) => a.milestone_order - b.milestone_order)

  const counts = {
    total: sorted.length,
    paid: sorted.filter((m) => m.status === 'paid').length,
    overdue: sorted.filter((m) => m.status === 'overdue').length,
    pending: sorted.filter((m) => m.status !== 'paid').length,
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Payment Schedule</h1>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {counts.total} Total
        </span>
        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          {counts.paid} Paid
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {counts.pending} Pending
        </span>
        {counts.overdue > 0 && (
          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            {counts.overdue} Overdue
          </span>
        )}
      </div>

      {/* Milestones table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {sorted.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            No milestones defined yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Milestone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Amount Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Paid Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Paid On</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((m, i) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{m.milestone_name}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCrores(m.amount_due)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {m.due_date
                      ? new Date(m.due_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0 text-[11px] font-medium ${
                        MILESTONE_STATUS_BADGE[m.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {MILESTONE_STATUS_LABELS[m.status] ?? m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {m.status === 'paid' && m.paid_amount != null
                      ? formatINR(m.paid_amount)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {m.paid_date
                      ? new Date(m.paid_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {m.receipt_url ? (
                      <a
                        href={m.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        View ↗
                      </a>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
