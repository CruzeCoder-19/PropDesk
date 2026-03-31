import { redirect } from 'next/navigation'
import { FileText, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DOCUMENT_TYPE_LABELS } from '@/lib/booking-constants'

interface Document {
  id: string
  document_type: string
  file_name: string
  file_url: string
  file_size_kb: number | null
  created_at: string
}

export default async function ClientDocumentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client-portal/login')

  // Get the client's booking id
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('client_profile_id', user.id)
    .single()

  const documents: Document[] = []

  if (booking) {
    const { data: docs } = await supabase
      .from('documents')
      .select('id, document_type, file_name, file_url, file_size_kb, created_at')
      .eq('booking_id', booking.id)
      .eq('visible_to_client', true)
      .order('created_at', { ascending: false })
    if (docs) documents.push(...(docs as Document[]))
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Documents</h1>

      {documents.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">No documents available yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Your builder will share documents here once they&apos;re ready.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
            >
              <FileText className="h-8 w-8 text-slate-300 mb-3 shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
              </p>
              <p className="text-sm font-medium text-slate-900 truncate mb-1" title={doc.file_name}>
                {doc.file_name}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                {doc.file_size_kb ? `${doc.file_size_kb} KB · ` : ''}
                {new Date(doc.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Download className="h-3 w-3" />
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
