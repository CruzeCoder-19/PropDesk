import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatINR } from '@/lib/format'
import {
  MILESTONE_STATUS_BADGE,
  MILESTONE_STATUS_LABELS,
} from '@/lib/booking-constants'
import { cn } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

const STATUS_TABS = [
  { label: 'All',      value: '' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Due',      value: 'due' },
  { label: 'Overdue',  value: 'overdue' },
  { label: 'Paid',     value: 'paid' },
] as const

interface FlatMilestone {
  id: string
  bookingId: string
  clientName: string | null
  unitLabel: string
  milestoneName: string
  milestoneOrder: number
  amountDue: number
  dueDate: string | null
  status: string
  paidAmount: number | null
  paidDate: string | null
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const { status: statusFilter = '' } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect('/login')
  const orgId = profile.organization_id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bookings } = await (supabase as any)
    .from('bookings')
    .select(`
      id,
      client:profiles!client_profile_id(full_name),
      unit:units(unit_number, project:projects(name)),
      milestones:payment_milestones(
        id, milestone_name, milestone_order, amount_due, due_date,
        status, paid_amount, paid_date
      )
    `)
    .eq('organization_id', orgId)
    .order('booking_date', { ascending: false })

  // Flatten milestones from all bookings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: FlatMilestone[] = ((bookings ?? []) as any[]).flatMap((b: any) => {
    const clientName = b.client?.full_name ?? null
    const unitLabel = [b.unit?.unit_number, b.unit?.project?.name]
      .filter(Boolean)
      .join(' · ')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((b.milestones ?? []) as any[]).map((m: any) => ({
      id: m.id,
      bookingId: b.id,
      clientName,
      unitLabel,
      milestoneName: m.milestone_name,
      milestoneOrder: m.milestone_order,
      amountDue: m.amount_due,
      dueDate: m.due_date,
      status: m.status,
      paidAmount: m.paid_amount,
      paidDate: m.paid_date,
    }))
  })

  // Filter by status
  if (statusFilter) {
    rows = rows.filter((r) => r.status === statusFilter)
  }

  // Sort: nulls last, then ascending due_date
  rows.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })

  function buildTabUrl(status: string) {
    const sp = new URLSearchParams()
    if (status) sp.set('status', status)
    return `/dashboard/payments?${sp.toString()}`
  }

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl font-bold text-slate-900">Payments</h1>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {rows.length.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.value
          return (
            <Link
              key={tab.value}
              href={buildTabUrl(tab.value)}
              className={cn(
                'inline-flex h-7 items-center rounded-lg px-3 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-400">No payment milestones found.</p>
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Milestone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Paid Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Paid Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {r.clientName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.unitLabel || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.milestoneName}
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {formatINR(r.amountDue)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {fmtDate(r.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${MILESTONE_STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {MILESTONE_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {r.paidAmount != null ? formatINR(r.paidAmount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {fmtDate(r.paidDate)}
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
