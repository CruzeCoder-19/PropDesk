import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  CalendarDays,
  FileText,
  ArrowRightLeft,
  Clock,
  Globe,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatINR, timeAgo } from '@/lib/format'
import {
  SOURCE_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  ACTIVITY_LABELS,
} from '@/lib/lead-constants'
import { ActivityForm } from '@/components/leads/activity-form'
import { StatusStepper } from '@/components/leads/status-stepper'
import { ScoreSelector } from '@/components/leads/score-selector'

interface PageProps {
  params: Promise<{ id: string }>
}

// Activity type → icon + color
const ACTIVITY_ICON: Record<string, React.ElementType> = {
  call: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  site_visit: MapPin,
  meeting: CalendarDays,
  note: FileText,
  status_change: ArrowRightLeft,
  follow_up_scheduled: Clock,
}

const ACTIVITY_COLOR: Record<string, string> = {
  call: 'bg-blue-100 text-blue-600',
  whatsapp: 'bg-green-100 text-green-600',
  email: 'bg-violet-100 text-violet-600',
  site_visit: 'bg-amber-100 text-amber-600',
  meeting: 'bg-indigo-100 text-indigo-600',
  note: 'bg-slate-100 text-slate-600',
  status_change: 'bg-slate-100 text-slate-600',
  follow_up_scheduled: 'bg-orange-100 text-orange-600',
}

function formatScheduledAt(dt: string): string {
  return new Date(dt).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params
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

  // Fetch lead + assignee + project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leadRaw } = await (supabase as any)
    .from('leads')
    .select('*, assignee:profiles!assigned_to(full_name), project:projects!project_id(id,name)')
    .eq('id', id)
    .single()

  if (!leadRaw || leadRaw.organization_id !== orgId) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = leadRaw as any

  // Fetch activities
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activitiesRaw } = await (supabase as any)
    .from('lead_activities')
    .select('id, activity_type, description, scheduled_at, created_at, performer:profiles!performed_by(full_name)')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activities: any[] = activitiesRaw ?? []

  // Upcoming follow-ups
  const now = new Date()
  const followUps = activities
    .filter((a) => a.scheduled_at && new Date(a.scheduled_at) > now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const assigneeName = lead.assignee?.full_name ?? null
  const projectName = lead.project?.name ?? null

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/dashboard/leads"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </Link>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-8">
        {/* ── Left column ──────────────────────────────────── */}
        <div className="md:col-span-5 space-y-4">
          {/* Lead header card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{lead.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <ScoreSelector leadId={lead.id} currentScore={lead.score} />
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_BADGE_CLASSES[lead.status] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {STATUS_LABELS[lead.status] ?? lead.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {/* Phone */}
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-2 text-slate-700 hover:text-amber-600 transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                {lead.phone}
              </a>

              {/* Email */}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 text-slate-700 hover:text-amber-600 transition-colors"
                >
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  {lead.email}
                </a>
              )}

              {/* WhatsApp */}
              {lead.whatsapp_number && (
                <div className="flex items-center gap-2 text-slate-700">
                  <MessageSquare className="h-4 w-4 shrink-0 text-slate-400" />
                  {lead.whatsapp_number}
                </div>
              )}

              {/* Source */}
              <div className="flex items-center gap-2 text-slate-500">
                <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                {SOURCE_LABELS[lead.source] ?? lead.source}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 pt-1 border-t border-slate-50">
              <span>
                Added{' '}
                <span className="text-slate-600">
                  {new Date(lead.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </span>
              {assigneeName && (
                <span>
                  Assigned to <span className="text-slate-600">{assigneeName}</span>
                </span>
              )}
            </div>
          </div>

          {/* Status stepper */}
          <StatusStepper leadId={lead.id} currentStatus={lead.status} />

          {/* Activity timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Activity Timeline</h3>

            {/* Activity form */}
            <ActivityForm leadId={lead.id} />

            {/* Activities list */}
            {activities.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No activities yet.</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = ACTIVITY_ICON[activity.activity_type] ?? FileText
                  const colorClass =
                    ACTIVITY_COLOR[activity.activity_type] ?? 'bg-slate-100 text-slate-600'
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const performer = (activity as any).performer as { full_name?: string } | null

                  return (
                    <div key={activity.id} className="flex gap-3">
                      {/* Icon dot */}
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colorClass}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 mb-0.5">
                          {ACTIVITY_LABELS[activity.activity_type] ?? activity.activity_type}
                        </p>
                        {activity.description && (
                          <p className="text-sm text-slate-700 leading-snug">
                            {activity.description}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          {performer?.full_name ? `by ${performer.full_name} · ` : ''}
                          {timeAgo(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────── */}
        <div className="md:col-span-3 space-y-4">
          {/* Quick info card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Details</h3>

            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-400 uppercase tracking-wide">Budget</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {lead.budget_min || lead.budget_max ? (
                    <>
                      {lead.budget_min ? formatINR(Number(lead.budget_min)) : '—'}
                      {' – '}
                      {lead.budget_max ? formatINR(Number(lead.budget_max)) : '—'}
                    </>
                  ) : (
                    <span className="text-slate-400">Not specified</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 uppercase tracking-wide">Unit Type</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {lead.preferred_unit_type ?? <span className="text-slate-400">Any</span>}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400 uppercase tracking-wide">
                  Project Interest
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {projectName ?? <span className="text-slate-400">No preference</span>}
                </dd>
              </div>

              {lead.notes && (
                <div>
                  <dt className="text-xs text-slate-400 uppercase tracking-wide">Notes</dt>
                  <dd className="mt-0.5 text-slate-700 line-clamp-3">{lead.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Convert to Booking — only when won */}
          {lead.status === 'won' && (
            <div>
              <button
                disabled
                className="w-full h-10 rounded-xl bg-amber-400 text-slate-950 text-sm font-semibold opacity-60 cursor-not-allowed"
              >
                Convert to Booking (Phase 5)
              </button>
            </div>
          )}

          {/* Follow-up reminders */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Upcoming Follow-ups</h3>

            {followUps.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming follow-ups.</p>
            ) : (
              <div className="space-y-3">
                {followUps.map((fu) => (
                  <div key={fu.id} className="flex gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-orange-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-600">
                        {ACTIVITY_LABELS[fu.activity_type] ?? fu.activity_type}
                      </p>
                      <p className="text-xs text-slate-500">{formatScheduledAt(fu.scheduled_at)}</p>
                      {fu.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                          {fu.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
