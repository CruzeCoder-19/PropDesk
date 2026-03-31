'use client'

import { useEffect, useRef, useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { inviteMemberAction } from './actions'

const SELECT_CLS =
  'h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50'

export function InviteMemberDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState(inviteMemberAction, null)

  useEffect(() => {
    if (state && 'success' in state) {
      toast.success('Invitation sent!')
      setOpen(false)
      formRef.current?.reset()
      router.refresh()
    }
    if (state && 'error' in state) {
      toast.error(state.error)
    }
  }, [state, router])

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent"
      >
        <UserPlus className="h-4 w-4" />
        Invite Member
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false) }}>
        <DialogContent className="max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <form ref={formRef} action={formAction} className="space-y-4 px-1 pb-1">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input name="name" required placeholder="Jane Smith" className="h-9" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                name="email"
                type="email"
                required
                placeholder="jane@company.com"
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <Input name="phone" type="tel" placeholder="+91 98765 43210" className="h-9" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Role <span className="text-red-500">*</span>
              </label>
              <select name="role" defaultValue="salesperson" className={SELECT_CLS}>
                <option value="sales_manager">Sales Manager</option>
                <option value="salesperson">Salesperson</option>
              </select>
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
                disabled={isPending}
                className="flex-1 bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  'Send Invite'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
