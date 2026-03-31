import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/format'
import { SendReminderButton } from './send-button'

interface PageProps {
  searchParams: Promise<{
    type?: string
    status?: string
  }>
}

const TYPE_LABELS: Record<string, string> = {
  dues_reminder: 'Due Reminder',
  overdue_alert: 'Overdue Alert',
  general:       'General',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  sent:    'bg-green-50  text-green-700  border-green-200',
  failed:  'bg-red-50    text-red-700    border-red-200',
}

const TYPE_BADGE: Record<string, string> = {
  dues_reminder: 'bg-blue-50   text-blue-700   border-blue-200',
  overdue_alert: 'bg-red-50    text-red-700    border-red-200',
  general:       'bg-slate-100 text-slate-600  border-slate-200',
}

export default async function NotificationsPage({ searchParams }: PageProps) {
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
  if (profile.role === 'salesperson') redirect('/dashboard')

  const orgId = profile.organization_id

  const filterType   = params.type   ?? ''
  const filterStatus = params.status ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('notifications')
    .select(`
      id, type, channel, message_text, status, created_at, sent_at,
      client:profiles!client_profile_id(full_name, phone),
      milestone:payment_milestones!milestone_id(milestone_name, amount_due, due_date)
    `, { count: 'exact' })
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filterType)   query = query.eq('type', filterType)
  if (filterStatus) query = query.eq('status', filterStatus)

  const { data: notifications, count } = await query

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = notifications ?? []
  const totalCount  = count ?? 0

  function buildUrl(overrides: Record<string, string>) {
    const sp = new URLSearchParams()
    const merged = { type: filterType, status: filterStatus, ...overrides }
    if (merged.type)   sp.set('type',   merged.type)
    if (merged.status) sp.set('status', merged.status)
    return `/dashboard/notifications${sp.size ? `?${sp}` : ''}`
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {totalCount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type filter */}
        <div className="flex items-center gap-1">
          {[
            { value: '',              label: 'All Types' },
            { value: 'dues_reminder', label: 'Due Reminders' },
            { value: 'overdue_alert', label: 'Overdue Alerts' },
            { value: 'general',       label: 'General' },
          ].map(({ value, label }) => (
            <a
              key={value}
              href={buildUrl({ type: value })}
              className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition-colors ${
                filterType === value
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="h-4 w-px bg-slate-200" />

        {/* Status filter */}
        <div className="flex items-center gap-1">
          {[
            { value: '',        label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'sent',    label: 'Sent' },
            { value: 'failed',  label: 'Failed' },
          ].map(({ value, label }) => (
            <a
              key={value}
              href={buildUrl({ status: value })}
              className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition-colors ${
                filterStatus === value
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Bell className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No notifications found</p>
            <p className="text-xs mt-1">
              Notifications are created automatically when payment milestones become due or overdue.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Milestone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Created
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((n) => {
                const client    = n.client    as { full_name: string | null; phone: string | null } | null
                const milestone = n.milestone as { milestone_name: string; amount_due: number; due_date: string | null } | null
                const canSend   = n.status === 'pending' || n.status === 'failed'

                return (
                  <tr key={n.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Client */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{client?.full_name ?? '—'}</p>
                      <p className="text-xs text-slate-400">{client?.phone ?? ''}</p>
                    </td>

                    {/* Milestone */}
                    <td className="px-4 py-3">
                      {milestone ? (
                        <>
                          <p className="text-slate-700">{milestone.milestone_name}</p>
                          {milestone.due_date && (
                            <p className="text-xs text-slate-400">
                              Due{' '}
                              {new Date(milestone.due_date).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Type badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          TYPE_BADGE[n.type as string] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {TYPE_LABELS[n.type as string] ?? n.type}
                      </span>
                    </td>

                    {/* Message */}
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-slate-500 line-clamp-2">{n.message_text as string}</p>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${
                          STATUS_BADGE[n.status as string] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {n.status}
                      </span>
                      {n.sent_at && (
                        <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.sent_at as string)}</p>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {timeAgo(n.created_at as string)}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      {canSend && <SendReminderButton notificationId={n.id as string} />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
