'use client'

import { useEffect, useRef, useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { recordPaymentAction } from '@/app/dashboard/bookings/actions'

// ── RecordPaymentDialog ────────────────────────────────────────────────────────

interface Props {
  milestoneId: string
  milestoneName: string
  amountDue: number
  orgId: string
}

export function RecordPaymentDialog({ milestoneId, milestoneName, amountDue, orgId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const today = new Date().toISOString().slice(0, 10)

  const [state, formAction, isPending] = useActionState(
    recordPaymentAction.bind(null, milestoneId),
    null
  )

  useEffect(() => {
    if (state && 'success' in state) {
      toast.success('Payment recorded')
      setOpen(false)
      setReceiptFile(null)
      formRef.current?.reset()
      router.refresh()
    }
    if (state && 'error' in state) {
      toast.error(state.error)
    }
  }, [state, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploading(true)

    let receipt_url = ''

    if (receiptFile) {
      const supabase = createClient()
      const ext = receiptFile.name.split('.').pop() ?? 'pdf'
      const path = `${orgId}/receipts/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, receiptFile)
      if (uploadError) {
        toast.error('Receipt upload failed: ' + uploadError.message)
        setUploading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      receipt_url = urlData.publicUrl
    }

    const fd = new FormData(e.currentTarget)
    if (receipt_url) fd.set('receipt_url', receipt_url)

    setUploading(false)
    formAction(fd)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-7 px-2.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors whitespace-nowrap"
      >
        Record Payment
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false) }}>
        <DialogContent className="max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-1 px-1">{milestoneName}</p>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 px-1 pb-1">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Amount Paid (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                name="paid_amount"
                step="1"
                min="1"
                defaultValue={amountDue}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Date Paid</label>
              <input
                type="date"
                name="paid_date"
                defaultValue={today}
                className="h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Receipt (optional)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="block w-full text-sm text-slate-700 file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
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
                    Saving…
                  </>
                ) : (
                  'Record Payment'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
