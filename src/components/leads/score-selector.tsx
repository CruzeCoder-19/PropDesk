'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updateScoreAction } from '@/app/dashboard/leads/[id]/actions'
import { SCORE_BADGE_CLASSES } from '@/lib/lead-constants'

interface Props {
  leadId: string
  currentScore: string
}

const SCORES = ['hot', 'warm', 'cold'] as const

function ScoreButton({
  leadId,
  score,
  currentScore,
  onSuccess,
}: {
  leadId: string
  score: string
  currentScore: string
  onSuccess: () => void
}) {
  const boundAction = updateScoreAction.bind(null, leadId)
  const [, formAction, isPending] = useActionState(boundAction, null)
  const router = useRouter()

  useEffect(() => {
    if (!isPending) {
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending])

  return (
    <form
      action={formAction}
      onSubmit={onSuccess}
    >
      <input type="hidden" name="newScore" value={score} />
      <button
        type="submit"
        disabled={score === currentScore || isPending}
        className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium capitalize transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${
          SCORE_BADGE_CLASSES[score] ?? 'bg-slate-100 text-slate-600'
        }`}
      >
        {score}
      </button>
    </form>
  )
}

export function ScoreSelector({ leadId, currentScore }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-2">
      {/* Current score badge — click to open selector */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize cursor-pointer hover:opacity-80 transition-opacity ${
          SCORE_BADGE_CLASSES[currentScore] ?? 'bg-slate-100 text-slate-600'
        }`}
        title="Click to change score"
      >
        {currentScore}
      </button>

      {/* Inline score buttons */}
      {open && (
        <div className="flex items-center gap-1">
          {SCORES.map((score) => (
            <ScoreButton
              key={score}
              leadId={leadId}
              score={score}
              currentScore={currentScore}
              onSuccess={() => setOpen(false)}
            />
          ))}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-1 text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
