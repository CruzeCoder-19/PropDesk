'use client'

import { useActionState } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { changeStatusAction } from '@/app/dashboard/leads/[id]/actions'
import { STATUS_LABELS } from '@/lib/lead-constants'

interface Props {
  leadId: string
  currentStatus: string
}

const STAGES = [
  'new',
  'contacted',
  'site_visit_scheduled',
  'site_visited',
  'negotiation',
  'won',
] as const

const NEXT_ACTIONS: Record<string, { label: string; nextStatus: string }[]> = {
  new: [{ label: 'Mark Contacted', nextStatus: 'contacted' }],
  contacted: [{ label: 'Schedule Site Visit', nextStatus: 'site_visit_scheduled' }],
  site_visit_scheduled: [{ label: 'Mark Site Visited', nextStatus: 'site_visited' }],
  site_visited: [{ label: 'Move to Negotiation', nextStatus: 'negotiation' }],
  negotiation: [
    { label: 'Mark Won', nextStatus: 'won' },
    { label: 'Mark Lost', nextStatus: 'lost' },
  ],
}

function StatusActionButton({
  leadId,
  label,
  nextStatus,
}: {
  leadId: string
  label: string
  nextStatus: string
}) {
  const router = useRouter()
  const boundAction = changeStatusAction.bind(null, leadId)
  const [, formAction, isPending] = useActionState(boundAction, null)

  useEffect(() => {
    if (!isPending) {
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending])

  return (
    <form action={formAction}>
      <input type="hidden" name="newStatus" value={nextStatus} />
      <button
        type="submit"
        disabled={isPending}
        className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition-colors disabled:opacity-60 ${
          nextStatus === 'lost'
            ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            : nextStatus === 'won'
            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
        }`}
      >
        {label}
      </button>
    </form>
  )
}

export function StatusStepper({ leadId, currentStatus }: Props) {
  const currentIndex = STAGES.indexOf(currentStatus as typeof STAGES[number])
  const actions = NEXT_ACTIONS[currentStatus] ?? []

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">Pipeline Status</h3>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STAGES.map((stage, idx) => {
          const isCurrent = stage === currentStatus
          const isCompleted = currentIndex > idx
          const isLast = idx === STAGES.length - 1

          return (
            <div key={stage} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div
                  className={`h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                    isCurrent
                      ? 'border-amber-400 bg-amber-400 text-slate-950'
                      : isCompleted
                      ? 'border-slate-600 bg-slate-700 text-white'
                      : 'border-slate-200 bg-white text-slate-300'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                {/* Label */}
                <span
                  className={`mt-1.5 text-center text-[10px] leading-tight max-w-[56px] ${
                    isCurrent
                      ? 'font-semibold text-amber-600'
                      : isCompleted
                      ? 'text-slate-600'
                      : 'text-slate-300'
                  }`}
                >
                  {STATUS_LABELS[stage] ?? stage}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-1 mt-[-14px] ${
                    currentIndex > idx ? 'bg-slate-600' : 'bg-slate-100'
                  }`}
                />
              )}
            </div>
          )
        })}

        {/* Lost stage (terminal, shown separately if current) */}
        {currentStatus === 'lost' && (
          <div className="flex flex-col items-center ml-2">
            <div className="h-7 w-7 rounded-full border-2 border-red-400 bg-red-400 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">✗</span>
            </div>
            <span className="mt-1.5 text-[10px] font-semibold text-red-600 text-center max-w-[40px]">
              Lost
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {actions.map(({ label, nextStatus }) => (
            <StatusActionButton
              key={nextStatus}
              leadId={leadId}
              label={label}
              nextStatus={nextStatus}
            />
          ))}
        </div>
      )}

      {(currentStatus === 'won' || currentStatus === 'lost') && (
        <p className="text-xs text-slate-400">This lead is in a terminal state.</p>
      )}
    </div>
  )
}
