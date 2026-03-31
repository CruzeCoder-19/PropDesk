import { redirect } from 'next/navigation'
import { AlertTriangle, Building2, IndianRupee, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCrores, formatINR, timeAgo } from '@/lib/format'
import { LeadFunnelChart } from '@/components/dashboard/lead-funnel-chart'
import { RevenuePieChart } from '@/components/dashboard/revenue-pie-chart'
import { SOURCE_LABELS, SCORE_BADGE_CLASSES } from '@/lib/lead-constants'

// ── Constants ──────────────────────────────────────────────────────────────

const FUNNEL_STAGES = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'site_visit_scheduled', label: 'Visit Sched.' },
  { key: 'site_visited', label: 'Site Visited' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
]

// ── Sub-components (server-renderable) ─────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
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

  // ── All queries in parallel ────────────────────────────────────────────
  const [
    { data: bookings },
    { data: allLeads },
    { count: availableUnits },
    { data: pendingMilestones },
    { data: recentLeads },
    { data: overdueList },
    { data: paidMilestones },
  ] = await Promise.all([
    // Booking totals for revenue KPI
    supabase
      .from('bookings')
      .select('total_amount')
      .eq('organization_id', orgId)
      .neq('status', 'cancelled'),

    // All leads — used for funnel + active count
    supabase.from('leads').select('status').eq('organization_id', orgId),

    // Available units (RLS scopes by org via projects)
    supabase
      .from('units')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available'),

    // Pending dues milestones (due or overdue)
    supabase
      .from('payment_milestones')
      .select('amount_due, paid_amount')
      .in('status', ['due', 'overdue']),

    // Recent 5 leads with assignee name
    supabase
      .from('leads')
      .select('id, name, source, score, created_at, assignee:profiles!assigned_to(full_name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5),

    // Overdue milestones with unit + client info
    supabase
      .from('payment_milestones')
      .select(
        'id, amount_due, due_date, booking:bookings(unit:units(unit_number), client:profiles!client_profile_id(full_name))'
      )
      .eq('status', 'overdue')
      .order('due_date', { ascending: true })
      .limit(8),

    // Paid milestones for pie chart
    supabase
      .from('payment_milestones')
      .select('paid_amount')
      .eq('status', 'paid'),
  ])

  // ── Compute KPIs ──────────────────────────────────────────────────────
  const totalRevenue =
    bookings?.reduce((s, b) => s + Number(b.total_amount), 0) ?? 0

  const activeLeads =
    allLeads?.filter((l) => l.status !== 'won' && l.status !== 'lost').length ?? 0

  const pendingDues =
    pendingMilestones?.reduce(
      (s, m) => s + Number(m.amount_due) - Number(m.paid_amount ?? 0),
      0
    ) ?? 0

  // ── Funnel data ────────────────────────────────────────────────────────
  const statusCounts =
    allLeads?.reduce<Record<string, number>>((acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1
      return acc
    }, {}) ?? {}

  const funnelData = FUNNEL_STAGES.map(({ key, label }) => ({
    stage: label,
    count: statusCounts[key] ?? 0,
  }))

  // ── Pie data ───────────────────────────────────────────────────────────
  const collected =
    paidMilestones?.reduce((s, m) => s + Number(m.paid_amount ?? 0), 0) ?? 0
  const pending =
    pendingMilestones?.reduce(
      (s, m) => s + Number(m.amount_due) - Number(m.paid_amount ?? 0),
      0
    ) ?? 0

  const revenuePieData = [
    { name: 'Collected', value: collected },
    { name: 'Pending', value: pending },
  ]

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Row 1 — KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Revenue"
          value={formatCrores(totalRevenue)}
          icon={IndianRupee}
          accent="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label="Active Leads"
          value={activeLeads.toLocaleString('en-IN')}
          icon={Users}
          accent="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="Units Available"
          value={(availableUnits ?? 0).toLocaleString('en-IN')}
          icon={Building2}
          accent="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Pending Dues"
          value={formatCrores(pendingDues)}
          icon={AlertTriangle}
          accent="bg-red-50 text-red-600"
        />
      </div>

      {/* Row 2 — Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeadFunnelChart data={funnelData} />
        <RevenuePieChart data={revenuePieData} />
      </div>

      {/* Row 3 — Tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Leads */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Leads</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {!recentLeads?.length ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No leads yet.</p>
            ) : (
              recentLeads.map((lead) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const assignee = (lead as any).assignee as { full_name?: string } | null
                return (
                  <div key={lead.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{lead.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {SOURCE_LABELS[lead.source] ?? lead.source}
                        {assignee?.full_name ? ` · ${assignee.full_name}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          SCORE_BADGE_CLASSES[lead.score] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lead.score.charAt(0).toUpperCase() + lead.score.slice(1)}
                      </span>
                      <span className="text-xs text-slate-400">{timeAgo(lead.created_at)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Overdue Payments */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Overdue Payments</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {!overdueList?.length ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                No overdue payments.
              </p>
            ) : (
              overdueList.map((m) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const booking = (m as any).booking as {
                  unit?: { unit_number?: string } | null
                  client?: { full_name?: string } | null
                } | null

                const unitNo = booking?.unit?.unit_number ?? '—'
                const clientName = booking?.client?.full_name ?? 'Unknown'
                const daysOverdue =
                  m.due_date != null
                    ? Math.max(
                        0,
                        Math.floor(
                          (Date.now() - new Date(m.due_date as string).getTime()) / 86_400_000
                        )
                      )
                    : null

                return (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{clientName}</p>
                      <p className="text-xs text-slate-400">Unit {unitNo}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatINR(Number(m.amount_due))}
                      </span>
                      {daysOverdue !== null && (
                        <span className="text-xs font-medium text-red-600">
                          {daysOverdue}d overdue
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
