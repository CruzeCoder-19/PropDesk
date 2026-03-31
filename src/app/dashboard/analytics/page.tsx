import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCrores } from '@/lib/format'
import { SOURCE_LABELS } from '@/lib/lead-constants'
import {
  BookingsLineChart,
  RevenueBarChart,
  LeadSourcesPieChart,
  LeadFunnelChart,
  InventoryStackedBarChart,
  type MonthPoint,
  type SourceSlice,
  type FunnelStep,
  type ProjectInventory,
} from './charts'

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="mb-4 text-sm font-semibold text-slate-700">{title}</p>
      {children}
    </div>
  )
}

const FUNNEL_STEPS: FunnelStep[] = [
  { status: 'new',          label: 'New',          count: 0 },
  { status: 'contacted',    label: 'Contacted',    count: 0 },
  { status: 'site_visited', label: 'Site Visited', count: 0 },
  { status: 'won',          label: 'Won',          count: 0 },
]

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) redirect('/login')
  if (profile.role === 'salesperson') redirect('/dashboard')

  const orgId = profile.organization_id

  // Build 12-month window
  const now = new Date()
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  // ── Batch 1 ─────────────────────────────────────────────────────────────────
  const [
    { data: projects },
    { data: allLeads },
    { data: bookings },
    { data: salespersons },
  ] = await Promise.all([
    supabase.from('projects').select('id, name').eq('organization_id', orgId),
    supabase.from('leads').select('id, source, status, assigned_to').eq('organization_id', orgId),
    supabase
      .from('bookings')
      .select('id, booking_date, agreement_value, lead_id')
      .eq('organization_id', orgId),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', orgId)
      .in('role', ['salesperson', 'sales_manager']),
  ])

  const projectIds = (projects ?? []).map((p) => p.id)
  const bookingIds = (bookings ?? []).map((b) => b.id)

  // ── Batch 2 ─────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let units: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let paidMilestones: any[] = []

  await Promise.all([
    projectIds.length > 0
      ? supabase
          .from('units')
          .select('project_id, status, total_price')
          .in('project_id', projectIds)
          .then(({ data }) => { units = data ?? [] })
      : Promise.resolve(),
    bookingIds.length > 0
      ? supabase
          .from('payment_milestones')
          .select('paid_amount, paid_date')
          .eq('status', 'paid')
          .in('booking_id', bookingIds)
          .gte('paid_date', twelveMonthsAgo.toISOString())
          .then(({ data }) => { paidMilestones = data ?? [] })
      : Promise.resolve(),
  ])

  // ── Monthly bookings + revenue ───────────────────────────────────────────────
  const monthlyData: MonthPoint[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() // 0-indexed
    const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' })

    const monthBookings = (bookings ?? []).filter((b) => {
      const bd = new Date(b.booking_date)
      return bd.getFullYear() === y && bd.getMonth() === m
    })
    const revenue = monthBookings.reduce(
      (sum, b) => sum + (b.agreement_value ?? 0),
      0
    )

    const collected = paidMilestones
      .filter((pm) => {
        if (!pm.paid_date) return false
        const pd = new Date(pm.paid_date as string)
        return pd.getFullYear() === y && pd.getMonth() === m
      })
      .reduce((sum: number, pm) => sum + ((pm.paid_amount as number) ?? 0), 0)

    monthlyData.push({ month: label, bookings: monthBookings.length, revenue, collected })
  }

  // ── Lead sources ─────────────────────────────────────────────────────────────
  const sourceMap = new Map<string, number>()
  for (const l of allLeads ?? []) {
    const s = (l.source as string) || 'other'
    sourceMap.set(s, (sourceMap.get(s) ?? 0) + 1)
  }
  const leadSources: SourceSlice[] = Array.from(sourceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({
      source,
      label: SOURCE_LABELS[source] ?? source,
      count,
    }))

  // ── Lead funnel ───────────────────────────────────────────────────────────────
  const statusCountMap = new Map<string, number>()
  for (const l of allLeads ?? []) {
    const s = l.status as string
    statusCountMap.set(s, (statusCountMap.get(s) ?? 0) + 1)
  }
  const leadFunnel: FunnelStep[] = FUNNEL_STEPS.map((step) => ({
    ...step,
    count: statusCountMap.get(step.status) ?? 0,
  }))

  // ── Conversion rate ───────────────────────────────────────────────────────────
  const won = statusCountMap.get('won') ?? 0
  const total = allLeads?.length ?? 0
  const conversionRate = total > 0 ? Math.round((won / total) * 1000) / 10 : 0

  // ── Inventory by project ─────────────────────────────────────────────────────
  const projectNameMap = new Map((projects ?? []).map((p) => [p.id, p.name as string]))
  const invMap = new Map<string, { available: number; blocked: number; sold: number }>()

  for (const u of units) {
    const pid = u.project_id as string
    if (!invMap.has(pid)) invMap.set(pid, { available: 0, blocked: 0, sold: 0 })
    const entry = invMap.get(pid)!
    const status = u.status as string
    if (status === 'available') entry.available++
    else if (status === 'blocked') entry.blocked++
    else if (status === 'booked' || status === 'sold') entry.sold++
  }

  const inventoryByProject: ProjectInventory[] = Array.from(invMap.entries()).map(
    ([pid, counts]) => ({
      project: projectNameMap.get(pid) ?? 'Unknown',
      ...counts,
    })
  )

  // ── Remaining inventory value ────────────────────────────────────────────────
  const remainingValue = units
    .filter((u) => u.status === 'available')
    .reduce((sum: number, u) => sum + ((u.total_price as number) ?? 0), 0)

  // ── Team performance ──────────────────────────────────────────────────────────
  // Map lead_id → booking exists
  const bookingLeadIds = new Set(
    (bookings ?? []).map((b) => b.lead_id as string).filter(Boolean)
  )
  // Map assigned_to → leads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadsByAssignee = new Map<string, any[]>()
  for (const l of allLeads ?? []) {
    const aid = l.assigned_to as string | null
    if (!aid) continue
    if (!leadsByAssignee.has(aid)) leadsByAssignee.set(aid, [])
    leadsByAssignee.get(aid)!.push(l)
  }

  const teamPerformance = (salespersons ?? [])
    .map((sp) => {
      const leads = leadsByAssignee.get(sp.id) ?? []
      const assigned = leads.length
      const visited = leads.filter((l) => l.status === 'site_visited').length
      const wonCount = leads.filter((l) => l.status === 'won').length
      // Count bookings where the underlying lead is assigned to this person
      const spLeadIds = new Set(leads.map((l) => l.id as string))
      const bookingsCount = Array.from(bookingLeadIds).filter((lid) =>
        spLeadIds.has(lid)
      ).length
      const rate =
        assigned > 0 ? `${Math.round((wonCount / assigned) * 100)}%` : '0%'
      return {
        name: sp.full_name ?? 'Unknown',
        assigned,
        visited,
        won: wonCount,
        bookings: bookingsCount,
        rate,
      }
    })
    .sort((a, b) => b.bookings - a.bookings || b.won - a.won)

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-slate-900">Analytics</h1>

      {/* ── Sales Performance ── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Sales Performance</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Bookings per Month">
            <BookingsLineChart data={monthlyData} />
          </ChartCard>
          <ChartCard title="Revenue: Booked vs Collected">
            <RevenueBarChart data={monthlyData} />
          </ChartCard>
        </div>
      </section>

      {/* ── Lead Analytics ── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Lead Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ChartCard title="Lead Sources">
            <LeadSourcesPieChart data={leadSources} />
          </ChartCard>
          <ChartCard title="Conversion Funnel">
            <LeadFunnelChart data={leadFunnel} />
          </ChartCard>
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col items-center justify-center gap-3">
            <p className="text-sm font-semibold text-slate-700">Conversion Rate</p>
            <p className="text-5xl font-bold text-slate-900">{conversionRate}%</p>
            <p className="text-xs text-slate-400">
              {won.toLocaleString('en-IN')} won /{' '}
              {total.toLocaleString('en-IN')} total leads
            </p>
          </div>
        </div>
      </section>

      {/* ── Inventory ── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Inventory</h2>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex flex-col justify-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Available Inventory Value
            </p>
            <p className="text-3xl font-bold text-slate-900">{formatCrores(remainingValue)}</p>
            <p className="text-xs text-amber-600">
              {units.filter((u) => u.status === 'available').length.toLocaleString('en-IN')}{' '}
              units available
            </p>
          </div>
          <div className="lg:col-span-3">
            <ChartCard title="Units by Project">
              <InventoryStackedBarChart data={inventoryByProject} />
            </ChartCard>
          </div>
        </div>
      </section>

      {/* ── Team Performance ── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Team Performance</h2>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {teamPerformance.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              No team members found.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Leads
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Site Visits
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Bookings
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Won
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Conv. Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamPerformance.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.assigned}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.visited}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.bookings}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.won}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{row.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
