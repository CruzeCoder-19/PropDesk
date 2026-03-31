import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/format'
import {
  SOURCE_LABELS,
  SCORE_BADGE_CLASSES,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from '@/lib/lead-constants'
import { LeadFilters } from '@/components/leads/lead-filters'
import { AddLeadSheet } from '@/components/leads/add-lead-sheet'

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{
    q?: string
    score?: string
    source?: string
    status?: string
    sort?: string
    dir?: string
    page?: string
  }>
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const params = await searchParams
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
  const orgId = profile.organization_id

  const q = params.q ?? ''
  const score = params.score ?? ''
  const source = params.source ?? ''
  const status = params.status ?? ''
  const sort = params.sort ?? 'created_at'
  const dir = params.dir ?? 'desc'
  const page = Math.max(1, Number(params.page ?? 1))

  // Fetch team members + projects for the sheet
  const [{ data: teamMembers }, { data: projects }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', orgId)
      .not('full_name', 'is', null),
    supabase
      .from('projects')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name', { ascending: true }),
  ])

  // Build leads query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('leads')
    .select('id, name, phone, email, source, score, status, created_at, last_contacted_at, assignee:profiles!assigned_to(full_name)', {
      count: 'exact',
    })
    .eq('organization_id', orgId)

  // Salespersons only see leads assigned to them
  if (profile.role === 'salesperson') {
    query = query.eq('assigned_to', user.id)
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
  }
  if (score) query = query.eq('score', score)
  if (status) query = query.eq('status', status)
  if (source) query = query.eq('source', source)

  query = query
    .order(sort, { ascending: dir === 'asc' })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const { data: leads, count } = await query

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function buildPageUrl(p: number) {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (score) sp.set('score', score)
    if (source) sp.set('source', source)
    if (status) sp.set('status', status)
    if (sort !== 'created_at') sp.set('sort', sort)
    if (dir !== 'desc') sp.set('dir', dir)
    sp.set('page', String(p))
    return `/dashboard/leads?${sp.toString()}`
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeLeads: any[] = leads ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeTeamMembers: { id: string; full_name: string }[] = (teamMembers ?? []).filter((m: any) => m.full_name) as { id: string; full_name: string }[]
  const safeProjects: { id: string; name: string }[] = projects ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-slate-900">Leads</h1>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {totalCount.toLocaleString('en-IN')}
          </span>
        </div>
        <AddLeadSheet projects={safeProjects} teamMembers={safeTeamMembers} />
      </div>

      {/* Filters */}
      <LeadFilters />

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden">
        {safeLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Globe className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No leads found</p>
            <p className="text-xs mt-1">Try adjusting your filters or add a new lead.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Name / Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Assigned To
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Last Contact
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {safeLeads.map((lead) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const assignee = (lead as any).assignee as { full_name?: string } | null
                return (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{lead.name}</p>
                      <p className="text-xs text-slate-400">{lead.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="text-xs">{SOURCE_LABELS[lead.source] ?? lead.source}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          SCORE_BADGE_CLASSES[lead.score] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lead.score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_BADGE_CLASSES[lead.status] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {assignee?.full_name ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {lead.last_contacted_at ? timeAgo(lead.last_contacted_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="inline-flex h-7 items-center rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {safeLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 rounded-xl border border-slate-200 bg-white">
            <p className="text-sm font-medium">No leads found</p>
            <p className="text-xs mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          safeLeads.map((lead) => (
            <Link
              key={lead.id}
              href={`/dashboard/leads/${lead.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-amber-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{lead.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{lead.phone}</p>
                </div>
                <span
                  className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    SCORE_BADGE_CLASSES[lead.score] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {lead.score}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_BADGE_CLASSES[lead.status] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {STATUS_LABELS[lead.status] ?? lead.status}
                </span>
                <span className="text-xs text-slate-400">
                  {SOURCE_LABELS[lead.source] ?? lead.source}
                </span>
                {lead.last_contacted_at && (
                  <span className="text-xs text-slate-400">
                    {timeAgo(lead.last_contacted_at)}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <p className="text-xs text-slate-400">
            Page {page} of {totalPages} · {totalCount.toLocaleString('en-IN')} leads
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={buildPageUrl(page - 1)}
                className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildPageUrl(page + 1)}
                className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
