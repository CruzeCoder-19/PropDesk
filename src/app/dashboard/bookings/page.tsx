import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCrores } from '@/lib/format'
import {
  BOOKING_STATUS_BADGE,
  BOOKING_STATUS_LABELS,
  PAYMENT_PLAN_LABELS,
} from '@/lib/booking-constants'
import { cn } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>
}

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Token Paid', value: 'token_paid' },
  { label: 'Agreement Signed', value: 'agreement_signed' },
  { label: 'Loan Processing', value: 'loan_processing' },
  { label: 'Registered', value: 'registered' },
  { label: 'Possession', value: 'possession' },
] as const

export default async function BookingsPage({ searchParams }: PageProps) {
  const params = await searchParams
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

  const statusFilter = params.status ?? ''
  const q = (params.q ?? '').toLowerCase()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('bookings')
    .select(`
      id, booking_date, agreement_value, total_amount, payment_plan, status,
      unit:units(unit_number, block, floor, project:projects(name)),
      client:profiles!client_profile_id(full_name, phone)
    `)
    .eq('organization_id', orgId)
    .order('booking_date', { ascending: false })

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data: bookings } = await query

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[] = bookings ?? []

  // Client-side q filter (client name or unit number)
  if (q) {
    rows = rows.filter((b: any) => {
      const clientName = (b.client?.full_name ?? '').toLowerCase()
      const unitNum = (b.unit?.unit_number ?? '').toLowerCase()
      return clientName.includes(q) || unitNum.includes(q)
    })
  }

  function buildTabUrl(status: string) {
    const sp = new URLSearchParams()
    if (status) sp.set('status', status)
    if (q) sp.set('q', q)
    return `/dashboard/bookings?${sp.toString()}`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-slate-900">Bookings</h1>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {rows.length.toLocaleString('en-IN')}
          </span>
        </div>
        <Link
          href="/dashboard/bookings/new"
          className={cn('inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors', 'bg-amber-400 text-slate-950 hover:bg-amber-300')}
        >
          + New Booking
        </Link>
      </div>

      {/* Search + Status tabs */}
      <div className="space-y-3">
        <form method="GET" action="/dashboard/bookings">
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search client name or unit number…"
            className="h-9 w-full max-w-sm rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
          />
        </form>

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
      </div>

      {/* ── Empty state (shared) ─────────────────────────────────────────────── */}
      {rows.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center py-16 text-slate-400">
          <FileCheck className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No bookings found</p>
          <p className="text-xs mt-1">Try adjusting your filters or create a new booking.</p>
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* ── Desktop table (hidden on mobile) ──────────────────────────────── */}
          <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Booking</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Agreement Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {rows.map((b: any) => {
                  const unit = b.unit as { unit_number: string; block?: string; floor?: number; project?: { name: string } } | null
                  const client = b.client as { full_name: string | null; phone: string | null } | null
                  const unitLabel = [unit?.unit_number, unit?.project?.name].filter(Boolean).join(' · ')
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-slate-500">#{b.id.slice(0, 8).toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{client?.full_name ?? '—'}</p>
                        {client?.phone && <p className="text-xs text-slate-400">{client.phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{unitLabel || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {b.booking_date
                          ? new Date(b.booking_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {b.agreement_value != null ? formatCrores(b.agreement_value) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {PAYMENT_PLAN_LABELS[b.payment_plan] ?? b.payment_plan}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${BOOKING_STATUS_BADGE[b.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/bookings/${b.id}`} className="inline-flex h-7 items-center rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors">
                          View →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards (hidden on desktop) ──────────────────────────────── */}
          <div className="md:hidden space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {rows.map((b: any) => {
              const unit = b.unit as { unit_number: string; project?: { name: string } } | null
              const client = b.client as { full_name: string | null; phone: string | null } | null
              const unitLabel = [unit?.unit_number, unit?.project?.name].filter(Boolean).join(' · ')
              const dateStr = b.booking_date
                ? new Date(b.booking_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—'
              return (
                <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  {/* Row 1: status + booking ID */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${BOOKING_STATUS_BADGE[b.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                    </span>
                    <span className="font-mono text-xs text-slate-400">#{b.id.slice(0, 8).toUpperCase()}</span>
                  </div>

                  {/* Row 2: client name */}
                  <div>
                    <p className="font-semibold text-slate-900">{client?.full_name ?? '—'}</p>
                    {client?.phone && <p className="text-xs text-slate-400 mt-0.5">{client.phone}</p>}
                  </div>

                  {/* Row 3: unit + date */}
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{unitLabel || '—'}</span>
                    <span className="text-xs">{dateStr}</span>
                  </div>

                  {/* Row 4: value + plan + view */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {b.agreement_value != null ? formatCrores(b.agreement_value) : '—'}
                      </p>
                      <p className="text-xs text-slate-400">{PAYMENT_PLAN_LABELS[b.payment_plan] ?? b.payment_plan}</p>
                    </div>
                    <Link href={`/dashboard/bookings/${b.id}`} className="inline-flex h-8 items-center rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors">
                      View →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
