import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DOCUMENT_TYPE_LABELS } from '@/lib/booking-constants'
import { cn } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{ type?: string }>
}

const TYPE_TABS = [
  { label: 'All',              value: '' },
  { label: 'Brochure',         value: 'brochure' },
  { label: 'Allotment Letter', value: 'allotment_letter' },
  { label: 'Agreement',        value: 'agreement' },
  { label: 'Receipt',          value: 'receipt' },
  { label: 'NOC',              value: 'noc' },
  { label: 'Plan Approval',    value: 'plan_approval' },
  { label: 'RERA Certificate', value: 'rera_certificate' },
  { label: 'Other',            value: 'other' },
] as const

export default async function DocumentsPage({ searchParams }: PageProps) {
  const { type: typeFilter = '' } = await searchParams
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
  let query = (supabase as any)
    .from('documents')
    .select(`
      id, document_type, file_name, file_url, file_size_kb, created_at, visible_to_client,
      uploader:profiles!uploaded_by(full_name),
      booking:bookings(
        unit:units(unit_number, project:projects(name)),
        client:profiles!client_profile_id(full_name)
      )
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (typeFilter) query = query.eq('document_type', typeFilter)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: documents } = await query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = documents ?? []

  function buildTabUrl(type: string) {
    const sp = new URLSearchParams()
    if (type) sp.set('type', type)
    return `/dashboard/documents?${sp.toString()}`
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  function fmtSize(kb: number | null) {
    if (kb == null) return null
    if (kb < 1024) return `${kb} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl font-bold text-slate-900">Documents</h1>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {rows.length.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-1">
        {TYPE_TABS.map((tab) => {
          const isActive = typeFilter === tab.value
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
          <p className="text-sm text-slate-400">No documents found.</p>
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">File Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Client / Unit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Uploaded By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Visible to Client</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {rows.map((doc: any) => {
                const booking = doc.booking as {
                  unit?: { unit_number: string; project?: { name: string } }
                  client?: { full_name: string | null }
                } | null
                const clientName = booking?.client?.full_name ?? null
                const unitLabel = [
                  booking?.unit?.unit_number,
                  booking?.unit?.project?.name,
                ]
                  .filter(Boolean)
                  .join(' · ')
                const contextLabel = clientName
                  ? [clientName, unitLabel].filter(Boolean).join(' — ')
                  : unitLabel || '—'
                const size = fmtSize(doc.file_size_kb)

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 max-w-[220px] truncate" title={doc.file_name}>
                        {doc.file_name}
                      </p>
                      {size && <p className="text-xs text-slate-400">{size}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {contextLabel}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {doc.uploader?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {doc.visible_to_client ? (
                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 h-7 rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Download
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
