'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, ChevronUp } from 'lucide-react'
import { addActivityAction } from '@/app/dashboard/leads/[id]/actions'
import { ACTIVITY_LABELS } from '@/lib/lead-constants'
import { Button } from '@/components/ui/button'

interface Props {
  leadId: string
}

const ACTIVITY_TYPES = Object.entries(ACTIVITY_LABELS)

export function ActivityForm({ leadId }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const boundAction = addActivityAction.bind(null, leadId)
  const [state, formAction, isPending] = useActionState(boundAction, null)
  const [activityType, setActivityType] = useState('call')

  useEffect(() => {
    // null state after a submit with no error = success
    if (state === null && isPending === false && open) {
      // Check if form was submitted (we track via a separate flag)
    }
  }, [state, isPending, open])

  // We track "was submitted" with a ref trick: if state flips to null after being non-null it means success
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (submitted && state === null && !isPending) {
      setOpen(false)
      setSubmitted(false)
      router.refresh()
    }
    if (state !== null) {
      setSubmitted(false)
    }
  }, [state, isPending, submitted, router, open])

  function handleSubmit() {
    setSubmitted(true)
  }

  return (
    <div className="border-b border-slate-100 pb-4 mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-500 transition-colors"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {open ? 'Cancel' : 'Add Activity'}
      </button>

      {open && (
        <form
          action={formAction}
          onSubmit={handleSubmit}
          className="mt-3 space-y-3"
        >
          {state && 'error' in state && (
            <p className="text-xs text-red-600">{state.error}</p>
          )}

          {/* Activity type */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="af-type">
              Activity Type
            </label>
            <select
              id="af-type"
              name="activity_type"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
            >
              {ACTIVITY_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600" htmlFor="af-desc">
              Description
              {activityType !== 'status_change' && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </label>
            <textarea
              id="af-desc"
              name="description"
              rows={3}
              placeholder="What happened?"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-slate-900 placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50 resize-none"
            />
          </div>

          {/* Scheduled at (only for follow-ups) */}
          {activityType === 'follow_up_scheduled' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="af-sched">
                Scheduled At
              </label>
              <input
                id="af-sched"
                name="scheduled_at"
                type="datetime-local"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-slate-900 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50"
              />
            </div>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="bg-amber-400 text-slate-950 hover:bg-amber-300 border-transparent"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Log Activity'
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
