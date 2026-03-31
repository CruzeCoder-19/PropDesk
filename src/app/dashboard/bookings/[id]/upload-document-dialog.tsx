'use client'

import { useEffect, useRef, useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { uploadBookingDocumentAction } from '@/app/dashboard/bookings/actions'

const SELECT_CLS =
  'h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50'

const DOCUMENT_TYPES = [
  { value: 'allotment_letter', label: 'Allotment Letter' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'noc', label: 'NOC' },
  { value: 'plan_approval', label: 'Plan Approval' },
  { value: 'rera_certificate', label: 'RERA Certificate' },
  { value: 'other', label: 'Other' },
]

interface Props {
  bookingId: string
  orgId: string
}

export function UploadDocumentDialog({ bookingId, orgId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState(
    uploadBookingDocumentAction.bind(null, bookingId),
    null
  )

  useEffect(() => {
    if (state && 'success' in state) {
      toast.success('Document uploaded')
      setOpen(false)
      setFile(null)
      formRef.current?.reset()
      router.refresh()
    }
    if (state && 'error' in state) {
      toast.error(state.error)
    }
  }, [state, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) { toast.error('Please select a file'); return }
    setUploading(true)

    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${orgId}/documents/${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, file)
    if (uploadError) {
      toast.error('Upload failed: ' + uploadError.message)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)

    const fd = new FormData(e.currentTarget)
    fd.set('file_url', urlData.publicUrl)
    fd.set('file_name', file.name)
    fd.set('file_size_kb', String(Math.round(file.size / 1024)))

    setUploading(false)
    formAction(fd)
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-slate-200 text-slate-700"
      >
        <Upload className="h-3.5 w-3.5" />
        Upload Document
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false) }}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 px-1 pb-1">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Document Type</label>
              <select name="document_type" className={SELECT_CLS} defaultValue="other">
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">File</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                required
                className="block w-full text-sm text-slate-700 file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex items-center gap-2.5">
              <input
                id="doc-visible"
                type="checkbox"
                name="visible_to_client"
                value="true"
                className="h-4 w-4 rounded border-gray-300 accent-amber-400"
              />
              <label htmlFor="doc-visible" className="text-sm font-medium text-slate-700">
                Visible to client
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 border-slate-200 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || uploading}
                className="flex-1 bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent"
              >
                {isPending || uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  'Upload'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
