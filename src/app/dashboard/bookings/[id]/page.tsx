import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCrores, formatINR } from '@/lib/format'
import {
  BOOKING_STATUS_BADGE,
  BOOKING_STATUS_LABELS,
  MILESTONE_STATUS_BADGE,
  MILESTONE_STATUS_LABELS,
  PAYMENT_PLAN_LABELS,
  DOCUMENT_TYPE_LABELS,
} from '@/lib/booking-constants'
import { BookingStatusChanger } from './booking-status-changer'
import { RecordPaymentDialog } from '@/components/bookings/record-payment-dialog'
import { UploadDocumentDialog } from './upload-document-dialog'

// ── Types ──────────────────────────────────────────────────────────────────────

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

interface Document {
  id: string
  document_type: string
  file_name: string
  file_url: string
  file_size_kb: number | null
  created_at: string
  visible_to_client: boolean
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BookingDetailPage({ params }: PageProps) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (supabase as any)
    .from('bookings')
    .select(`
      id, booking_date, agreement_value, gst_amount, total_amount,
      payment_plan, status, notes, lead_id,
      unit:units(id, unit_number, block, floor, type, total_price, project:projects(name)),
      client:profiles!client_profile_id(id, full_name, phone),
      milestones:payment_milestones(
        id, milestone_name, milestone_order, amount_due, due_date,
        status, paid_amount, paid_date, receipt_url
      ),
      documents(id, document_type, file_name, file_url, file_size_kb, created_at, visible_to_client)
    `)
    .eq('id', id)
    .eq('organization_id', orgId)
    .order('milestone_order', { referencedTable: 'payment_milestones', ascending: true })
    .single()

  if (!booking) notFound()

  const unit = booking.unit as {
    id: string
    unit_number: string
    block: string | null
    floor: number | null
    type: string
    total_price: number | null
    project: { name: string }
  } | null

  const client = booking.client as {
    id: string
    full_name: string | null
    phone: string | null
  } | null

  const milestones = (booking.milestones as Milestone[] | null) ?? []
  const sortedMilestones = [...milestones].sort((a, b) => a.milestone_order - b.milestone_order)

  const documents = (booking.documents as Document[] | null) ?? []

  const totalPaid = sortedMilestones
    .filter((m) => m.status === 'paid')
    .reduce((s, m) => s + (m.paid_amount ?? m.amount_due), 0)

  const totalPending = booking.total_amount - totalPaid

  function floorLabel(floor: number | null): string {
    if (floor === null) return ''
    return floor === 0 ? 'Ground Floor' : `Floor ${floor}`
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb + header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/dashboard/bookings"
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← Bookings
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-mono text-slate-600">#{id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                BOOKING_STATUS_BADGE[booking.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
            </span>
          </div>
        </div>
        <BookingStatusChanger bookingId={id} currentStatus={booking.status} />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client + Financial */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Client</p>
            <p className="font-semibold text-slate-900 text-base">{client?.full_name ?? '—'}</p>
            {client?.phone && <p className="text-sm text-slate-500">{client.phone}</p>}
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Financial</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Booking Date</span>
                <span className="text-slate-900">
                  {booking.booking_date
                    ? new Date(booking.booking_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Agreement Value</span>
                <span className="text-slate-900">{formatCrores(booking.agreement_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GST</span>
                <span className="text-slate-900">{formatCrores(booking.gst_amount ?? 0)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-700">Total Amount</span>
                <span className="text-slate-900">{formatCrores(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Plan</span>
                <span className="text-slate-900">
                  {PAYMENT_PLAN_LABELS[booking.payment_plan] ?? booking.payment_plan}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-2 mt-2 space-y-2">
                <div className="flex justify-between text-green-700">
                  <span>Paid</span>
                  <span className="font-medium">{formatCrores(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Pending</span>
                  <span className="font-medium">{formatCrores(totalPending)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unit */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Unit</p>
          {unit ? (
            <>
              <p className="font-semibold text-slate-900 text-xl">{unit.unit_number}</p>
              <p className="text-sm text-slate-600">{unit.project?.name}</p>
              <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                {unit.type && (
                  <div>
                    <p className="text-xs text-slate-400">Type</p>
                    <p className="font-medium text-slate-900">{unit.type}</p>
                  </div>
                )}
                {unit.floor !== null && (
                  <div>
                    <p className="text-xs text-slate-400">Floor</p>
                    <p className="font-medium text-slate-900">{floorLabel(unit.floor)}</p>
                  </div>
                )}
                {unit.block && (
                  <div>
                    <p className="text-xs text-slate-400">Block</p>
                    <p className="font-medium text-slate-900">{unit.block}</p>
                  </div>
                )}
                {unit.total_price != null && (
                  <div>
                    <p className="text-xs text-slate-400">Listed Price</p>
                    <p className="font-medium text-slate-900">{formatCrores(unit.total_price)}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Unit details unavailable</p>
          )}
          {booking.notes && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Notes</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Milestones */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Payment Milestones</h2>
          <span className="text-xs text-slate-400">{sortedMilestones.length} milestones</span>
        </div>
        {sortedMilestones.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">No milestones defined</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedMilestones.map((m) => {
              const canRecord = m.status !== 'paid'
              return (
                <div key={m.id} className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center shrink-0 mt-0.5">
                      <div
                        className={`h-3 w-3 rounded-full border-2 ${
                          m.status === 'paid'
                            ? 'bg-green-500 border-green-500'
                            : m.status === 'overdue'
                            ? 'bg-red-400 border-red-400'
                            : m.status === 'due'
                            ? 'bg-yellow-400 border-yellow-400'
                            : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{m.milestone_name}</span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0 text-[11px] font-medium ${
                              MILESTONE_STATUS_BADGE[m.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {MILESTONE_STATUS_LABELS[m.status] ?? m.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900 text-sm">
                            {formatCrores(m.amount_due)}
                          </span>
                          {canRecord && (
                            <RecordPaymentDialog
                              milestoneId={m.id}
                              milestoneName={m.milestone_name}
                              amountDue={m.amount_due}
                              orgId={orgId}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-400">
                        {m.due_date && (
                          <span>
                            Due:{' '}
                            {new Date(m.due_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                        {m.status === 'paid' && m.paid_amount != null && (
                          <span className="text-green-600">
                            Paid: {formatINR(m.paid_amount)}
                            {m.paid_date &&
                              ` on ${new Date(m.paid_date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}`}
                          </span>
                        )}
                        {m.receipt_url && (
                          <a
                            href={m.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            View Receipt ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Documents</h2>
          <UploadDocumentDialog bookingId={id} orgId={orgId} />
        </div>
        {documents.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">No documents uploaded yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">File</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Uploaded</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Visible</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-slate-900">{doc.file_name}</span>
                    {doc.file_size_kb && (
                      <span className="text-xs text-slate-400 ml-1.5">
                        ({doc.file_size_kb} KB)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    {new Date(doc.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {doc.visible_to_client ? 'Yes' : 'No'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Download ↗
                    </a>
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
